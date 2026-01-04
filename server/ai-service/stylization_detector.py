"""
Stylization Detector Module for TrueVibe - v2 AGGRESSIVE
Detects 3D rendered, cartoon, animated, and non-photorealistic content.

This module identifies content that is clearly NOT a real photograph,
such as:
- 3D rendered characters/avatars (like Memoji, Animoji, Ready Player Me)
- Cartoon/anime style images
- Digital art with human-like subjects
- AI-generated stylized avatars
"""

import numpy as np
from PIL import Image, ImageFilter
from typing import Dict, Tuple, List, Any
from dataclasses import dataclass
from enum import Enum

# Try to import OpenCV
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("⚠️ OpenCV not available - stylization detection limited")


class StyleType(Enum):
    """Types of stylized content."""
    PHOTOREALISTIC = "photorealistic"
    RENDER_3D = "3d_render"
    CARTOON = "cartoon"
    ANIME = "anime"
    DIGITAL_ART = "digital_art"
    AVATAR = "avatar"
    UNKNOWN = "unknown"


@dataclass
class StylizationResult:
    """Result of stylization detection."""
    is_stylized: bool
    style_type: StyleType
    confidence: float
    fake_boost: float  # How much to boost fake score
    indicators: List[str]
    details: Dict[str, Any]


def analyze_skin_texture(image: Image.Image) -> Tuple[float, Dict]:
    """
    Analyze skin texture to detect 3D renders and cartoons.
    Real human skin has texture, pores, and imperfections.
    3D renders and cartoons have unnaturally smooth skin.
    
    Returns:
        Tuple of (smoothness_score, details)
        Higher score = more likely synthetic (smoother)
    """
    if not CV2_AVAILABLE:
        return 0.0, {'error': 'OpenCV not available'}
    
    img_array = np.array(image.convert('RGB'))
    
    # Convert to LAB for better skin detection
    lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
    
    # Detect potential skin regions (rough approximation)
    l_channel = lab[:, :, 0]
    a_channel = lab[:, :, 1]
    b_channel = lab[:, :, 2]
    
    # Much broader skin mask - catches more skin tones including 3D rendered ones
    skin_mask = (
        (l_channel > 30) & (l_channel < 240) &
        (a_channel > 110) & (a_channel < 170) &
        (b_channel > 110) & (b_channel < 180)
    )
    
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # Calculate local variance (texture) with smaller kernel for finer detail
    kernel_size = 3
    local_mean = cv2.blur(gray.astype(float), (kernel_size, kernel_size))
    local_sq_mean = cv2.blur(gray.astype(float) ** 2, (kernel_size, kernel_size))
    local_variance = local_sq_mean - local_mean ** 2
    
    # Also use Laplacian for texture detection
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    laplacian_var = np.var(laplacian)
    
    # Analyze texture in skin regions
    if np.sum(skin_mask) > 300:
        skin_texture_var = np.mean(local_variance[skin_mask])
        skin_laplacian = np.var(laplacian[skin_mask])
    else:
        # No clear skin detected, analyze overall
        skin_texture_var = np.mean(local_variance)
        skin_laplacian = laplacian_var
    
    # AGGRESSIVE thresholds for 3D detection
    # 3D renders have VERY low texture variance
    if skin_texture_var < 50 or skin_laplacian < 300:
        smoothness_score = 0.95  # Very likely 3D/cartoon
    elif skin_texture_var < 100 or skin_laplacian < 600:
        smoothness_score = 0.8
    elif skin_texture_var < 200 or skin_laplacian < 1000:
        smoothness_score = 0.5
    else:
        smoothness_score = 0.15  # Normal texture
    
    details = {
        'skin_pixels': int(np.sum(skin_mask)),
        'texture_variance': round(float(skin_texture_var), 2),
        'laplacian_variance': round(float(skin_laplacian), 2),
        'assessment': 'very_smooth' if smoothness_score > 0.8 else 
                      'smooth' if smoothness_score > 0.5 else 
                      'moderate' if smoothness_score > 0.3 else 'natural'
    }
    
    return smoothness_score, details


