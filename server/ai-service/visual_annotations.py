"""
Visual Annotations Module for TrueVibe AI Detection
Provides heatmaps, bounding boxes, and artifact arrows for manipulation detection.
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from typing import List, Dict, Tuple, Optional, Any
import io
import base64

# Try to import OpenCV for advanced processing
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("⚠️ OpenCV not available - some annotation features limited")


class ManipulationRegion:
    """Represents a detected manipulation region."""
    def __init__(
        self,
        bbox: Tuple[int, int, int, int],  # (x, y, width, height)
        score: float,
        label: str = "Suspicious",
        region_type: str = "face"  # face, background, artifact
    ):
        self.bbox = bbox
        self.score = score
        self.label = label
        self.region_type = region_type


class ArtifactMarker:
    """Represents a detected artifact to be marked with an arrow."""
    def __init__(
        self,
        position: Tuple[int, int],  # (x, y) center of artifact
        label: str,
        severity: str = "medium",  # low, medium, high
        description: str = ""
    ):
        self.position = position
        self.label = label
        self.severity = severity
        self.description = description


def get_severity_color(score: float, as_rgba: bool = False) -> Tuple:
    """
    Get color based on manipulation score.
    0.0 = green (authentic), 0.5 = yellow (suspicious), 1.0 = red (fake)
    """
    if score < 0.3:
        color = (46, 204, 113)  # Emerald green
    elif score < 0.5:
        color = (241, 196, 15)  # Yellow
    elif score < 0.7:
        color = (243, 156, 18)  # Orange
    else:
        color = (231, 76, 60)   # Red
    
    if as_rgba:
        alpha = int(min(score * 200 + 55, 255))
        return (*color, alpha)
    return color


def generate_heatmap(
    image: Image.Image,
    suspicion_map: np.ndarray = None,
    regions: List[ManipulationRegion] = None,
    opacity: float = 0.5
) -> Image.Image:
    """
    Generate a heatmap overlay showing suspicious regions.
    
    Args:
        image: Original PIL Image
        suspicion_map: 2D numpy array of suspicion scores (0-1) matching image size
        regions: List of ManipulationRegion objects (alternative to suspicion_map)
        opacity: Overlay opacity (0-1)
    
    Returns:
        PIL Image with heatmap overlay
    """
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    width, height = image.size
    heatmap = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    
    if suspicion_map is not None:
        # Resize suspicion map to match image if needed
        if suspicion_map.shape != (height, width):
            if CV2_AVAILABLE:
                suspicion_map = cv2.resize(suspicion_map, (width, height))
            else:
                # Simple resize using numpy
                from scipy.ndimage import zoom
                zoom_factors = (height / suspicion_map.shape[0], width / suspicion_map.shape[1])
                suspicion_map = zoom(suspicion_map, zoom_factors)
        
        # Create colormap (green -> yellow -> red)
        heatmap_array = np.zeros((height, width, 4), dtype=np.uint8)
        
        for y in range(height):
            for x in range(width):
                score = suspicion_map[y, x]
                if score > 0.1:  # Only color scores above threshold
                    color = get_severity_color(score, as_rgba=True)
                    heatmap_array[y, x] = color
        
        heatmap = Image.fromarray(heatmap_array, 'RGBA')
    
    elif regions:
        draw = ImageDraw.Draw(heatmap)
        
        for region in regions:
            x, y, w, h = region.bbox
            color = get_severity_color(region.score, as_rgba=True)
            
            # Create gradient fill for region
            for i in range(min(w, h) // 2):
                alpha = int(color[3] * (1 - i / (min(w, h) // 2)))
                layer_color = (*color[:3], alpha)
                draw.rectangle(
                    [(x + i, y + i), (x + w - i, y + h - i)],
                    fill=layer_color
                )
    
    # Blur heatmap for smoother visualization
    if CV2_AVAILABLE:
        heatmap_np = np.array(heatmap)
        heatmap_np = cv2.GaussianBlur(heatmap_np, (31, 31), 0)
        heatmap = Image.fromarray(heatmap_np)
    else:
        heatmap = heatmap.filter(ImageFilter.GaussianBlur(radius=15))
    
    # Composite with original
    result = Image.alpha_composite(image, heatmap)
    
    return result


def draw_manipulation_boxes(
    image: Image.Image,
    regions: List[ManipulationRegion],
    show_labels: bool = True,
    line_width: int = 3
) -> Image.Image:
    """
    Draw bounding boxes around detected manipulation areas.
    
    Args:
        image: Original PIL Image
        regions: List of ManipulationRegion objects
        show_labels: Whether to show labels with scores
        line_width: Width of bounding box lines
    
    Returns:
        PIL Image with bounding boxes drawn
    """
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Create overlay for transparency
    overlay = Image.new('RGBA', image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Try to load a font
    try:
        font = ImageFont.truetype("arial.ttf", 14)
        small_font = ImageFont.truetype("arial.ttf", 12)
    except:
        font = ImageFont.load_default()
        small_font = font
    
    for region in regions:
        x, y, w, h = region.bbox
        color = get_severity_color(region.score)
        
        # Draw bounding box with corner accents
        # Main rectangle
        draw.rectangle(
            [(x, y), (x + w, y + h)],
            outline=color,
            width=line_width
        )
        
        # Corner accents (thicker L-shaped corners)
        corner_len = min(w, h) // 5
        accent_width = line_width + 2
        
        # Top-left corner
        draw.line([(x, y), (x + corner_len, y)], fill=color, width=accent_width)
        draw.line([(x, y), (x, y + corner_len)], fill=color, width=accent_width)
        
        # Top-right corner
        draw.line([(x + w - corner_len, y), (x + w, y)], fill=color, width=accent_width)
        draw.line([(x + w, y), (x + w, y + corner_len)], fill=color, width=accent_width)
        
        # Bottom-left corner
        draw.line([(x, y + h - corner_len), (x, y + h)], fill=color, width=accent_width)
        draw.line([(x, y + h), (x + corner_len, y + h)], fill=color, width=accent_width)
        
        # Bottom-right corner
        draw.line([(x + w, y + h - corner_len), (x + w, y + h)], fill=color, width=accent_width)
        draw.line([(x + w - corner_len, y + h), (x + w, y + h)], fill=color, width=accent_width)
        
        if show_labels:
            # Draw label background
            label_text = f"{region.label}: {region.score*100:.0f}%"
            bbox = draw.textbbox((x, y - 22), label_text, font=font)
            padding = 4
            
            draw.rectangle(
                [(bbox[0] - padding, bbox[1] - padding), 
                 (bbox[2] + padding, bbox[3] + padding)],
                fill=(*color, 200)
            )
            
            # Draw label text
            draw.text((x, y - 22), label_text, fill=(255, 255, 255), font=font)
    
    # Composite
    result = Image.alpha_composite(image, overlay)
    
    return result


def draw_artifact_arrows(
    image: Image.Image,
    artifacts: List[ArtifactMarker],
    arrow_length: int = 50
) -> Image.Image:
    """
    Draw arrows pointing to detected artifacts with labels.
    
    Args:
        image: Original PIL Image
        artifacts: List of ArtifactMarker objects
        arrow_length: Length of arrow lines
    
    Returns:
        PIL Image with arrows drawn
    """
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    overlay = Image.new('RGBA', image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Try to load a font
    try:
        font = ImageFont.truetype("arial.ttf", 11)
    except:
        font = ImageFont.load_default()
    
    severity_colors = {
        'low': (241, 196, 15),      # Yellow
        'medium': (243, 156, 18),   # Orange
        'high': (231, 76, 60)       # Red
    }
    
    for artifact in artifacts:
        x, y = artifact.position
        color = severity_colors.get(artifact.severity, (243, 156, 18))
        
        # Determine arrow direction based on position in image
        img_w, img_h = image.size
        
        # Point arrow from edge toward artifact
        if x < img_w // 2:
            # Artifact on left, arrow from left
            start_x = max(10, x - arrow_length)
            start_y = y
            end_x = x - 5
            end_y = y
        else:
            # Artifact on right, arrow from right
            start_x = min(img_w - 10, x + arrow_length)
            start_y = y
            end_x = x + 5
            end_y = y
        
        # Draw arrow line
        draw.line([(start_x, start_y), (end_x, end_y)], fill=color, width=3)
        
        # Draw arrowhead
        arrow_size = 10
        if start_x < end_x:
            # Arrow pointing right
            draw.polygon([
                (end_x, end_y),
                (end_x - arrow_size, end_y - arrow_size // 2),
                (end_x - arrow_size, end_y + arrow_size // 2)
            ], fill=color)
        else:
            # Arrow pointing left
            draw.polygon([
                (end_x, end_y),
                (end_x + arrow_size, end_y - arrow_size // 2),
                (end_x + arrow_size, end_y + arrow_size // 2)
            ], fill=color)
        
        # Draw label with background
        label_x = start_x - 5 if start_x < end_x else start_x + 5
        label_y = start_y - 20
        
        text_bbox = draw.textbbox((label_x, label_y), artifact.label, font=font)
        padding = 3
        
        # Adjust label position if it goes off screen
        if text_bbox[0] < 0:
            label_x = 5
        if text_bbox[2] > img_w:
            label_x = img_w - (text_bbox[2] - text_bbox[0]) - 5
        
        text_bbox = draw.textbbox((label_x, label_y), artifact.label, font=font)
        
        draw.rectangle(
            [(text_bbox[0] - padding, text_bbox[1] - padding),
             (text_bbox[2] + padding, text_bbox[3] + padding)],
            fill=(*color, 220)
        )
        
        draw.text((label_x, label_y), artifact.label, fill=(255, 255, 255), font=font)
    
    result = Image.alpha_composite(image, overlay)
    
    return result


def create_annotated_comparison(
    original: Image.Image,
    annotated: Image.Image,
    label_original: str = "Original",
    label_annotated: str = "AI Analysis"
) -> Image.Image:
    """
    Create a side-by-side comparison of original and annotated images.
    
    Args:
        original: Original PIL Image
        annotated: Annotated PIL Image with markings
        label_original: Label for original image
        label_annotated: Label for annotated image
    
    Returns:
        PIL Image with side-by-side comparison
    """
    # Ensure same size
    if original.size != annotated.size:
        annotated = annotated.resize(original.size, Image.LANCZOS)
    
    width, height = original.size
    gap = 20
    label_height = 30
    
    # Create comparison image
    comparison = Image.new('RGB', (width * 2 + gap, height + label_height), (30, 41, 59))
    
    # Convert to RGB if needed
    if original.mode == 'RGBA':
        bg = Image.new('RGB', original.size, (30, 41, 59))
        bg.paste(original, mask=original.split()[3])
        original = bg
    
    if annotated.mode == 'RGBA':
        bg = Image.new('RGB', annotated.size, (30, 41, 59))
        bg.paste(annotated, mask=annotated.split()[3])
        annotated = bg
    
    # Paste images
    comparison.paste(original, (0, label_height))
    comparison.paste(annotated, (width + gap, label_height))
    
    # Draw labels
    draw = ImageDraw.Draw(comparison)
    
    try:
        font = ImageFont.truetype("arial.ttf", 16)
    except:
        font = ImageFont.load_default()
    
    # Center labels
    orig_bbox = draw.textbbox((0, 0), label_original, font=font)
    annot_bbox = draw.textbbox((0, 0), label_annotated, font=font)
    
    orig_x = (width - (orig_bbox[2] - orig_bbox[0])) // 2
    annot_x = width + gap + (width - (annot_bbox[2] - annot_bbox[0])) // 2
    
    draw.text((orig_x, 5), label_original, fill=(148, 163, 184), font=font)
    draw.text((annot_x, 5), label_annotated, fill=(168, 85, 247), font=font)
    
    return comparison


def create_full_annotated_image(
    image: Image.Image,
    faces: List[Any],  # FaceInfo objects
    face_scores: List[float],
    artifact_detections: List[Dict] = None,
    include_heatmap: bool = True,
    include_boxes: bool = True,
    include_arrows: bool = True
) -> Tuple[Image.Image, Image.Image]:
    """
    Create a fully annotated image with all visual markers.
    
    Args:
        image: Original PIL Image
        faces: List of FaceInfo objects with bbox
        face_scores: Fake scores for each face
        artifact_detections: List of detected artifacts
        include_heatmap: Whether to include heatmap
        include_boxes: Whether to include bounding boxes
        include_arrows: Whether to include artifact arrows
    
    Returns:
        Tuple of (annotated_image, heatmap_only)
    """
    # Create manipulation regions from faces
    regions = []
    for i, face in enumerate(faces):
        if hasattr(face, 'bbox'):
            score = face_scores[i] if i < len(face_scores) else 0.5
            region = ManipulationRegion(
                bbox=face.bbox,
                score=score,
                label=f"Face {i+1}",
                region_type="face"
            )
            regions.append(region)
    
    # Create artifact markers
    artifacts = []
    if artifact_detections:
        for detection in artifact_detections:
            marker = ArtifactMarker(
                position=detection.get('position', (100, 100)),
                label=detection.get('label', 'Artifact'),
                severity=detection.get('severity', 'medium'),
                description=detection.get('description', '')
            )
            artifacts.append(marker)
    
    # Start with original
    result = image.copy()
    heatmap_only = None
    
    # Add heatmap
    if include_heatmap and regions:
        heatmap_only = generate_heatmap(image, regions=regions)
        result = heatmap_only
    
    # Add bounding boxes
    if include_boxes and regions:
        result = draw_manipulation_boxes(result, regions)
    
    # Add arrows
    if include_arrows and artifacts:
        result = draw_artifact_arrows(result, artifacts)
    
    return result, heatmap_only


def image_to_base64(image: Image.Image, format: str = 'PNG') -> str:
    """Convert PIL Image to base64 string."""
    buffer = io.BytesIO()
    image.save(buffer, format=format)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def base64_to_image(b64_string: str) -> Image.Image:
    """Convert base64 string to PIL Image."""
    img_data = base64.b64decode(b64_string)
    return Image.open(io.BytesIO(img_data))
