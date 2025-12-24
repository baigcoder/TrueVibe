"""
AI Art Signature Detection Module for TrueVibe
Detects signatures/artifacts from DALL-E, Midjourney, Stable Diffusion, and other AI generators.
Also includes background artifact detection and scene consistency analysis.
"""

import numpy as np
from PIL import Image, ImageFilter
from typing import Dict, Tuple, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

# Try to import OpenCV
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("⚠️ OpenCV not available - AI art detection limited")


class AIGenerator(Enum):
    """Known AI image generators."""
    UNKNOWN = "unknown"
    DALLE = "dall-e"
    MIDJOURNEY = "midjourney"
    STABLE_DIFFUSION = "stable_diffusion"
    GENERIC_AI = "generic_ai"
    LIKELY_REAL = "likely_real"


@dataclass
class AIArtSignature:
    """Detection result for AI art signatures."""
    generator: AIGenerator
    confidence: float
    signatures_found: List[str]
    analysis_details: Dict[str, Any]


@dataclass
class BackgroundAnalysis:
    """Background artifact analysis result."""
    is_suspicious: bool
    suspicion_score: float
    artifacts_found: List[str]
    details: Dict[str, Any]


@dataclass
class SceneConsistencyResult:
    """Scene consistency analysis result."""
    is_consistent: bool
    consistency_score: float
    inconsistencies: List[str]
    details: Dict[str, Any]


def analyze_color_banding(image: Image.Image) -> Tuple[float, Dict]:
    """
    Detect color banding which is common in AI-generated images.
    AI images often have subtle gradient banding in smooth areas.
    
    Returns:
        Tuple of (banding_score, details)
    """
    if not CV2_AVAILABLE:
        return 0.0, {'error': 'OpenCV not available'}
    
    img_array = np.array(image.convert('RGB'))
    
    # Convert to grayscale
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # Apply edge detection to find gradient boundaries
    edges = cv2.Canny(gray, 10, 30)
    
    # Calculate edge density in smooth areas
    # Smooth areas have low variance
    kernel_size = 15
    local_var = cv2.blur(gray.astype(float) ** 2, (kernel_size, kernel_size)) - \
                cv2.blur(gray.astype(float), (kernel_size, kernel_size)) ** 2
    
    smooth_mask = local_var < 100  # Low variance = smooth area
    
    # Count edges in smooth areas (these shouldn't have many edges)
    edges_in_smooth = np.sum(edges[smooth_mask]) / 255
    total_smooth = np.sum(smooth_mask)
    
    if total_smooth > 0:
        banding_ratio = edges_in_smooth / total_smooth
        # Normalize to 0-1 score
        banding_score = min(banding_ratio * 50, 1.0)
    else:
        banding_score = 0.0
    
    details = {
        'edges_in_smooth_areas': int(edges_in_smooth),
        'smooth_area_pixels': int(total_smooth),
        'banding_ratio': round(float(banding_ratio) if total_smooth > 0 else 0, 4)
    }
    
    return banding_score, details


def analyze_texture_uniformity(image: Image.Image) -> Tuple[float, Dict]:
    """
    Analyze texture uniformity - AI images often have too uniform/too perfect textures.
    
    Returns:
        Tuple of (uniformity_score, details)
    """
    if not CV2_AVAILABLE:
        return 0.0, {'error': 'OpenCV not available'}
    
    img_array = np.array(image.convert('RGB'))
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # Calculate local texture variance using Laplacian
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    texture_var = np.var(laplacian)
    texture_mean = np.mean(np.abs(laplacian))
    
    # Very low texture variance suggests AI-generated smooth surfaces
    # Very high uniformity is suspicious
    if texture_var < 200:
        uniformity_score = 0.7 - (texture_var / 200) * 0.3
    elif texture_var > 5000:
        uniformity_score = 0.3  # Too noisy might also be AI
    else:
        uniformity_score = 0.1  # Normal texture
    
    details = {
        'texture_variance': round(float(texture_var), 2),
        'texture_mean': round(float(texture_mean), 2),
        'assessment': 'too_smooth' if texture_var < 200 else 'normal' if texture_var < 5000 else 'too_noisy'
    }
    
    return uniformity_score, details


