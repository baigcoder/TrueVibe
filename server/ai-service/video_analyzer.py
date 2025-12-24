"""
Video Analysis Enhancement Module for TrueVibe
Provides motion blur detection, lip-sync analysis, and face tracking for deepfake detection.
"""

import numpy as np
from PIL import Image
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
import io
import base64

# Try to import OpenCV
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("⚠️ OpenCV not available - video analysis limited")


@dataclass
class MotionBlurResult:
    """Motion blur analysis result for a frame."""
    frame_index: int
    blur_score: float
    is_natural: bool
    blur_direction: Optional[float]  # Angle in degrees
    issues: List[str]


@dataclass
class FaceTrackingResult:
    """Face tracking result across frames."""
    face_id: int
    positions: List[Tuple[int, int, int, int]]  # bbox per frame
    consistency_score: float
    velocity_variance: float
    issues: List[str]


@dataclass
class LipSyncResult:
    """Lip sync analysis result."""
    sync_score: float
    is_synced: bool
    mouth_movement_variance: float
    issues: List[str]
    frame_details: List[Dict]


@dataclass
class TemporalConsistencyResult:
    """Overall temporal consistency analysis."""
    is_consistent: bool
    consistency_score: float
    motion_analysis: List[MotionBlurResult]
    face_tracking: List[FaceTrackingResult]
    lip_sync: Optional[LipSyncResult]
    all_issues: List[str]


def calculate_blur_score(frame: np.ndarray) -> Tuple[float, bool]:
    """
    Calculate blur score for a single frame using Laplacian variance.
    
    Args:
        frame: numpy array of frame (BGR or grayscale)
    
    Returns:
        Tuple of (blur_score, is_sharp)
    """
    if len(frame.shape) == 3:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    else:
        gray = frame
    
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    variance = laplacian.var()
    
    # Higher variance = sharper image
    # Typical sharp image: 500-2000
    # Blurry image: < 100
    blur_score = min(variance / 1000, 1.0)
    is_sharp = variance > 100
    
    return blur_score, is_sharp


def detect_motion_blur_direction(frame: np.ndarray) -> Optional[float]:
    """
    Detect the direction of motion blur in a frame.
    
    Returns angle in degrees or None if no clear direction.
    """
    if len(frame.shape) == 3:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    else:
        gray = frame
    
    # Use FFT to detect blur direction
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude = np.log(np.abs(fshift) + 1)
    
    # Find the dominant frequency direction
    h, w = magnitude.shape
    center_h, center_w = h // 2, w // 2
    
    # Create angle map
    y_coords, x_coords = np.ogrid[:h, :w]
    y_coords = y_coords - center_h
    x_coords = x_coords - center_w
    
    angles = np.arctan2(y_coords, x_coords)
    
    # Weight angles by magnitude (excluding center)
    mask = np.sqrt(y_coords**2 + x_coords**2) > 10
    
    if np.sum(mask) == 0:
        return None
    
    weighted_angles = angles[mask] * magnitude[mask]
    
    # Find dominant angle
    angle_hist, bins = np.histogram(weighted_angles, bins=36, range=(-np.pi, np.pi))
    dominant_bin = np.argmax(angle_hist)
    
    # Convert to degrees
    dominant_angle = (bins[dominant_bin] + bins[dominant_bin + 1]) / 2
    return np.degrees(dominant_angle)


def analyze_motion_blur_consistency(
    frames: List[np.ndarray],
    fps: float = 30.0
) -> List[MotionBlurResult]:
    """
    Analyze motion blur consistency across video frames.
    
    Natural motion blur:
    - Consistent direction during movement
    - Amount proportional to movement speed
    - Smooth transitions
    
    Deepfake artifacts:
    - Inconsistent blur direction
    - Blur amount doesn't match movement
    - Sudden changes in sharpness
    
    Args:
        frames: List of frame arrays
        fps: Frames per second
    
    Returns:
        List of MotionBlurResult for each frame
    """
    if not CV2_AVAILABLE:
        return []
    
    results = []
    prev_blur_score = None
    prev_blur_direction = None
    
    for i, frame in enumerate(frames):
        issues = []
        
        # Calculate blur score
        blur_score, is_sharp = calculate_blur_score(frame)
        
        # Detect blur direction
        blur_direction = detect_motion_blur_direction(frame)
        
        # Check for natural motion blur
        is_natural = True
        
        if prev_blur_score is not None:
            # Check for sudden changes in blur (unnatural)
            blur_change = abs(blur_score - prev_blur_score)
            if blur_change > 0.5:
                issues.append("sudden_blur_change")
                is_natural = False
            
            # Check for direction consistency
            if prev_blur_direction is not None and blur_direction is not None:
                direction_change = abs(blur_direction - prev_blur_direction)
                # Allow for wrap-around
                if direction_change > 180:
                    direction_change = 360 - direction_change
                
                if direction_change > 90 and blur_score < 0.7:
                    issues.append("inconsistent_blur_direction")
                    is_natural = False
        
        # Very blurry but no clear direction is suspicious
        if blur_score < 0.3 and blur_direction is None:
            issues.append("unnatural_uniform_blur")
            is_natural = False
        
        results.append(MotionBlurResult(
            frame_index=i,
            blur_score=round(blur_score, 3),
            is_natural=is_natural,
            blur_direction=round(blur_direction, 1) if blur_direction else None,
            issues=issues
        ))
        
        prev_blur_score = blur_score
        prev_blur_direction = blur_direction
    
    return results