def analyze_edge_quality(image: Image.Image) -> Tuple[float, Dict]:
    """
    Analyze edge quality to detect computer-generated content.
    3D renders have unnaturally perfect, anti-aliased edges.
    """
    if not CV2_AVAILABLE:
        return 0.0, {'error': 'OpenCV not available'}
    
    img_array = np.array(image.convert('RGB'))
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # Detect edges at multiple thresholds
    edges_low = cv2.Canny(gray, 20, 60)
    edges_high = cv2.Canny(gray, 60, 150)
    
    edge_ratio = np.sum(edges_high > 0) / (np.sum(edges_low > 0) + 1)
    
    # Analyze edge gradients
    sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    gradient_mag = np.sqrt(sobel_x**2 + sobel_y**2)
    
    # Edge uniformity (synthetic content has more uniform gradients)
    edge_mask = edges_low > 0
    if np.sum(edge_mask) > 50:
        edge_gradient_values = gradient_mag[edge_mask]
        edge_mean = np.mean(edge_gradient_values)
        edge_std = np.std(edge_gradient_values)
        edge_uniformity = 1.0 - (edge_std / (edge_mean + 1))
    else:
        edge_uniformity = 0.5
        edge_mean = 0
        edge_std = 0
    
    # Check gradient magnitude distribution
    # 3D renders have cleaner, more uniform gradients
    gradient_flatness = np.mean(gradient_mag) / (np.std(gradient_mag) + 1)
    
    # High uniformity OR high gradient flatness suggests synthetic
    if edge_uniformity > 0.6 or gradient_flatness > 0.8:
        synthetic_score = 0.85
    elif edge_uniformity > 0.4 or gradient_flatness > 0.5:
        synthetic_score = 0.6
    else:
        synthetic_score = 0.2
    
    details = {
        'edge_ratio': round(float(edge_ratio), 3),
        'edge_uniformity': round(float(edge_uniformity), 3),
        'gradient_flatness': round(float(gradient_flatness), 3),
        'edge_pixels_low': int(np.sum(edges_low > 0)),
        'edge_pixels_high': int(np.sum(edges_high > 0))
    }
    
    return synthetic_score, details


def analyze_color_palette(image: Image.Image) -> Tuple[float, Dict]:
    """
    Analyze color palette characteristics.
    3D renders and cartoons often have limited, saturated palettes.
    """
    if not CV2_AVAILABLE:
        return 0.0, {'error': 'OpenCV not available'}
    
    img_array = np.array(image.convert('RGB'))
    
    # Check saturation distribution (3D renders often have very uniform saturation)
    hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
    saturation = hsv[:, :, 1]
    sat_std = np.std(saturation)
    sat_mean = np.mean(saturation)
    
    # 3D renders often have uniform saturation
    sat_uniformity_score = 0
    if sat_std < 30:
        sat_uniformity_score = 0.8
    elif sat_std < 50:
        sat_uniformity_score = 0.5
    
    # Quantize colors to detect limited palette
    pixels = img_array.reshape(-1, 3).astype(np.float32)
    
    # K-means to find dominant colors
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    k = 12
    
    try:
        _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 3, cv2.KMEANS_RANDOM_CENTERS)
        
        label_counts = np.bincount(labels.flatten(), minlength=k)
        label_percentages = label_counts / len(labels)
        
        sorted_percentages = np.sort(label_percentages)[::-1]
        top_3_concentration = sorted_percentages[:3].sum()
        top_5_concentration = sorted_percentages[:5].sum()
        
        # High concentration = limited palette = likely synthetic
        if top_3_concentration > 0.6:
            color_score = 0.9
        elif top_5_concentration > 0.75:
            color_score = 0.7
        elif top_5_concentration > 0.65:
            color_score = 0.5
        else:
            color_score = 0.2
            
    except Exception:
        color_score = 0.3
        top_3_concentration = 0.0
        top_5_concentration = 0.0
    
    # Check for flat color regions (very important for 3D detection)
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # Low laplacian variance = flat smooth colors = 3D render
    if laplacian_var < 500:
        flatness_boost = 0.4
    elif laplacian_var < 1000:
        flatness_boost = 0.25
    elif laplacian_var < 2000:
        flatness_boost = 0.1
    else:
        flatness_boost = 0.0
    
    final_score = min(color_score + flatness_boost + sat_uniformity_score * 0.2, 1.0)
    
    details = {
        'top_3_concentration': round(float(top_3_concentration), 3),
        'top_5_concentration': round(float(top_5_concentration), 3),
        'laplacian_variance': round(float(laplacian_var), 2),
        'saturation_std': round(float(sat_std), 2),
        'flatness_boost': round(flatness_boost, 2)
    }
    
    return final_score, details


