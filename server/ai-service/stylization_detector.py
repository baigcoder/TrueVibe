"""
Stylization Detector Module for TrueVibe
Detects 3D rendered, cartoon, animated, and non-photorealistic content.

This module identifies content that is clearly NOT a real photograph,
such as:
- 3D rendered characters/avatars
- Cartoon/anime style images
- Digital art with human-like subjects
- Memoji/Avatar-style images
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
    # Skin typically has specific L, a, b ranges
    l_channel = lab[:, :, 0]
    a_channel = lab[:, :, 1]
    b_channel = lab[:, :, 2]
    
    # Broader skin mask that works for various skin tones
    skin_mask = (
        (l_channel > 40) & (l_channel < 230) &
        (a_channel > 115) & (a_channel < 160) &
        (b_channel > 115) & (b_channel < 170)
    )
    
    # Also check for cartoon-like flat colors
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # Calculate local variance (texture)
    kernel_size = 5
    local_mean = cv2.blur(gray.astype(float), (kernel_size, kernel_size))
    local_sq_mean = cv2.blur(gray.astype(float) ** 2, (kernel_size, kernel_size))
    local_variance = local_sq_mean - local_mean ** 2
    
    # Analyze texture in skin regions
    if np.sum(skin_mask) > 500:
        skin_texture_var = np.mean(local_variance[skin_mask])
        skin_texture_std = np.std(local_variance[skin_mask])
    else:
        # No clear skin detected, analyze overall
        skin_texture_var = np.mean(local_variance)
        skin_texture_std = np.std(local_variance)
    
    # Very low variance = too smooth = likely synthetic
    # Real skin has variance typically > 100
    if skin_texture_var < 20:
        smoothness_score = 0.9  # Very smooth - likely 3D/cartoon
    elif skin_texture_var < 50:
        smoothness_score = 0.7
    elif skin_texture_var < 100:
        smoothness_score = 0.4
    else:
        smoothness_score = 0.1  # Normal texture
    
    details = {
        'skin_pixels': int(np.sum(skin_mask)),
        'texture_variance': round(float(skin_texture_var), 2),
        'texture_std': round(float(skin_texture_std), 2),
        'assessment': 'very_smooth' if skin_texture_var < 20 else 
                      'smooth' if skin_texture_var < 50 else 
                      'moderate' if skin_texture_var < 100 else 'natural'
    }
    
    return smoothness_score, details


def analyze_edge_quality(image: Image.Image) -> Tuple[float, Dict]:
    """
    Analyze edge quality to detect computer-generated content.
    3D renders have unnaturally perfect, anti-aliased edges.
    Real photos have natural edge variations.
    
    Returns:
        Tuple of (synthetic_edge_score, details)
    """
    if not CV2_AVAILABLE:
        return 0.0, {'error': 'OpenCV not available'}
    
    img_array = np.array(image.convert('RGB'))
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # Detect edges at multiple thresholds
    edges_low = cv2.Canny(gray, 30, 80)
    edges_high = cv2.Canny(gray, 80, 200)
    
    # Calculate edge consistency
    # Real photos have varying edge strengths
    # 3D renders have more uniform edges
    
    edge_ratio = np.sum(edges_high > 0) / (np.sum(edges_low > 0) + 1)
    
    # Analyze edge gradients
    sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    gradient_mag = np.sqrt(sobel_x**2 + sobel_y**2)
    
    # Edge uniformity (synthetic content has more uniform gradients)
    edge_mask = edges_low > 0
    if np.sum(edge_mask) > 100:
        edge_gradient_values = gradient_mag[edge_mask]
        edge_uniformity = 1.0 - (np.std(edge_gradient_values) / (np.mean(edge_gradient_values) + 1))
    else:
        edge_uniformity = 0.5
    
    # High uniformity suggests synthetic
    if edge_uniformity > 0.7:
        synthetic_score = 0.8
    elif edge_uniformity > 0.5:
        synthetic_score = 0.5
    else:
        synthetic_score = 0.2
    
    details = {
        'edge_ratio': round(float(edge_ratio), 3),
        'edge_uniformity': round(float(edge_uniformity), 3),
        'edge_pixels_low': int(np.sum(edges_low > 0)),
        'edge_pixels_high': int(np.sum(edges_high > 0))
    }
    
    return synthetic_score, details


def analyze_color_palette(image: Image.Image) -> Tuple[float, Dict]:
    """
    Analyze color palette characteristics.
    Cartoons and 3D renders often have:
    - Limited color palette
    - Flat color regions
    - Unnatural color transitions
    
    Returns:
        Tuple of (stylized_color_score, details)
    """
    if not CV2_AVAILABLE:
        return 0.0, {'error': 'OpenCV not available'}
    
    img_array = np.array(image.convert('RGB'))
    
    # Quantize colors to detect limited palette
    pixels = img_array.reshape(-1, 3).astype(np.float32)
    
    # K-means to find dominant colors
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    k = 16  # Check for 16 dominant colors
    
    try:
        _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 3, cv2.KMEANS_RANDOM_CENTERS)
        
        # Count pixels per cluster
        label_counts = np.bincount(labels.flatten(), minlength=k)
        label_percentages = label_counts / len(labels)
        
        # Check color concentration
        # Sort and get top colors
        sorted_percentages = np.sort(label_percentages)[::-1]
        top_3_concentration = sorted_percentages[:3].sum()
        top_5_concentration = sorted_percentages[:5].sum()
        
        # High concentration in few colors = cartoon-like
        if top_3_concentration > 0.7:
            color_score = 0.85
        elif top_5_concentration > 0.8:
            color_score = 0.6
        else:
            color_score = 0.2
            
    except Exception:
        color_score = 0.3
        top_3_concentration = 0.0
        top_5_concentration = 0.0
    
    # Check for flat color regions
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # Low laplacian variance = flat colors
    if laplacian_var < 200:
        flatness_boost = 0.3
    elif laplacian_var < 500:
        flatness_boost = 0.15
    else:
        flatness_boost = 0.0
    
    final_score = min(color_score + flatness_boost, 1.0)
    
    details = {
        'top_3_concentration': round(float(top_3_concentration), 3),
        'top_5_concentration': round(float(top_5_concentration), 3),
        'laplacian_variance': round(float(laplacian_var), 2),
        'flatness_boost': round(flatness_boost, 2)
    }
    
    return final_score, details


def detect_cartoon_outlines(image: Image.Image) -> Tuple[float, Dict]:
    """
    Detect cartoon-style black outlines around objects.
    Many cartoon/anime styles use distinct black outlines.
    
    Returns:
        Tuple of (outline_score, details)
    """
    if not CV2_AVAILABLE:
        return 0.0, {'error': 'OpenCV not available'}
    
    img_array = np.array(image.convert('RGB'))
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # Detect very dark pixels that could be outlines
    dark_threshold = 30
    dark_mask = gray < dark_threshold
    
    # Check if dark pixels form line-like structures
    dark_percentage = np.sum(dark_mask) / dark_mask.size
    
    # Detect edges in the dark regions
    if np.sum(dark_mask) > 100:
        # Morphological operations to find line structures
        kernel = np.ones((3, 3), np.uint8)
        dark_dilated = cv2.dilate(dark_mask.astype(np.uint8), kernel, iterations=1)
        dark_eroded = cv2.erode(dark_mask.astype(np.uint8), kernel, iterations=1)
        
        # Lines are thin - big difference between dilated and original
        line_indicator = np.sum(dark_dilated) / (np.sum(dark_mask) + 1)
        
        if line_indicator > 2.5 and dark_percentage > 0.02 and dark_percentage < 0.15:
            outline_score = 0.8  # Strong outline indication
        elif dark_percentage > 0.01 and dark_percentage < 0.1:
            outline_score = 0.4
        else:
            outline_score = 0.1
    else:
        outline_score = 0.1
        line_indicator = 0.0
    
    details = {
        'dark_percentage': round(float(dark_percentage), 4),
        'line_indicator': round(float(line_indicator) if 'line_indicator' in dir() else 0, 2)
    }
    
    return outline_score, details


def detect_stylization(image: Image.Image) -> StylizationResult:
    """
    Comprehensive stylization detection.
    Determines if an image is a real photograph or stylized content.
    
    Args:
        image: PIL Image to analyze
    
    Returns:
        StylizationResult with detection details
    """
    indicators = []
    all_details = {}
    
    # Run all detections
    skin_score, skin_details = analyze_skin_texture(image)
    edge_score, edge_details = analyze_edge_quality(image)
    color_score, color_details = analyze_color_palette(image)
    outline_score, outline_details = detect_cartoon_outlines(image)
    
    all_details['skin_texture'] = skin_details
    all_details['edge_quality'] = edge_details
    all_details['color_palette'] = color_details
    all_details['cartoon_outlines'] = outline_details
    
    # Collect indicators
    if skin_score > 0.6:
        indicators.append("unnaturally_smooth_skin")
    if edge_score > 0.6:
        indicators.append("synthetic_edge_patterns")
    if color_score > 0.6:
        indicators.append("limited_color_palette")
    if outline_score > 0.5:
        indicators.append("cartoon_outlines_detected")
    
    # Calculate combined score with weights
    combined_score = (
        skin_score * 0.35 +      # Skin texture is most important
        edge_score * 0.25 +      # Edge quality 
        color_score * 0.25 +     # Color palette
        outline_score * 0.15     # Cartoon outlines
    )
    
    all_details['individual_scores'] = {
        'skin': round(skin_score, 3),
        'edge': round(edge_score, 3),
        'color': round(color_score, 3),
        'outline': round(outline_score, 3)
    }
    all_details['combined_score'] = round(combined_score, 3)
    
    # Determine style type and if stylized
    if combined_score > 0.65:
        is_stylized = True
        
        # Determine specific style
        if outline_score > 0.6:
            if skin_score > 0.7:
                style_type = StyleType.ANIME
            else:
                style_type = StyleType.CARTOON
        elif skin_score > 0.75 and edge_score > 0.6:
            style_type = StyleType.RENDER_3D
        elif color_score > 0.7:
            style_type = StyleType.DIGITAL_ART
        else:
            style_type = StyleType.AVATAR
        
        # Calculate fake boost based on confidence
        fake_boost = min(combined_score * 0.5, 0.4)  # Max 40% boost
        
    elif combined_score > 0.45:
        is_stylized = True
        style_type = StyleType.UNKNOWN
        fake_boost = combined_score * 0.3  # Lower boost for uncertain cases
        
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
    Useful for fast screening before detailed analysis.
    
    Args:
        image: PIL Image
    
    Returns:
        Tuple of (is_likely_stylized, confidence)
    """
    if not CV2_AVAILABLE:
        return False, 0.0
    
    img_array = np.array(image.convert('RGB'))
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # Quick texture check
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    texture_var = laplacian.var()
    
    # Very low texture variance is a strong indicator
    if texture_var < 150:
        return True, 0.8
    elif texture_var < 300:
        return True, 0.5
    else:
        return False, 0.2