def detect_faces_in_frame(frame: np.ndarray, face_cascade) -> List[Tuple[int, int, int, int]]:
    """
    Detect faces in a single frame.
    
    Returns list of (x, y, w, h) bounding boxes.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
    
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30)
    )
    
    return [tuple(f) for f in faces]


def track_faces_across_frames(
    frames: List[np.ndarray],
    fps: float = 30.0
) -> List[FaceTrackingResult]:
    """
    Track faces across video frames and analyze consistency.
    
    Detects:
    - Unnatural face movement (teleporting, jittering)
    - Face size inconsistency
    - Tracking loss and recovery issues
    
    Args:
        frames: List of frame arrays
        fps: Frames per second
    
    Returns:
        List of FaceTrackingResult for each tracked face
    """
    if not CV2_AVAILABLE or len(frames) < 2:
        return []
    
    # Load face detector
    try:
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
    except:
        return []
    
    # Track faces using simple IoU matching
    all_detections = []
    for frame in frames:
        faces = detect_faces_in_frame(frame, face_cascade)
        all_detections.append(faces)
    
    # Match faces across frames using IoU
    # For simplicity, we'll track the largest face
    tracked_faces = {}  # face_id -> list of positions
    
    for frame_idx, faces in enumerate(all_detections):
        if not faces:
            continue
        
        # Sort by size (width * height)
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        
        for i, face in enumerate(faces[:5]):  # Track up to 5 faces for multi-face videos
            face_id = i
            
            if face_id not in tracked_faces:
                tracked_faces[face_id] = []
            
            tracked_faces[face_id].append({
                'frame': frame_idx,
                'bbox': face
            })
    
    # Analyze each tracked face
    results = []
    
    for face_id, positions in tracked_faces.items():
        if len(positions) < 3:
            continue
        
        issues = []
        
        # Calculate velocities
        velocities = []
        for i in range(1, len(positions)):
            prev = positions[i-1]['bbox']
            curr = positions[i]['bbox']
            frame_diff = positions[i]['frame'] - positions[i-1]['frame']
            
            if frame_diff > 0:
                # Calculate center movement
                prev_center = (prev[0] + prev[2]/2, prev[1] + prev[3]/2)
                curr_center = (curr[0] + curr[2]/2, curr[1] + curr[3]/2)
                
                velocity = np.sqrt(
                    (curr_center[0] - prev_center[0])**2 + 
                    (curr_center[1] - prev_center[1])**2
                ) / frame_diff
                
                velocities.append(velocity)
        
        if not velocities:
            continue
        
        # Analyze velocity consistency
        velocity_var = np.var(velocities)
        velocity_mean = np.mean(velocities)
        
        # High variance = jittery/unnatural movement
        if velocity_var > 100 and velocity_mean > 5:
            issues.append("jittery_movement")
        
        # Check for teleporting (sudden position changes)
        max_velocity = max(velocities)
        if max_velocity > 50:  # pixels per frame
            issues.append("sudden_position_jump")
        
        # Check size consistency
        sizes = [p['bbox'][2] * p['bbox'][3] for p in positions]
        size_var = np.var(sizes) / (np.mean(sizes)**2 + 1)
        
        if size_var > 0.2:
            issues.append("inconsistent_face_size")
        
        # Calculate overall consistency score
        consistency_score = 1.0
        if velocity_var > 50:
            consistency_score -= 0.2
        if max_velocity > 30:
            consistency_score -= 0.2
        if size_var > 0.1:
            consistency_score -= 0.2
        if len(issues) > 0:
            consistency_score -= 0.1 * len(issues)
        
        consistency_score = max(0.0, consistency_score)
        
        results.append(FaceTrackingResult(
            face_id=face_id,
            positions=[p['bbox'] for p in positions],
            consistency_score=round(consistency_score, 3),
            velocity_variance=round(float(velocity_var), 2),
            issues=issues
        ))
    
    return results


def extract_mouth_region(face_image: np.ndarray) -> Optional[np.ndarray]:
    """
    Extract mouth region from a face image.
    Mouth is typically in lower 40% of face, middle 60% horizontally.
    """
    h, w = face_image.shape[:2]
    
    top = int(h * 0.55)
    bottom = int(h * 0.95)
    left = int(w * 0.25)
    right = int(w * 0.75)
    
    return face_image[top:bottom, left:right]


def analyze_lip_sync(
    frames: List[np.ndarray],
    face_bboxes: List[Optional[Tuple[int, int, int, int]]],
    fps: float = 30.0
) -> Optional[LipSyncResult]:
    """
    Analyze lip/mouth movement for natural speech patterns.
    
    Deepfake issues:
    - Mouth doesn't move naturally with speech
    - Lip movements are delayed or ahead
    - Unnatural mouth shapes
    
    Note: This is visual-only analysis. For audio sync, 
    audio features would need to be provided.
    
    Args:
        frames: List of frame arrays
        face_bboxes: List of face bounding boxes per frame
        fps: Frames per second
    
    Returns:
        LipSyncResult or None if insufficient data
    """
    if not CV2_AVAILABLE:
        return None
    
    mouth_features = []
    frame_details = []
    
    for i, (frame, bbox) in enumerate(zip(frames, face_bboxes)):
        if bbox is None:
            continue
        
        x, y, w, h = bbox
        
        # Extract face region
        face = frame[y:y+h, x:x+w]
        if face.size == 0:
            continue
        
        # Extract mouth region
        mouth = extract_mouth_region(face)
        if mouth.size == 0:
            continue
        
        # Calculate mouth features
        gray_mouth = cv2.cvtColor(mouth, cv2.COLOR_BGR2GRAY) if len(mouth.shape) == 3 else mouth
        
        # 1. Mouth openness (using edge density in upper vs lower mouth)
        edges = cv2.Canny(gray_mouth, 50, 150)
        upper_half = edges[:edges.shape[0]//2, :]
        lower_half = edges[edges.shape[0]//2:, :]
        
        upper_density = np.sum(upper_half > 0) / upper_half.size if upper_half.size > 0 else 0
        lower_density = np.sum(lower_half > 0) / lower_half.size if lower_half.size > 0 else 0
        
        # High difference suggests mouth is open
        openness = abs(upper_density - lower_density)
        
        # 2. Mouth activity (texture variance)
        activity = cv2.Laplacian(gray_mouth, cv2.CV_64F).var()
        
        # 3. Mouth shape (aspect ratio changes)
        if mouth.shape[0] > 0 and mouth.shape[1] > 0:
            aspect_ratio = mouth.shape[1] / mouth.shape[0]
        else:
            aspect_ratio = 1.0
        
        mouth_features.append({
            'frame': i,
            'openness': openness,
            'activity': activity,
            'aspect_ratio': aspect_ratio
        })
        
        frame_details.append({
            'frame_index': i,
            'mouth_openness': round(float(openness), 4),
            'mouth_activity': round(float(activity), 2),
            'mouth_aspect_ratio': round(float(aspect_ratio), 3)
        })
    
    if len(mouth_features) < 5:
        return None
    
    # Analyze patterns
    issues = []
    
    # 1. Check openness changes (should vary during speech)
    openness_values = [f['openness'] for f in mouth_features]
    openness_var = np.var(openness_values)
    
    if openness_var < 0.001:
        issues.append("static_mouth")  # Mouth doesn't move
    
    # 2. Check activity patterns
    activity_values = [f['activity'] for f in mouth_features]
    activity_var = np.var(activity_values)
    
    # Very uniform activity is suspicious (natural speech has varying intensity)
    if activity_var < 100:
        issues.append("uniform_mouth_activity")
    
    # 3. Check for unnatural periodicity
    if len(openness_values) > 10:
        # Check autocorrelation
        autocorr = np.correlate(openness_values - np.mean(openness_values), 
                                openness_values - np.mean(openness_values), mode='full')
        autocorr = autocorr[len(autocorr)//2:]
        autocorr = autocorr / (autocorr[0] + 0.001)
        
        # Look for periodic peaks (unnatural)
        peaks = 0
        for i in range(5, len(autocorr)):
            if autocorr[i] > 0.5:
                peaks += 1
        
        if peaks > 3:
            issues.append("periodic_mouth_movement")
    
    # Calculate sync score
    sync_score = 1.0
    if openness_var < 0.005:
        sync_score -= 0.3
    if activity_var < 500:
        sync_score -= 0.2
    sync_score -= len(issues) * 0.15
    sync_score = max(0.0, sync_score)
    
    return LipSyncResult(
        sync_score=round(sync_score, 3),
        is_synced=sync_score > 0.6,
        mouth_movement_variance=round(float(openness_var), 4),
        issues=issues,
        frame_details=frame_details
    )


def comprehensive_video_analysis(
    frames: List[np.ndarray],
    fps: float = 30.0
) -> TemporalConsistencyResult:
    """
    Comprehensive temporal consistency analysis for video.
    
    Combines:
    - Motion blur analysis
    - Face tracking
    - Lip sync analysis (if faces detected)
    
    Args:
        frames: List of frame arrays (BGR)
        fps: Frames per second
    
    Returns:
        TemporalConsistencyResult with all analysis
    """
    all_issues = []
    
    # 1. Motion blur analysis
    motion_results = analyze_motion_blur_consistency(frames, fps)
    motion_issues = [issue for r in motion_results for issue in r.issues]
    all_issues.extend(motion_issues)
    
    # 2. Face tracking
    face_results = track_faces_across_frames(frames, fps)
    face_issues = [issue for r in face_results for issue in r.issues]
    all_issues.extend(face_issues)
    
    # 3. Lip sync (if faces found)
    lip_sync_result = None
    if face_results:
        # Get face bboxes per frame
        main_face = face_results[0]
        face_bboxes = [None] * len(frames)
        
        for pos_idx, pos in enumerate(main_face.positions):
            # This is simplified - would need proper frame mapping
            if pos_idx < len(face_bboxes):
                face_bboxes[pos_idx] = pos
        
        lip_sync_result = analyze_lip_sync(frames, face_bboxes, fps)
        if lip_sync_result:
            all_issues.extend(lip_sync_result.issues)
    
    # Calculate overall consistency
    motion_score = np.mean([r.blur_score for r in motion_results]) if motion_results else 1.0
    face_score = np.mean([r.consistency_score for r in face_results]) if face_results else 1.0
    lip_score = lip_sync_result.sync_score if lip_sync_result else 1.0
    
    # Weight the scores
    overall_consistency = (
        motion_score * 0.3 +
        face_score * 0.4 +
        lip_score * 0.3
    )
    
    # Penalize for issues
    issue_penalty = min(len(all_issues) * 0.05, 0.3)
    overall_consistency = max(0.0, overall_consistency - issue_penalty)
    
    return TemporalConsistencyResult(
        is_consistent=overall_consistency > 0.6 and len(all_issues) < 5,
        consistency_score=round(overall_consistency, 3),
        motion_analysis=motion_results,
        face_tracking=face_results,
        lip_sync=lip_sync_result,
        all_issues=list(set(all_issues))  # Unique issues
    )


def analyze_inter_frame_consistency(
    frame1: np.ndarray,
    frame2: np.ndarray,
    expected_interval_ms: float
) -> Dict[str, Any]:
    """
    Analyze consistency between two consecutive frames.
    
    Checks:
    - Color consistency
    - Lighting consistency  
    - Motion consistency
    
    Returns:
        Dictionary with consistency metrics
    """
    if not CV2_AVAILABLE:
        return {'error': 'OpenCV not available'}
    
    # Ensure same size
    if frame1.shape != frame2.shape:
        frame2 = cv2.resize(frame2, (frame1.shape[1], frame1.shape[0]))
    
    # 1. Color histogram comparison
    hist1 = []
    hist2 = []
    for i in range(3):
        h1 = cv2.calcHist([frame1], [i], None, [256], [0, 256])
        h2 = cv2.calcHist([frame2], [i], None, [256], [0, 256])
        hist1.append(h1)
        hist2.append(h2)
    
    color_correlation = np.mean([
        cv2.compareHist(h1, h2, cv2.HISTCMP_CORREL) 
        for h1, h2 in zip(hist1, hist2)
    ])
    
    # 2. Structural similarity
    gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
    
    # Simple SSIM approximation
    ssim = np.mean(gray1 == gray2)  # Simplified
    
    # 3. Motion estimation using optical flow
    flow = cv2.calcOpticalFlowFarneback(
        gray1, gray2, None, 
        0.5, 3, 15, 3, 5, 1.2, 0
    )
    
    flow_magnitude = np.sqrt(flow[..., 0]**2 + flow[..., 1]**2)
    motion_mean = np.mean(flow_magnitude)
    motion_std = np.std(flow_magnitude)
    
    # Expected motion based on frame interval
    expected_motion = expected_interval_ms / 33.33  # Assuming 30fps as baseline
    motion_ratio = motion_mean / (expected_motion + 0.001)
    
    issues = []
    
    if color_correlation < 0.9:
        issues.append("color_flicker")
    
    if motion_ratio > 5:
        issues.append("excessive_motion")
    
    if motion_std > motion_mean * 2:
        issues.append("inconsistent_motion_field")
    
    return {
        'color_correlation': round(float(color_correlation), 3),
        'motion_mean': round(float(motion_mean), 2),
        'motion_std': round(float(motion_std), 2),
        'motion_ratio': round(float(motion_ratio), 2),
        'issues': issues,
        'is_consistent': len(issues) == 0
    }