def detect_3d_render_characteristics(image: Image.Image) -> Tuple[float, Dict]:
    """
    Detect specific 3D render characteristics:
    - Perfect specular highlights
    - Subsurface scattering patterns
    - Unnaturally smooth gradients
    - Black background (common in avatar renders)
    """
    if not CV2_AVAILABLE:
        return 0.0, {'error': 'OpenCV not available'}
    
    img_array = np.array(image.convert('RGB'))
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
    
    score = 0.0
    indicators = []
    
    # Check for black/near-black background (very common in avatar renders)
    dark_pixels = gray < 15
    dark_ratio = np.sum(dark_pixels) / gray.size
    if dark_ratio > 0.15:  # More than 15% is dark
        score += 0.3
        indicators.append("dark_background")
    
    # Check for specular highlights (bright spots)
    bright_pixels = gray > 240
    bright_ratio = np.sum(bright_pixels) / gray.size
    
    # 3D renders often have clean, distinct highlights
    if 0.001 < bright_ratio < 0.05:
        # Check if highlights are very concentrated (perfect specular)
        if np.sum(bright_pixels) > 0:
            score += 0.2
            indicators.append("specular_highlights")
    
    # Check for gradient smoothness
    # Calculate gradient in small regions
    sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    gradient_mag = np.sqrt(sobel_x**2 + sobel_y**2)
    
    # Very smooth gradients = 3D render
    gradient_mean = np.mean(gradient_mag)
    gradient_std = np.std(gradient_mag)
    
    if gradient_std / (gradient_mean + 1) < 1.5:
        score += 0.25
        indicators.append("smooth_gradients")
    
    # Check skin-like regions for subsurface scattering
    # 3D renders with SSS have very uniform reddish tones in skin
    a_channel = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)[:, :, 1]
    skin_a_std = np.std(a_channel[a_channel > 128])  # Red-ish pixels
    
    if skin_a_std < 10 and np.sum(a_channel > 128) > 1000:
        score += 0.2
        indicators.append("uniform_skin_tones")
    
    details = {
        'dark_ratio': round(float(dark_ratio), 3),
        'bright_ratio': round(float(bright_ratio), 4),
        'gradient_ratio': round(float(gradient_std / (gradient_mean + 1)), 3),
        'indicators': indicators
    }
    
    return min(score, 1.0), details


def detect_stylization(image: Image.Image) -> StylizationResult:
    """
    Comprehensive stylization detection v2 - AGGRESSIVE.
    Determines if an image is a real photograph or stylized content.
    """
    indicators = []
    all_details = {}
    
    # Run all detections
    skin_score, skin_details = analyze_skin_texture(image)
    edge_score, edge_details = analyze_edge_quality(image)
    color_score, color_details = analyze_color_palette(image)
    render3d_score, render3d_details = detect_3d_render_characteristics(image)
    
    all_details['skin_texture'] = skin_details
    all_details['edge_quality'] = edge_details
    all_details['color_palette'] = color_details
    all_details['3d_render'] = render3d_details
    
    # Collect indicators
    if skin_score > 0.5:
        indicators.append("unnaturally_smooth_skin")
    if edge_score > 0.5:
        indicators.append("synthetic_edge_patterns")
    if color_score > 0.5:
        indicators.append("limited_color_palette")
    if render3d_score > 0.3:
        indicators.extend(render3d_details.get('indicators', []))
    
    # Calculate combined score - give 3D render detection high weight
    combined_score = (
        skin_score * 0.30 +       # Skin texture
        edge_score * 0.20 +       # Edge quality 
        color_score * 0.20 +      # Color palette
        render3d_score * 0.30     # 3D render specific
    )
    
    all_details['individual_scores'] = {
        'skin': round(skin_score, 3),
        'edge': round(edge_score, 3),
        'color': round(color_score, 3),
        'render3d': round(render3d_score, 3)
    }
    all_details['combined_score'] = round(combined_score, 3)
    
    # AGGRESSIVE thresholds for detection
    if combined_score > 0.45:  # Lowered from 0.65
        is_stylized = True
        
        # Determine specific style
        if render3d_score > 0.5 or skin_score > 0.7:
            style_type = StyleType.RENDER_3D
        elif color_score > 0.7:
            style_type = StyleType.DIGITAL_ART
        else:
            style_type = StyleType.AVATAR
        
        # MUCH higher fake boost for stylized content
        # If clearly stylized, boost by 50%+
        fake_boost = min(combined_score * 0.7 + 0.15, 0.65)  # Boost 15-65%
        
    elif combined_score > 0.30:  # Lowered from 0.45
        is_stylized = True
        style_type = StyleType.UNKNOWN
        fake_boost = combined_score * 0.4 + 0.1  # 10-22% boost
        
    else:
        is_stylized = False
        style_type = StyleType.PHOTOREALISTIC
        fake_boost = 0.0
    
    return StylizationResult(
        is_stylized=is_stylized,
        style_type=style_type,
        confidence=round(combined_score, 3),
        fake_boost=round(fake_boost, 3),
        indicators=indicators,
        details=all_details
    )


def quick_stylization_check(image: Image.Image) -> Tuple[bool, float]:
    """
    Quick check for stylization without full analysis.
    """
    if not CV2_AVAILABLE:
        return False, 0.0
    
    img_array = np.array(image.convert('RGB'))
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # Quick texture check - very effective for 3D renders
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    texture_var = laplacian.var()
    
    # Check for dark background (avatar indicator)
    dark_ratio = np.sum(gray < 20) / gray.size
    
    # Very low texture variance is a strong indicator
    if texture_var < 500 or dark_ratio > 0.2:
        return True, 0.9
    elif texture_var < 1000:
        return True, 0.7
    elif texture_var < 2000:
        return True, 0.4
    else:
        return False, 0.2