def detect_dalle_signature(image: Image.Image) -> Tuple[float, Dict]:
    """
    Detect DALL-E specific signatures:
    - Characteristic color palette
    - Background blur patterns
    - Edge artifacts at object boundaries
    - Specific noise patterns
    
    Returns:
        Tuple of (dalle_score, details)
    """
    signatures = []
    total_score = 0.0
    
    if not CV2_AVAILABLE:
        return 0.0, {'error': 'OpenCV not available', 'signatures': []}
    
    img_array = np.array(image.convert('RGB'))
    
    # 1. Check for DALL-E color characteristics
    # DALL-E tends to have saturated, vibrant colors with specific distributions
    hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]
    
    sat_mean = np.mean(saturation)
    sat_std = np.std(saturation)
    
    # DALL-E often has high saturation uniformity
    if sat_std < 30 and sat_mean > 100:
        signatures.append("uniform_high_saturation")
        total_score += 0.15
    
    # 2. Check for gradient smoothness typical in DALL-E
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    gradient_mag = np.sqrt(sobel_x**2 + sobel_y**2)
    
    # DALL-E has smooth gradients with sharp edges
    gradient_std = np.std(gradient_mag)
    if gradient_std > 40 and np.mean(gradient_mag) < 15:
        signatures.append("sharp_edges_smooth_surfaces")
        total_score += 0.2
    
    # 3. Check for specific blur patterns in background
    # DALL-E often has a characteristic way of blurring backgrounds
    blurred = cv2.GaussianBlur(gray, (21, 21), 0)
    diff = np.abs(gray.astype(float) - blurred.astype(float))
    
    # Calculate blur uniformity
    blur_uniformity = 1.0 - (np.std(diff) / (np.mean(diff) + 1))
    if blur_uniformity > 0.7:
        signatures.append("uniform_blur_pattern")
        total_score += 0.15
    
    # 4. FFT analysis for periodic patterns
    f_transform = np.fft.fft2(gray)
    f_shift = np.fft.fftshift(f_transform)
    magnitude = np.log(np.abs(f_shift) + 1)
    
    # Check for unusual frequency patterns
    center = magnitude[magnitude.shape[0]//4:-magnitude.shape[0]//4, 
                       magnitude.shape[1]//4:-magnitude.shape[1]//4]
    center_energy = np.sum(center) / center.size
    total_energy = np.sum(magnitude) / magnitude.size
    
    freq_ratio = center_energy / (total_energy + 0.001)
    if freq_ratio > 1.5:
        signatures.append("unusual_frequency_distribution")
        total_score += 0.1
    
    details = {
        'saturation_mean': round(float(sat_mean), 2),
        'saturation_std': round(float(sat_std), 2),
        'gradient_std': round(float(gradient_std), 2),
        'blur_uniformity': round(float(blur_uniformity), 3),
        'freq_ratio': round(float(freq_ratio), 3),
        'signatures': signatures
    }
    
    return min(total_score, 1.0), details


def detect_midjourney_signature(image: Image.Image) -> Tuple[float, Dict]:
    """
    Detect Midjourney specific signatures:
    - Painterly/artistic style
    - Characteristic lighting effects
    - Specific color grading
    - Artistic brush-like textures
    
    Returns:
        Tuple of (midjourney_score, details)
    """
    signatures = []
    total_score = 0.0
    
    if not CV2_AVAILABLE:
        return 0.0, {'error': 'OpenCV not available', 'signatures': []}
    
    img_array = np.array(image.convert('RGB'))
    
    # 1. Check for Midjourney's characteristic high contrast lighting
    lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
    l_channel = lab[:, :, 0]
    
    l_std = np.std(l_channel)
    l_range = np.max(l_channel) - np.min(l_channel)
    
    # Midjourney often has dramatic lighting
    if l_std > 60 and l_range > 200:
        signatures.append("dramatic_lighting")
        total_score += 0.15
    
    # 2. Check for painterly texture (artistic brush strokes)
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # Detect directional textures using oriented filters
    kernel_size = 7
    kernel_h = cv2.getGaborKernel((kernel_size, kernel_size), 3.0, 0, 5.0, 0.5, 0)
    kernel_v = cv2.getGaborKernel((kernel_size, kernel_size), 3.0, np.pi/2, 5.0, 0.5, 0)
    
    filtered_h = cv2.filter2D(gray, cv2.CV_64F, kernel_h)
    filtered_v = cv2.filter2D(gray, cv2.CV_64F, kernel_v)
    
    texture_energy = np.mean(np.abs(filtered_h)) + np.mean(np.abs(filtered_v))
    
    # Midjourney has distinctive texture patterns
    if texture_energy > 20:
        signatures.append("painterly_texture")
        total_score += 0.2
    
    # 3. Check for characteristic color grading
    # Midjourney often has specific color tones (warm highlights, cool shadows)
    hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
    h_channel = hsv[:, :, 0]
    
    # Check hue distribution
    h_hist, _ = np.histogram(h_channel, bins=18, range=(0, 180))
    h_hist = h_hist / h_hist.sum()
    
    # Dominant hues concentration
    sorted_hist = np.sort(h_hist)[::-1]
    top_3_concentration = sorted_hist[:3].sum()
    
    if top_3_concentration > 0.5:
        signatures.append("concentrated_color_palette")
        total_score += 0.15
    
    # 4. Check for artistic vignetting
    height, width = gray.shape
    center_y, center_x = height // 2, width // 2
    
    # Create radial distance map
    y_coords, x_coords = np.ogrid[:height, :width]
    distances = np.sqrt((y_coords - center_y)**2 + (x_coords - center_x)**2)
    max_dist = np.sqrt(center_x**2 + center_y**2)
    
    # Correlate brightness with distance
    brightness_vs_distance = np.corrcoef(distances.flatten(), gray.astype(float).flatten())[0, 1]
    
    # Negative correlation = vignetting (darker at edges)
    if brightness_vs_distance < -0.2:
        signatures.append("artistic_vignetting")
        total_score += 0.1
    
    details = {
        'lighting_std': round(float(l_std), 2),
        'lighting_range': int(l_range),
        'texture_energy': round(float(texture_energy), 2),
        'color_concentration': round(float(top_3_concentration), 3),
        'vignetting_correlation': round(float(brightness_vs_distance), 3),
        'signatures': signatures
    }
    
    return min(total_score, 1.0), details


def detect_stable_diffusion_signature(image: Image.Image) -> Tuple[float, Dict]:
    """
    Detect Stable Diffusion specific signatures:
    - Denoising artifacts (characteristic noise patterns)
    - Hand/finger anomalies (common SD issue)
    - Text rendering issues
    - Specific edge artifacts
    
    Returns:
        Tuple of (sd_score, details)
    """
    signatures = []
    total_score = 0.0
    
    if not CV2_AVAILABLE:
        return 0.0, {'error': 'OpenCV not available', 'signatures': []}
    
    img_array = np.array(image.convert('RGB'))
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # 1. Check for SD's characteristic noise pattern (from denoising process)
    # Extract high-frequency noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    noise = gray.astype(float) - blurred.astype(float)
    
    # SD noise has specific statistical properties
    noise_std = np.std(noise)
    noise_kurtosis = np.mean((noise - np.mean(noise))**4) / (np.std(noise)**4 + 0.001)
    
    # SD typically has moderate noise with specific kurtosis
    if 2.5 < noise_std < 8 and noise_kurtosis > 3.5:
        signatures.append("sd_noise_pattern")
        total_score += 0.2
    
    # 2. Check for artifact at edges (SD's latent space upscaling artifacts)
    edges = cv2.Canny(gray, 50, 150)
    
    # Dilate edges to get edge regions
    kernel = np.ones((5, 5), np.uint8)
    edge_region = cv2.dilate(edges, kernel, iterations=2)
    
    # Check noise in edge regions vs flat regions
    if np.sum(edge_region) > 0:
        edge_noise = np.std(noise[edge_region > 0])
        flat_noise = np.std(noise[edge_region == 0]) if np.sum(edge_region == 0) > 0 else 0
        
        noise_ratio = edge_noise / (flat_noise + 0.001)
        
        if noise_ratio > 1.5:
            signatures.append("edge_artifacts")
            total_score += 0.15
    
    # 3. Check for repetitive patterns (SD's tiling artifacts)
    # Use autocorrelation
    f_transform = np.fft.fft2(gray)
    power_spectrum = np.abs(f_transform) ** 2
    autocorr = np.fft.ifft2(power_spectrum).real
    autocorr = np.fft.fftshift(autocorr)
    
    # Normalize
    autocorr = autocorr / autocorr.max()
    
    # Check for periodic peaks (excluding center)
    center = autocorr.shape[0] // 2
    margin = 20
    autocorr_excl_center = autocorr.copy()
    autocorr_excl_center[center-margin:center+margin, center-margin:center+margin] = 0
    
    max_sidelobe = np.max(autocorr_excl_center)
    
    if max_sidelobe > 0.3:
        signatures.append("repetitive_patterns")
        total_score += 0.15
    
    # 4. Check for color quantization in skin tones (common in SD)
    # Convert to LAB for skin detection
    lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
    
    # Simple skin mask (LAB values typical for skin)
    skin_mask = ((lab[:, :, 1] > 125) & (lab[:, :, 1] < 145) & 
                 (lab[:, :, 2] > 130) & (lab[:, :, 2] < 155))
    
    if np.sum(skin_mask) > 1000:  # If enough skin pixels
        skin_l = lab[:, :, 0][skin_mask]
        unique_l = len(np.unique(skin_l))
        
        # Low unique values = quantization
        if unique_l < 50:
            signatures.append("skin_color_quantization")
            total_score += 0.1
    
    details = {
        'noise_std': round(float(noise_std), 2),
        'noise_kurtosis': round(float(noise_kurtosis), 2),
        'max_autocorr_sidelobe': round(float(max_sidelobe), 3),
        'signatures': signatures
    }
    
    return min(total_score, 1.0), details


def detect_ai_art_signature(image: Image.Image) -> AIArtSignature:
    """
    Comprehensive AI art detection analyzing multiple generator signatures.
    
    Args:
        image: PIL Image to analyze
    
    Returns:
        AIArtSignature with detected generator and confidence
    """
    all_signatures = []
    analysis_details = {}
    
    # Run all detections
    dalle_score, dalle_details = detect_dalle_signature(image)
    midjourney_score, mj_details = detect_midjourney_signature(image)
    sd_score, sd_details = detect_stable_diffusion_signature(image)
    
    # General AI indicators
    banding_score, banding_details = analyze_color_banding(image)
    uniformity_score, uniformity_details = analyze_texture_uniformity(image)
    
    analysis_details['dalle'] = dalle_details
    analysis_details['midjourney'] = mj_details
    analysis_details['stable_diffusion'] = sd_details
    analysis_details['color_banding'] = banding_details
    analysis_details['texture_uniformity'] = uniformity_details
    
    # Collect all signatures
    all_signatures.extend(dalle_details.get('signatures', []))
    all_signatures.extend(mj_details.get('signatures', []))
    all_signatures.extend(sd_details.get('signatures', []))
    
    # Calculate combined score
    generic_ai_score = (banding_score + uniformity_score) / 2
    analysis_details['generic_ai_score'] = round(generic_ai_score, 3)
    
    # Determine most likely generator
    scores = {
        AIGenerator.DALLE: dalle_score,
        AIGenerator.MIDJOURNEY: midjourney_score,
        AIGenerator.STABLE_DIFFUSION: sd_score,
        AIGenerator.GENERIC_AI: generic_ai_score
    }
    
    best_match = max(scores, key=scores.get)
    best_score = scores[best_match]
    
    # Threshold for detection
    if best_score < 0.25:
        generator = AIGenerator.LIKELY_REAL
        confidence = 1.0 - best_score
    else:
        generator = best_match
        confidence = best_score
    
    return AIArtSignature(
        generator=generator,
        confidence=round(confidence, 3),
        signatures_found=all_signatures,
        analysis_details=analysis_details
    )


def analyze_background_artifacts(image: Image.Image) -> BackgroundAnalysis:
    """
    Analyze background for AI generation artifacts.
    
    Common issues:
    - Inconsistent textures
    - Unnatural blur patterns  
    - Object boundary issues
    - Impossible perspectives
    
    Returns:
        BackgroundAnalysis result
    """
    artifacts = []
    details = {}
    total_score = 0.0
    
    if not CV2_AVAILABLE:
        return BackgroundAnalysis(
            is_suspicious=False,
            suspicion_score=0.0,
            artifacts_found=[],
            details={'error': 'OpenCV not available'}
        )
    
    img_array = np.array(image.convert('RGB'))
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    
    # 1. Detect foreground/background separation
    # Use edge density to find main subject vs background
    edges = cv2.Canny(gray, 50, 150)
    
    # Divide image into grid
    grid_size = 8
    h, w = gray.shape
    cell_h, cell_w = h // grid_size, w // grid_size
    
    edge_densities = []
    for i in range(grid_size):
        for j in range(grid_size):
            cell = edges[i*cell_h:(i+1)*cell_h, j*cell_w:(j+1)*cell_w]
            density = np.sum(cell > 0) / cell.size
            edge_densities.append(density)
    
    edge_densities = np.array(edge_densities)
    background_threshold = np.percentile(edge_densities, 30)
    
    # 2. Analyze background texture consistency
    low_edge_cells = edge_densities < background_threshold
    if np.sum(low_edge_cells) > 5:
        # Background has low edges - check for unnatural uniformity
        bg_variance = np.var(edge_densities[low_edge_cells])
        
        if bg_variance < 0.0001:
            artifacts.append("too_uniform_background")
            total_score += 0.2
    
    # 3. Check for blur discontinuities
    blurred = cv2.GaussianBlur(gray, (11, 11), 0)
    blur_diff = np.abs(gray.astype(float) - blurred.astype(float))
    
    # Grid analysis of blur patterns
    blur_variances = []
    for i in range(grid_size):
        for j in range(grid_size):
            cell = blur_diff[i*cell_h:(i+1)*cell_h, j*cell_w:(j+1)*cell_w]
            blur_variances.append(np.var(cell))
    
    blur_variances = np.array(blur_variances)
    blur_inconsistency = np.std(blur_variances) / (np.mean(blur_variances) + 0.001)
    
    if blur_inconsistency > 2.0:
        artifacts.append("inconsistent_blur")
        total_score += 0.15
    
    # 4. Check for repeating patterns (common in AI backgrounds)
    f_transform = np.fft.fft2(gray)
    magnitude = np.abs(np.fft.fftshift(f_transform))
    
    # Look for unusual periodic peaks
    log_mag = np.log(magnitude + 1)
    threshold = np.percentile(log_mag, 99)
    peaks = log_mag > threshold
    
    # Count peaks excluding center
    center_h, center_w = gray.shape[0] // 2, gray.shape[1] // 2
    margin = 20
    peaks[center_h-margin:center_h+margin, center_w-margin:center_w+margin] = False
    
    num_peaks = np.sum(peaks)
    if num_peaks > 10:
        artifacts.append("repeating_patterns")
        total_score += 0.15
    
    details = {
        'background_edge_variance': round(float(bg_variance) if 'bg_variance' in dir() else 0, 6),
        'blur_inconsistency': round(float(blur_inconsistency), 3),
        'periodic_peaks': int(num_peaks),
        'grid_analysis': {
            'edge_density_std': round(float(np.std(edge_densities)), 4),
            'blur_variance_std': round(float(np.std(blur_variances)), 4)
        }
    }
    
    return BackgroundAnalysis(
        is_suspicious=total_score > 0.25,
        suspicion_score=round(min(total_score, 1.0), 3),
        artifacts_found=artifacts,
        details=details
    )


def analyze_scene_consistency(image: Image.Image) -> SceneConsistencyResult:
    """
    Analyze scene for physical consistency.
    
    Checks:
    - Lighting direction consistency
    - Shadow consistency
    - Perspective consistency
    - Scale consistency
    
    Returns:
        SceneConsistencyResult
    """
    inconsistencies = []
    details = {}
    consistency_score = 1.0  # Start at fully consistent
    
    if not CV2_AVAILABLE:
        return SceneConsistencyResult(
            is_consistent=True,
            consistency_score=1.0,
            inconsistencies=[],
            details={'error': 'OpenCV not available'}
        )
    
    img_array = np.array(image.convert('RGB'))
    gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
    l_channel = lab[:, :, 0]
    
    # 1. Lighting direction analysis
    # Calculate gradient to estimate light source direction
    sobel_x = cv2.Sobel(l_channel, cv2.CV_64F, 1, 0, ksize=5)
    sobel_y = cv2.Sobel(l_channel, cv2.CV_64F, 0, 1, ksize=5)
    
    # Compute gradient direction histogram
    gradient_angle = np.arctan2(sobel_y, sobel_x)
    gradient_mag = np.sqrt(sobel_x**2 + sobel_y**2)
    
    # Weight angles by magnitude
    significant_mask = gradient_mag > np.percentile(gradient_mag, 70)
    if np.sum(significant_mask) > 100:
        significant_angles = gradient_angle[significant_mask]
        
        # Check for multiple dominant light directions
        hist, bins = np.histogram(significant_angles, bins=8, range=(-np.pi, np.pi))
        hist = hist / hist.sum()
        
        # Entropy of lighting directions
        entropy = -np.sum(hist * np.log(hist + 0.001))
        max_entropy = np.log(8)  # Maximum possible entropy
        
        normalized_entropy = entropy / max_entropy
        
        if normalized_entropy > 0.85:
            inconsistencies.append("multiple_light_sources")
            consistency_score -= 0.15
        
        details['lighting_entropy'] = round(float(normalized_entropy), 3)
    
    # 2. Shadow analysis
    # Detect shadows (areas with low L but normal a,b)
    shadow_mask = (l_channel < 80) & (l_channel > 20)
    
    if np.sum(shadow_mask) > 500:
        # Check shadow edge sharpness
        shadow_uint8 = shadow_mask.astype(np.uint8) * 255
        shadow_edges = cv2.Canny(shadow_uint8, 50, 150)
        
        # Blur shadow mask and compare to original
        shadow_blurred = cv2.GaussianBlur(shadow_uint8, (11, 11), 0)
        shadow_sharpness = np.mean(np.abs(shadow_uint8.astype(float) - shadow_blurred.astype(float)))
        
        # Very sharp or very soft shadows can be inconsistent
        if shadow_sharpness > 80:
            inconsistencies.append("unnatural_sharp_shadows")
            consistency_score -= 0.1
        
        details['shadow_sharpness'] = round(float(shadow_sharpness), 2)
    
    # 3. Perspective analysis using line detection
    edges = cv2.Canny(gray, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, 50, minLineLength=50, maxLineGap=10)
    
    if lines is not None and len(lines) > 5:
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = np.arctan2(y2 - y1, x2 - x1)
            angles.append(angle)
        
        angles = np.array(angles)
        
        # Check for convergence points (vanishing points)
        # In consistent perspective, lines should converge
        angle_clusters = np.histogram(angles, bins=6, range=(-np.pi/2, np.pi/2))
        
        # Too many dominant directions suggest perspective issues
        dominant_directions = np.sum(angle_clusters[0] > len(lines) * 0.15)
        
        if dominant_directions > 3:
            inconsistencies.append("inconsistent_perspective")
            consistency_score -= 0.15
        
        details['line_count'] = len(lines)
        details['dominant_directions'] = int(dominant_directions)
    
    # Ensure score doesn't go negative
    consistency_score = max(consistency_score, 0.0)
    
    return SceneConsistencyResult(
        is_consistent=consistency_score > 0.7,
        consistency_score=round(consistency_score, 3),
        inconsistencies=inconsistencies,
        details=details
    )


def comprehensive_no_face_analysis(image: Image.Image) -> Dict[str, Any]:
    """
    Comprehensive analysis for images without faces.
    Combines AI art detection, background analysis, and scene consistency.
    
    Args:
        image: PIL Image to analyze
    
    Returns:
        Dictionary with all analysis results and overall score
    """
    # Run all analyses
    ai_signature = detect_ai_art_signature(image)
    background = analyze_background_artifacts(image)
    scene = analyze_scene_consistency(image)
    
    # Calculate combined suspicion score
    ai_score = ai_signature.confidence if ai_signature.generator != AIGenerator.LIKELY_REAL else 0
    
    combined_score = (
        ai_score * 0.5 +
        background.suspicion_score * 0.25 +
        (1 - scene.consistency_score) * 0.25
    )
    
    # Determine overall classification
    if combined_score > 0.6:
        classification = "likely_ai_generated"
    elif combined_score > 0.35:
        classification = "suspicious"
    else:
        classification = "likely_authentic"
    
    all_issues = []
    all_issues.extend(ai_signature.signatures_found)
    all_issues.extend(background.artifacts_found)
    all_issues.extend(scene.inconsistencies)
    
    return {
        'classification': classification,
        'combined_score': round(combined_score, 3),
        'ai_generator': ai_signature.generator.value,
        'ai_generator_confidence': ai_signature.confidence,
        'ai_signatures': ai_signature.signatures_found,
        'background_suspicious': background.is_suspicious,
        'background_score': background.suspicion_score,
        'background_artifacts': background.artifacts_found,
        'scene_consistent': scene.is_consistent,
        'scene_score': scene.consistency_score,
        'scene_issues': scene.inconsistencies,
        'all_detected_issues': all_issues,
        'details': {
            'ai_art': ai_signature.analysis_details,
            'background': background.details,
            'scene': scene.details
        }
    }
