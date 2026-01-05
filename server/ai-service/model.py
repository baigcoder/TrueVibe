"""
Advanced Deepfake Detection Model v8
Enhanced with: FFT Frequency Analysis, Color Consistency, Noise Patterns, Multi-Scale Analysis
NEW in v8: Accuracy improvements - multi-face consistency, filter compensation, GAN fingerprint boost
"""

import os
import time
import torch
import tempfile
import numpy as np
from PIL import Image, ImageOps, ImageEnhance, ImageFilter
from transformers import AutoImageProcessor, SiglipForImageClassification
from typing import Dict, Tuple, List, Optional, Union
import requests
from io import BytesIO

# Try to import OpenCV for video support
try:
    import cv2
    VIDEO_SUPPORT = True
except ImportError:
    VIDEO_SUPPORT = False
    print("⚠️ OpenCV not installed - video support disabled")

# Import new enhancement modules
try:
    from visual_annotations import (
        create_full_annotated_image,
        ManipulationRegion,
        ArtifactMarker,
        image_to_base64
    )
    ANNOTATIONS_AVAILABLE = True
except ImportError:
    ANNOTATIONS_AVAILABLE = False
    print("⚠️ Visual annotations module not available")

try:
    from ai_art_detector import (
        comprehensive_no_face_analysis,
        detect_ai_art_signature,
        AIGenerator
    )
    AI_ART_DETECTION_AVAILABLE = True
except ImportError:
    AI_ART_DETECTION_AVAILABLE = False
    print("⚠️ AI art detection module not available")

try:
    from video_analyzer import (
        comprehensive_video_analysis,
        analyze_motion_blur_consistency
    )
    VIDEO_ANALYSIS_AVAILABLE = True
except ImportError:
    VIDEO_ANALYSIS_AVAILABLE = False
    print("⚠️ Video analysis module not available")

# NEW: Stylization detector for 3D renders, cartoons, animated content
try:
    from stylization_detector import (
        detect_stylization,
        quick_stylization_check,
        StyleType
    )
    STYLIZATION_DETECTION_AVAILABLE = True
except ImportError:
    STYLIZATION_DETECTION_AVAILABLE = False
    print("⚠️ Stylization detection module not available")

# Debug images directory (for PDF reports)
DEBUG_DIR = os.path.join(os.path.dirname(__file__), "debug_images")
os.makedirs(DEBUG_DIR, exist_ok=True)

# Model configuration
MODEL_PATH = os.environ.get(
    "MODEL_PATH", 
    "models/deepfake-detector-model-v1"
)
HUGGINGFACE_MODEL_ID = "prithivMLmods/deepfake-detector-model-v1"

# Label mapping
ID2LABEL = {0: "fake", 1: "real"}

# Detection thresholds (calibrated for v8 accuracy)
FAKE_THRESHOLD = 0.55           # Stricter threshold for fake classification
SUSPICIOUS_THRESHOLD = 0.38     # Catch edge cases earlier
AUTHENTIC_BOOST = 0.15          # Boost for natural content with no anomalies
GAN_FINGERPRINT_BOOST = 0.12    # Extra boost when GAN patterns detected

# Debug folder
DEBUG_DIR = os.path.join(os.path.dirname(__file__), "debug_images")

# Railway Hobby Package - ADVANCED MODE (8GB RAM)
# Set to 'false' for production-ready advanced analysis
LIGHTWEIGHT_MODE = os.environ.get("LIGHTWEIGHT_MODE", "false").lower() == "true"

# Video settings - PRODUCTION QUALITY
VIDEO_FRAME_COUNT = 4 if LIGHTWEIGHT_MODE else 12  # More frames for better temporal analysis
VIDEO_TEMPORAL_WEIGHT = 1.3
VIDEO_MAX_DURATION = 120  # Support up to 2-minute videos
VIDEO_MAX_RESOLUTION = 480 if LIGHTWEIGHT_MODE else 720  # 720p for better quality

# Face detection settings - HIGH SENSITIVITY
FACE_MARGIN = 0.25 if LIGHTWEIGHT_MODE else 0.35  # More context around faces
MIN_FACE_SIZE = 50 if LIGHTWEIGHT_MODE else 30  # Detect smaller faces
FACE_CONFIDENCE_THRESHOLD = 0.55  # Slightly lower threshold for better coverage

# Processing settings - PRODUCTION QUALITY
MULTI_SCALE_SIZES = [1.0] if LIGHTWEIGHT_MODE else [1.0, 0.85, 0.7]  # 3-scale analysis
FREQUENCY_WEIGHT = 1.5 if LIGHTWEIGHT_MODE else 2.0  # Stronger FFT weight
COLOR_WEIGHT = 1.2 if LIGHTWEIGHT_MODE else 1.6  # Better color analysis
SHARPEN_STRENGTH = 1.3 if LIGHTWEIGHT_MODE else 1.6  # Enhanced sharpening
HIST_EQUALIZE = not LIGHTWEIGHT_MODE  # Enable histogram equalization

# Memory management - PRODUCTION SETTINGS
MAX_IMAGE_SIZE = 1024 if LIGHTWEIGHT_MODE else 2560  # Support 2K images
BATCH_SIZE = 1 if LIGHTWEIGHT_MODE else 4  # Process multiple frames


class MediaType:
    IMAGE = "image"
    VIDEO = "video"


class FaceInfo:
    """Information about a detected face."""
    def __init__(self, bbox: Tuple[int, int, int, int], confidence: float, index: int):
        # Convert to native Python types to avoid numpy serialization issues
        self.bbox = tuple(int(x) for x in bbox)
        self.confidence = float(confidence)
        self.index = int(index)
        self.fake_score = 0.0
        self.real_score = 0.0
    
    @property
    def size(self) -> int:
        """Calculate face area (width * height) for size tracking."""
        return int(self.bbox[2] * self.bbox[3])
    
    @property
    def center(self) -> Tuple[float, float]:
        """Get center point of face bbox."""
        x, y, w, h = self.bbox
        return (x + w / 2, y + h / 2)


class DeepfakeDetector:
    """
    Production-ready Deepfake Detection v7.
    
    NEW in v7:
    - Enhanced GAN fingerprint detection in FFT analysis
    - Multi-detector face ensemble (Haar + DNN fallback)
    - Media download caching with LRU eviction
    - Improved retry logic with exponential backoff
    - GPU acceleration when available
    - Performance optimizations for video processing
    """
    
    # Class-level cache for downloaded media (LRU with TTL)
    _media_cache = {}
    _cache_max_size = 50  # Max items in cache
    _cache_ttl = 300  # Cache TTL in seconds (5 minutes)
    
    def __init__(self):
        self.model = None
        self.processor = None
        
        # Device selection - prefer GPU if available
        self.device = self._select_device()
        
        self._loaded = False
        self.optimal_size = 384  # Reduced from 512 for performance
        self.face_cascade = None
        self._face_detector_loaded = False
        self.dnn_net = None
        self._dnn_detector_loaded = False
        
        # Performance tracking
        self._perf_stats = {
            'cache_hits': 0,
            'cache_misses': 0,
            'total_analyses': 0,
            'avg_analysis_time': 0.0
        }
    
    def _select_device(self) -> str:
        """Select best available compute device."""
        try:
            if torch.cuda.is_available():
                device = "cuda"
                print(f"   🚀 GPU Detected: {torch.cuda.get_device_name(0)}")
                return device
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                print("   🚀 Apple MPS Detected")
                return "mps"
        except Exception:
            pass
        return "cpu"
    
    def _get_cached_media(self, url: str) -> bytes:
        """Get media from cache if available and not expired."""
        import time as time_module
        
        cache_key = hash(url)
        if cache_key in self._media_cache:
            cached_data, cached_time = self._media_cache[cache_key]
            if time_module.time() - cached_time < self._cache_ttl:
                self._perf_stats['cache_hits'] += 1
                print(f"   📦 Cache hit")
                return cached_data
            else:
                # Expired
                del self._media_cache[cache_key]
        
        self._perf_stats['cache_misses'] += 1
        return None
    
    def _set_cached_media(self, url: str, data: bytes) -> None:
        """Store media in cache with eviction if needed."""
        import time as time_module
        
        # Evict oldest entries if cache is full
        if len(self._media_cache) >= self._cache_max_size:
            oldest_key = min(self._media_cache.keys(), 
                           key=lambda k: self._media_cache[k][1])
            del self._media_cache[oldest_key]
        
        cache_key = hash(url)
        self._media_cache[cache_key] = (data, time_module.time())
        
    def load_model(self) -> None:
        """Load the detection model and face detector."""
        if self._loaded:
            return
        
        print(f"🔄 Loading Deepfake Detection Model v7...")
        print(f"   Device: {self.device}")
        print(f"   Video Support: {'✅ Enabled' if VIDEO_SUPPORT else '❌ Disabled'}")
        print(f"   Lightweight Mode: {'✅ ON (Railway optimized)' if LIGHTWEIGHT_MODE else '❌ OFF (Full quality)'}")
        print(f"   Video Frames: {VIDEO_FRAME_COUNT} | Max Resolution: {VIDEO_MAX_RESOLUTION}p")
        
        if os.path.exists(MODEL_PATH):
            print(f"   Source: Local")
            self.model = SiglipForImageClassification.from_pretrained(MODEL_PATH)
            self.processor = AutoImageProcessor.from_pretrained(MODEL_PATH)
        else:
            print(f"   Source: HuggingFace")
            self.model = SiglipForImageClassification.from_pretrained(HUGGINGFACE_MODEL_ID)
            self.processor = AutoImageProcessor.from_pretrained(HUGGINGFACE_MODEL_ID)
        
        self.model.to(self.device)
        self.model.eval()
        self._loaded = True
        
        self._load_face_detector()
        
        print("✅ Model ready! (v7 Enhanced Detection)\n")
    
    def _load_face_detector(self) -> None:
        """Load multi-detector face detection ensemble.
        
        Strategy:
        1. Primary: Haar Cascade (fast, works well for frontal faces)
        2. Fallback: DNN-based detector (more robust but slower)
        """
        if not VIDEO_SUPPORT:
            print("   ⚠️ Face detection requires OpenCV")
            return
            
        self._dnn_detector_loaded = False
        
        try:
            # === PRIMARY: Haar Cascade ===
            cascades = [
                "haarcascade_frontalface_default.xml",
                "haarcascade_frontalface_alt2.xml",
                "haarcascade_frontalface_alt.xml"
            ]
            
            for cascade in cascades:
                path = cv2.data.haarcascades + cascade
                self.face_cascade = cv2.CascadeClassifier(path)
                if not self.face_cascade.empty():
                    self._face_detector_loaded = True
                    print(f"   ✅ Primary Detector: {cascade}")
                    break
            
            if not self._face_detector_loaded:
                print("   ⚠️ Haar Cascade: Failed to load")
            
            # === FALLBACK: DNN-based detector ===
            # Try to load OpenCV's DNN-based face detector (more robust)
            try:
                # This uses a pre-trained Caffe model for face detection
                prototxt_url = "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt"
                caffemodel_url = "https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel"
                
                # Check if we have the DNN model cached locally
                dnn_cache_dir = os.path.join(os.path.dirname(__file__), ".dnn_cache")
                prototxt_path = os.path.join(dnn_cache_dir, "deploy.prototxt")
                caffemodel_path = os.path.join(dnn_cache_dir, "res10_300x300_ssd_iter_140000.caffemodel")
                
                if os.path.exists(prototxt_path) and os.path.exists(caffemodel_path):
                    self.dnn_net = cv2.dnn.readNetFromCaffe(prototxt_path, caffemodel_path)
                    self._dnn_detector_loaded = True
                    print("   ✅ Fallback Detector: DNN SSD (cached)")
                # Only download if models don't exist - skip for now to avoid network issues
                elif False:  # Disabled auto-download
                    os.makedirs(dnn_cache_dir, exist_ok=True)
                    # Download would happen here
                    pass
                    
            except Exception as e:
                # DNN fallback not available - that's OK, Haar is sufficient for most cases
                pass
                
        except Exception as e:
            print(f"   ⚠️ Face Detector error: {e}")
    
    # ==================== NEW v5 ANALYSIS METHODS ====================
    
    def analyze_frequency_domain(self, image: Image.Image) -> Image.Image:
        """
        Analyze image in frequency domain using FFT.
        Enhanced with GAN fingerprint detection.
        
        Deepfakes/AI images have characteristic patterns:
        - Periodic high-frequency artifacts from convolution operations
        - Unusual spectral peaks from GAN architecture
        - Abnormal radial frequency distribution
        """
        # Convert to grayscale numpy array
        gray = np.array(image.convert('L'), dtype=np.float32)
        
        # Apply FFT
        f_transform = np.fft.fft2(gray)
        f_shift = np.fft.fftshift(f_transform)
        
        # Get magnitude spectrum
        magnitude = np.abs(f_shift)
        
        # === NEW: GAN Fingerprint Detection ===
        # GAN-generated images often have periodic patterns in high frequencies
        h, w = magnitude.shape
        center_h, center_w = h // 2, w // 2
        
        # Analyze high-frequency region (outer 30% of spectrum)
        high_freq_mask = np.zeros_like(magnitude, dtype=bool)
        for i in range(h):
            for j in range(w):
                dist = np.sqrt((i - center_h)**2 + (j - center_w)**2)
                if dist > min(h, w) * 0.35:
                    high_freq_mask[i, j] = True
        
        # Check for abnormal high-frequency peaks (GAN fingerprint)
        high_freq_values = magnitude[high_freq_mask]
        if len(high_freq_values) > 0:
            high_freq_mean = np.mean(high_freq_values)
            high_freq_std = np.std(high_freq_values)
            
            # Detect periodic peaks (GAN signature)
            # Normal images have smooth high-frequency decay
            # GANs often have discrete peaks from conv layers
            peak_threshold = high_freq_mean + 3 * high_freq_std
            num_peaks = np.sum(high_freq_values > peak_threshold)
            peak_ratio = num_peaks / len(high_freq_values) if len(high_freq_values) > 0 else 0
            
            # Enhance peaks in visualization for the model
            if peak_ratio > 0.01:  # More than 1% peaks indicates possible GAN
                magnitude[high_freq_mask & (magnitude > peak_threshold)] *= 1.5
        
        # === Radial Frequency Analysis ===
        # Real images have natural 1/f falloff; GANs often don't
        radial_profile = []
        max_radius = min(center_h, center_w)
        for r in range(1, max_radius, max_radius // 20):
            ring_mask = np.zeros_like(magnitude, dtype=bool)
            for i in range(h):
                for j in range(w):
                    dist = np.sqrt((i - center_h)**2 + (j - center_w)**2)
                    if r - 2 <= dist <= r + 2:
                        ring_mask[i, j] = True
            if np.any(ring_mask):
                radial_profile.append(np.mean(magnitude[ring_mask]))
        
        # Log transform for visualization
        magnitude_log = np.log(magnitude + 1)
        
        # Normalize to 0-255
        magnitude_norm = (magnitude_log / magnitude_log.max() * 255).astype(np.uint8)
        
        # Convert back to RGB PIL Image
        fft_image = Image.fromarray(magnitude_norm).convert('RGB')
        fft_image = fft_image.resize((self.optimal_size, self.optimal_size), Image.LANCZOS)
        
        return fft_image
    
    def analyze_gan_fingerprint(self, image: Image.Image) -> Tuple[float, dict]:
        """
        Dedicated GAN fingerprint analysis.
        Returns suspicion score (0-1) and analysis details.
        """
        gray = np.array(image.convert('L'), dtype=np.float32)
        
        # FFT analysis
        f_transform = np.fft.fft2(gray)
        f_shift = np.fft.fftshift(f_transform)
        magnitude = np.abs(f_shift)
        
        h, w = magnitude.shape
        center_h, center_w = h // 2, w // 2
        
        # 1. Analyze radial frequency distribution
        radial_bins = 20
        radial_means = []
        for i in range(radial_bins):
            r_min = i * min(center_h, center_w) / radial_bins
            r_max = (i + 1) * min(center_h, center_w) / radial_bins
            ring_values = []
            for y in range(h):
                for x in range(w):
                    dist = np.sqrt((y - center_h)**2 + (x - center_w)**2)
                    if r_min <= dist < r_max:
                        ring_values.append(magnitude[y, x])
            if ring_values:
                radial_means.append(np.mean(ring_values))
        
        # Check for natural 1/f decay (real images) vs flat spectrum (GANs)
        if len(radial_means) > 5:
            # Fit linear regression to log of radial means
            x = np.arange(len(radial_means))
            y = np.log(np.array(radial_means) + 1)
            slope = np.polyfit(x, y, 1)[0]
            
            # Natural images: strong negative slope (1/f decay)
            # GAN images: flatter slope or positive slope
            natural_slope_threshold = -0.1
            is_natural_decay = slope < natural_slope_threshold
        else:
            slope = 0
            is_natural_decay = True
        
        # 2. Detect periodic peaks (GAN convolution artifacts)
        high_freq_region = magnitude[
            int(center_h * 0.7):int(center_h * 1.3),
            int(center_w * 0.7):int(center_w * 1.3)
        ]
        
        mean_val = np.mean(high_freq_region)
        std_val = np.std(high_freq_region)
        peaks = np.sum(high_freq_region > mean_val + 4 * std_val)
        peak_density = peaks / high_freq_region.size if high_freq_region.size > 0 else 0
        
        # 3. Calculate suspicion score
        suspicion = 0.0
        
        # Unnatural frequency decay
        if not is_natural_decay:
            suspicion += 0.4
        
        # High peak density indicates periodic artifacts
        if peak_density > 0.02:
            suspicion += 0.3
        elif peak_density > 0.01:
            suspicion += 0.15
        
        # Very flat spectrum
        if slope > -0.05:
            suspicion += 0.3
        
        return min(suspicion, 1.0), {
            'radial_slope': float(slope),
            'peak_density': float(peak_density),
            'natural_decay': bool(is_natural_decay),
            'suspicious': suspicion > 0.5
        }
    
    def analyze_color_consistency(self, face_image: Image.Image) -> Tuple[float, Image.Image]:
        """
        Check color consistency of face region.
        AI-generated faces often have unnatural color distributions.
        Returns suspicion score and color-analyzed image.
        """
        img_array = np.array(face_image)
        
        # Convert to LAB color space for better skin analysis
        lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
        l_channel, a_channel, b_channel = cv2.split(lab)
        
        # Analyze color distribution variance
        a_std = np.std(a_channel)
        b_std = np.std(b_channel)
        
        # Very low or very high color variance is suspicious
        # Natural faces have moderate variance
        optimal_std = 20.0
        a_deviation = abs(a_std - optimal_std) / optimal_std
        b_deviation = abs(b_std - optimal_std) / optimal_std
        
        suspicion = min(1.0, (a_deviation + b_deviation) / 2)
        
        # Create enhanced color image for analysis
        enhanced = cv2.merge([
            cv2.equalizeHist(l_channel),
            a_channel,
            b_channel
        ])
        enhanced_rgb = cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)
        color_image = Image.fromarray(enhanced_rgb)
        color_image = color_image.resize((self.optimal_size, self.optimal_size), Image.LANCZOS)
        
        return suspicion, color_image
    
    def analyze_noise_pattern(self, image: Image.Image) -> Tuple[float, Image.Image]:
        """
        Analyze noise patterns in the image.
        Real photos have consistent sensor noise; deepfakes often don't.
        """
        img_array = np.array(image.convert('L'), dtype=np.float32)
        
        # Apply high-pass filter to extract noise
        blurred = cv2.GaussianBlur(img_array, (5, 5), 0)
        noise = img_array - blurred
        
        # Analyze noise consistency
        noise_std = np.std(noise)
        noise_mean = np.mean(np.abs(noise))
        
        # Very uniform or very chaotic noise is suspicious
        # Natural noise has specific characteristics
        if noise_std < 3.0:  # Too uniform
            suspicion = 0.7
        elif noise_std > 25.0:  # Too chaotic
            suspicion = 0.5
        else:
            suspicion = 0.0
        
        # Normalize and convert noise to image
        noise_normalized = ((noise - noise.min()) / (noise.max() - noise.min() + 1e-8) * 255).astype(np.uint8)
        noise_image = Image.fromarray(noise_normalized).convert('RGB')
        noise_image = noise_image.resize((self.optimal_size, self.optimal_size), Image.LANCZOS)
        
        return suspicion, noise_image
    
    def detect_screen_content(self, image: Image.Image) -> Tuple[bool, float, dict]:
        """
        Detect if image contains screen/monitor content (gaming, coding, UI).
        
        Screen content has:
        - Rectangular bright areas (monitors)
        - High contrast edges (UI elements, text)
        - Neon/saturated colors (gaming, RGB setups)
        - Consistent backlight glow
        - Text-like patterns
        
        Returns: (is_screen_content, confidence, details)
        """
        img_array = np.array(image)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
        
        indicators = []
        confidence = 0.0
        
        # 1. Check for rectangular bright regions (monitor shapes)
        _, bright_mask = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)
        bright_ratio = np.sum(bright_mask > 0) / bright_mask.size
        if 0.05 < bright_ratio < 0.6:
            # Has distinct bright rectangular areas (like a monitor)
            contours, _ = cv2.findContours(bright_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                if cv2.contourArea(cnt) > 5000:  # Significant bright region
                    x, y, w, h = cv2.boundingRect(cnt)
                    aspect = w / h if h > 0 else 0
                    # Monitor aspect ratios: 16:9 (1.78), 16:10 (1.6), 21:9 (2.33), 4:3 (1.33)
                    if 1.2 < aspect < 2.5 or 0.4 < aspect < 0.85:  # Horizontal or vertical monitor
                        indicators.append("rectangular_bright_area")
                        confidence += 0.2
                        break
        
        # 2. Check for high saturation neon colors (RGB gaming, neon UI)
        saturation = hsv[:, :, 1]
        high_sat_ratio = np.sum(saturation > 180) / saturation.size
        if high_sat_ratio > 0.08:
            indicators.append("neon_colors")
            confidence += 0.15
        
        # 3. Check for very dark background with bright spots (typical setup)
        dark_ratio = np.sum(gray < 40) / gray.size
        if dark_ratio > 0.4 and bright_ratio > 0.1:
            indicators.append("dark_background_bright_spots")
            confidence += 0.2
        
        # 4. Check for sharp edges (UI elements, text)
        edges = cv2.Canny(gray, 50, 150)
        edge_ratio = np.sum(edges > 0) / edges.size
        if edge_ratio > 0.08:
            indicators.append("high_edge_density")
            confidence += 0.15
        
        # 5. Check for horizontal/vertical line dominance (UI grids, code)
        sobel_h = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        sobel_v = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        h_energy = np.sum(np.abs(sobel_h))
        v_energy = np.sum(np.abs(sobel_v))
        
        # Strong horizontal or vertical patterns
        if max(h_energy, v_energy) / (min(h_energy, v_energy) + 1) > 1.8:
            indicators.append("grid_pattern")
            confidence += 0.1
        
        # 6. Check for uniform color blocks (solid UI backgrounds)
        # Divide image into blocks and check color uniformity
        block_size = 32
        h, w = gray.shape
        uniform_blocks = 0
        total_blocks = 0
        for y in range(0, h - block_size, block_size):
            for x in range(0, w - block_size, block_size):
                block = gray[y:y+block_size, x:x+block_size]
                if np.std(block) < 10:  # Very uniform block
                    uniform_blocks += 1
                total_blocks += 1
        
        if total_blocks > 0:
            uniform_ratio = uniform_blocks / total_blocks
            if uniform_ratio > 0.15:
                indicators.append("uniform_color_blocks")
                confidence += 0.15
        
        # Determine if it's screen content
        is_screen = confidence >= 0.35 or len(indicators) >= 3
        
        details = {
            'is_screen_content': is_screen,
            'confidence': min(confidence, 0.95),
            'indicators': indicators,
            'bright_ratio': round(bright_ratio, 3),
            'dark_ratio': round(dark_ratio, 3),
            'edge_density': round(edge_ratio, 3),
            'neon_ratio': round(high_sat_ratio, 3)
        }
        
        return is_screen, min(confidence, 0.95), details
    
    def extract_eye_region(self, face_image: Image.Image) -> Optional[Image.Image]:
        """
        Extract eye region from face - highest manipulation area in deepfakes.
        """
        w, h = face_image.size
        
        # Eye region is typically in upper-middle of face
        eye_top = int(h * 0.2)
        eye_bottom = int(h * 0.45)
        eye_left = int(w * 0.1)
        eye_right = int(w * 0.9)
        
        eye_region = face_image.crop((eye_left, eye_top, eye_right, eye_bottom))
        eye_region = eye_region.resize((self.optimal_size, self.optimal_size), Image.LANCZOS)
        
        return eye_region
    
    def extract_mouth_region(self, face_image: Image.Image) -> Optional[Image.Image]:
        """
        Extract mouth region from face - second highest manipulation area.
        """
        w, h = face_image.size
        
        # Mouth region is typically in lower-middle of face
        mouth_top = int(h * 0.55)
        mouth_bottom = int(h * 0.85)
        mouth_left = int(w * 0.2)
        mouth_right = int(w * 0.8)
        
        mouth_region = face_image.crop((mouth_left, mouth_top, mouth_right, mouth_bottom))
        mouth_region = mouth_region.resize((self.optimal_size, self.optimal_size), Image.LANCZOS)
        
        return mouth_region
    
    def detect_face_type(self, face_image: Image.Image) -> Tuple[str, float]:
        """
        Detect if face is:
        - 'photographic': Real photo of human face
        - 'animated': Cartoon/anime/illustrated face
        - 'ai_generated': AI-generated (smooth, perfect gradients)
        
        Returns (face_type, confidence)
        """
        img_array = np.array(face_image)
        
        # 1. Check gradient complexity (AI and animated have smoother gradients)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        gradient_mag = np.sqrt(sobel_x**2 + sobel_y**2)
        gradient_complexity = np.std(gradient_mag)
        
        # 2. Check color saturation distribution
        hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
        saturation = hsv[:, :, 1]
        sat_mean = np.mean(saturation)
        sat_std = np.std(saturation)
        
        # 3. Analyze skin tone realism
        # Convert to LAB for better skin analysis
        lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
        l_channel = lab[:, :, 0]
        a_channel = lab[:, :, 1]  # Green-red
        b_channel = lab[:, :, 2]  # Blue-yellow
        
        # Natural skin has moderate a-channel values (120-160)
        # Animated faces often have extreme or uniform values
        a_in_skin_range = np.sum((a_channel > 120) & (a_channel < 160)) / a_channel.size
        
        # 4. Check for sharp color boundaries (common in cartoons)
        edges = cv2.Canny(img_array, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        
        # 5. Texture variance (photos have more micro-texture)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Decision logic
        animated_score = 0.0
        ai_score = 0.0
        photo_score = 0.0
        
        # High saturation + sharp edges = likely animated
        if sat_mean > 100 and edge_density > 0.08:
            animated_score += 0.4
        
        # Very uniform gradients = AI generated
        if gradient_complexity < 30:
            ai_score += 0.3
        
        # Low texture variance = AI or animated
        if laplacian_var < 200:
            ai_score += 0.2
            animated_score += 0.2
        
        # Natural skin presence = likely photo
        if a_in_skin_range > 0.15:
            photo_score += 0.4
        
        # High texture variance = likely photo
        if laplacian_var > 500:
            photo_score += 0.3
        
        # Moderate, realistic saturation = likely photo
        if 40 < sat_mean < 100 and sat_std > 20:
            photo_score += 0.3
        
        scores = {
            'photographic': photo_score,
            'animated': animated_score,
            'ai_generated': ai_score
        }
        
        face_type = max(scores, key=scores.get)
        confidence = scores[face_type]
        
        return face_type, confidence
    
    def analyze_skin_naturalness(self, face_image: Image.Image) -> Tuple[float, str]:
        """
        Analyze if skin looks natural or AI-generated.
        AI skin is often too smooth, too uniform, or has subtle periodic patterns.
        Returns (suspicion_score, reason)
        """
        img_array = np.array(face_image)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        
        # 1. Check for excessive smoothness (low high-frequency content)
        blurred = cv2.GaussianBlur(gray, (7, 7), 0)
        high_freq = cv2.absdiff(gray, blurred)
        hf_energy = np.mean(high_freq)
        
        # 2. Check for pore-like textures (present in real skin)
        # Use morphological operations to detect small bright spots
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, kernel)
        pore_density = np.sum(tophat > 20) / tophat.size
        
        # 3. Check for unnatural color uniformity in face region
        hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
        hue_std = np.std(hsv[:, :, 0])
        
        suspicion = 0.0
        reasons = []
        
        # Too smooth
        if hf_energy < 5:
            suspicion += 0.4
            reasons.append("overly smooth skin")
        
        # Missing pores
        if pore_density < 0.01:
            suspicion += 0.3
            reasons.append("no skin texture")
        
        # Too uniform hue
        if hue_std < 8:
            suspicion += 0.2
            reasons.append("uniform coloring")
        
        reason = "; ".join(reasons) if reasons else "natural skin"
        return min(suspicion, 1.0), reason
    
    def detect_social_media_filters(self, image: Image.Image) -> Tuple[float, Dict]:
        """
        Detect Instagram/TikTok/Snapchat beauty filters and effects.
        
        Common filter signatures:
        - Skin smoothing (blur on face region)
        - Eye enlargement (warped geometry)
        - Color grading (shifted color distributions)
        - Vignetting and exposure adjustments
        - Beauty mode (reduced pores, even skin tone)
        
        Returns: (filter_score, details)
        """
        filters_detected = []
        total_score = 0.0
        details = {
            'skin_smoothing': 0.0,
            'color_grading': 0.0,
            'vignette_detected': False,
            'beauty_mode': 0.0,
            'filters_detected': []
        }
        
        try:
            img_array = np.array(image.convert('RGB'))
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
            lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
            
            h, w = gray.shape
            
            # 1. SKIN SMOOTHING DETECTION
            # Filtered images have unusually low texture in face regions
            # while maintaining edge sharpness
            
            # Calculate local texture variation
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            texture = np.abs(gray.astype(float) - blurred.astype(float))
            texture_mean = np.mean(texture)
            
            # Calculate edge sharpness
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / edges.size
            
            # Smoothed skin: low texture BUT sharp edges (unnatural combination)
            if texture_mean < 4.0 and edge_density > 0.03:
                smoothing_score = 0.6 - (texture_mean / 10.0)
                details['skin_smoothing'] = round(smoothing_score, 3)
                filters_detected.append("skin_smoothing")
                total_score += smoothing_score * 0.3
            elif texture_mean < 6.0:
                details['skin_smoothing'] = round((6.0 - texture_mean) / 10.0, 3)
            
            # 2. COLOR GRADING DETECTION
            # Instagram filters often shift color distributions
            
            # Check for unusual hue clustering (color grading)
            hue = hsv[:, :, 0]
            hue_hist, _ = np.histogram(hue, bins=18, range=(0, 180))
            hue_hist = hue_hist / hue_hist.sum()
            
            # Calculate hue entropy (low entropy = strong color grading)
            hue_entropy = -np.sum(hue_hist * np.log(hue_hist + 0.001)) / np.log(18)
            
            if hue_entropy < 0.5:
                grading_score = (0.5 - hue_entropy)
                details['color_grading'] = round(grading_score, 3)
                filters_detected.append("color_grading")
                total_score += grading_score * 0.25
            
            # Check for orange/teal grading (very common filter)
            orange_hue = np.sum((hue > 5) & (hue < 25)) / hue.size
            teal_hue = np.sum((hue > 85) & (hue < 100)) / hue.size
            
            if orange_hue > 0.3 and teal_hue > 0.1:
                filters_detected.append("orange_teal_grading")
                total_score += 0.15
            
            # 3. VIGNETTE DETECTION
            # Measure brightness correlation with distance from center
            center_y, center_x = h // 2, w // 2
            y_coords, x_coords = np.ogrid[:h, :w]
            distances = np.sqrt((y_coords - center_y)**2 + (x_coords - center_x)**2)
            max_dist = np.sqrt(center_x**2 + center_y**2)
            normalized_dist = distances / max_dist
            
            # Flatten for correlation
            brightness = lab[:, :, 0].flatten()
            dist_flat = normalized_dist.flatten()
            
            correlation = np.corrcoef(brightness, dist_flat)[0, 1]
            
            if correlation < -0.15:  # Negative = darker at edges
                details['vignette_detected'] = True
                filters_detected.append("vignette")
                total_score += 0.1
            
            # 4. BEAUTY MODE DETECTION (combines multiple signals)
            # Check for skin tone uniformity (too perfect)
            
            # Detect skin regions using LAB color space
            a_channel = lab[:, :, 1]
            b_channel = lab[:, :, 2]
            
            # Skin mask (typical skin in LAB)
            skin_mask = ((a_channel > 125) & (a_channel < 155) & 
                        (b_channel > 125) & (b_channel < 165))
            
            if np.sum(skin_mask) > 500:
                skin_l = lab[:, :, 0][skin_mask]
                skin_uniformity = 1.0 - (np.std(skin_l) / 30.0)
                skin_uniformity = max(0, min(1, skin_uniformity))
                
                if skin_uniformity > 0.7:
                    details['beauty_mode'] = round(skin_uniformity, 3)
                    filters_detected.append("beauty_mode")
                    total_score += skin_uniformity * 0.2
            
            # 5. SATURATION BOOST DETECTION
            sat = hsv[:, :, 1]
            sat_mean = np.mean(sat)
            sat_variance = np.var(sat)
            
            # High saturation with low variance = filter
            if sat_mean > 120 and sat_variance < 1500:
                filters_detected.append("saturation_boost")
                total_score += 0.15
            
            details['filters_detected'] = filters_detected
            
            return min(total_score, 1.0), details
            
        except Exception as e:
            print(f"   ⚠️ Filter detection failed: {e}")
            return 0.0, {'error': str(e), 'filters_detected': []}
    
    def analyze_image_content_type(self, image: Image.Image) -> Dict:
        """
        Comprehensive content type analysis for smart routing.
        
        Determines:
        - has_face: Boolean
        - face_type: 'photographic', 'animated', 'ai_generated', or None
        - content_type: 'portrait', 'group', 'scene', 'object', 'abstract'
        - has_filter: Boolean
        - filter_intensity: 0.0 - 1.0
        - recommended_analysis: List of analysis methods to apply
        
        """
        result = {
            'has_face': False,
            'face_count': 0,
            'face_type': None,
            'content_type': 'unknown',
            'has_filter': False,
            'filter_intensity': 0.0,
            'filter_details': {},
            'recommended_analysis': []
        }
        
        try:
            # 1. Detect faces
            faces = self.detect_faces(image)
            result['face_count'] = len(faces)
            result['has_face'] = len(faces) > 0
            
            # 2. Determine content type based on face count
            if len(faces) == 0:
                # No faces - analyze scene type
                result['content_type'] = 'scene'
                result['recommended_analysis'] = ['ai_art_detection', 'background_analysis', 'scene_consistency']
                
            elif len(faces) == 1:
                result['content_type'] = 'portrait'
                # Get face type for the primary face
                face_img = self._extract_face(image, faces[0])
                if face_img:
                    face_type, confidence = self.detect_face_type(face_img)
                    result['face_type'] = face_type
                    result['recommended_analysis'] = ['face_analysis', 'eye_region', 'fft_analysis']
                    
            else:
                result['content_type'] = 'group'
                result['recommended_analysis'] = ['multi_face_analysis', 'fft_analysis', 'temporal_consistency']
            
            # 3. Detect filters
            filter_score, filter_details = self.detect_social_media_filters(image)
            result['has_filter'] = filter_score > 0.3
            result['filter_intensity'] = round(filter_score, 3)
            result['filter_details'] = filter_details
            
            # 4. Adjust recommendations if filter detected
            if result['has_filter']:
                result['recommended_analysis'].append('filter_compensation')
            
            return result
            
        except Exception as e:
            print(f"   ⚠️ Content type analysis failed: {e}")
            result['error'] = str(e)
            return result
    
    def _extract_face(self, image: Image.Image, face_info: 'FaceInfo') -> Optional[Image.Image]:
        """Extract face region from image with margin."""
        try:
            x, y, w, h = face_info.bbox
            img_w, img_h = image.size
            
            margin_x = int(w * FACE_MARGIN)
            margin_y = int(h * FACE_MARGIN)
            
            x1 = max(0, x - margin_x)
            y1 = max(0, y - margin_y)
            x2 = min(img_w, x + w + margin_x)
            y2 = min(img_h, y + h + margin_y)
            
            return image.crop((x1, y1, x2, y2))
        except:
            return None
    
    def assess_image_quality(self, image: Image.Image) -> float:
        """
        Assess image quality (0-1). Low quality = less reliable detection.
        Used to adjust confidence in final scoring.
        """
        try:
            gray = np.array(image.convert('L'))
            
            # Check for blur (Laplacian variance) - higher = sharper
            blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
            blur_quality = min(1.0, blur_score / 150.0)  # Normalize to 0-1
            
            # Check resolution - larger = more detail
            w, h = image.size
            resolution_score = min(1.0, (w * h) / (512 * 512))
            
            # Check for JPEG artifacts (high compression = low quality)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            noise = gray.astype(float) - blurred.astype(float)
            noise_std = np.std(noise)
            compression_quality = min(1.0, noise_std / 10.0) if noise_std < 25 else 0.5
            
            # Combined quality score
            quality = (blur_quality * 0.4 + resolution_score * 0.3 + compression_quality * 0.3)
            return round(quality, 3)
            
        except Exception as e:
            print(f"   ⚠️ Quality assessment failed: {e}")
            return 0.5  # Default to medium quality

    # ==================== PHASE 1: ADVANCED DETECTION v7 ====================

    
    def analyze_compression_artifacts(self, image: Image.Image) -> Tuple[float, dict]:
        """
        Detect double JPEG compression which indicates image manipulation.
        Returns suspicion score and analysis details.
        """
        try:
            img_array = np.array(image.convert('L'))  # Convert to grayscale
            
            # Detect JPEG blocking artifacts (8x8 DCT blocks)
            h, w = img_array.shape
            block_size = 8
            
            # Calculate block boundary discontinuities
            horizontal_discontinuity = 0
            vertical_discontinuity = 0
            block_count = 0
            
            for y in range(block_size, h - block_size, block_size):
                for x in range(block_size, w - block_size, block_size):
                    # Horizontal boundary
                    left_block = img_array[y-block_size:y, x-block_size:x].astype(float)
                    right_block = img_array[y-block_size:y, x:x+block_size].astype(float)
                    if left_block.size > 0 and right_block.size > 0:
                        h_diff = np.abs(left_block[:, -1].mean() - right_block[:, 0].mean())
                        horizontal_discontinuity += h_diff
                    
                    # Vertical boundary
                    top_block = img_array[y-block_size:y, x:x+block_size].astype(float)
                    bottom_block = img_array[y:y+block_size, x:x+block_size].astype(float)
                    if top_block.size > 0 and bottom_block.size > 0:
                        v_diff = np.abs(top_block[-1, :].mean() - bottom_block[0, :].mean())
                        vertical_discontinuity += v_diff
                    
                    block_count += 1
            
            if block_count > 0:
                avg_h_disc = horizontal_discontinuity / block_count
                avg_v_disc = vertical_discontinuity / block_count
                
                # High discontinuity at block boundaries = compression artifacts
                artifact_score = (avg_h_disc + avg_v_disc) / 2
                
                # Normalize to 0-1 range (typical values 0-30)
                normalized_score = min(artifact_score / 25.0, 1.0)
                
                # Double compression often shows specific patterns
                double_compression = artifact_score > 8 and artifact_score < 20
            else:
                normalized_score = 0
                double_compression = False
            
            details = {
                'compression_score': round(float(normalized_score), 3),
                'double_compression_detected': bool(double_compression),
                'block_artifacts': round(float(artifact_score), 2) if block_count > 0 else 0,
                'blocks_analyzed': int(block_count)
            }
            
            return normalized_score, details
            
        except Exception as e:
            print(f"   ⚠️ Compression analysis failed: {e}")
            return 0.0, {'compression_score': 0, 'double_compression_detected': False, 'error': str(e)}
    
    def analyze_exif_metadata(self, image: Image.Image) -> Tuple[float, dict]:
        """
        Check for editing software traces and manipulation signs in EXIF data.
        Returns suspicion score and analysis details.
        """
        try:
            from PIL.ExifTags import TAGS
            
            exif_data = image.getexif()
            details = {
                'metadata_stripped': False,
                'editing_software_detected': False,
                'software_name': None,
                'suspicious_fields': [],
                'original_date': None,
                'modification_date': None
            }
            
            if not exif_data:
                # Stripped metadata is common in edited images
                details['metadata_stripped'] = True
                return 0.3, details
            
            suspicion = 0.0
            
            # Known editing software signatures
            editing_tools = [
                'photoshop', 'gimp', 'lightroom', 'affinity', 'pixlr', 
                'snapseed', 'vsco', 'facetune', 'faceapp', 'reface',
                'dall-e', 'midjourney', 'stable diffusion', 'artbreeder',
                'deepfake', 'faceswap', 'generative', 'ai'
            ]
            
            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)
                
                # Check software tag
                if tag == 'Software':
                    str_value = str(value).lower()
                    details['software_name'] = str(value)
                    
                    for tool in editing_tools:
                        if tool in str_value:
                            details['editing_software_detected'] = True
                            details['suspicious_fields'].append(f"Software: {value}")
                            suspicion = max(suspicion, 0.4)
                            break
                
                # Check for suspicious tags
                if tag in ['ImageDescription', 'XPComment', 'UserComment']:
                    str_value = str(value).lower()
                    for tool in editing_tools:
                        if tool in str_value:
                            details['suspicious_fields'].append(f"{tag}: {value[:50]}")
                            suspicion = max(suspicion, 0.3)
                
                # Date fields
                if tag == 'DateTimeOriginal':
                    details['original_date'] = str(value)
                if tag == 'DateTime':
                    details['modification_date'] = str(value)
            
            # Check for date inconsistencies
            if details['original_date'] and details['modification_date']:
                if details['original_date'] != details['modification_date']:
                    details['suspicious_fields'].append("Date mismatch")
                    suspicion = max(suspicion, 0.2)
            
            return min(suspicion, 1.0), details
            
        except Exception as e:
            print(f"   ⚠️ EXIF analysis failed: {e}")
            return 0.0, {'error': str(e)}
    
    def detect_blending_boundaries(self, image: Image.Image, face: 'FaceInfo' = None) -> Tuple[float, dict]:
        """
        Detect face-swap edges using gradient analysis.
        Returns suspicion score and analysis details.
        """
        try:
            img_array = np.array(image.convert('RGB'))
            
            # If face provided, focus on face boundary
            if face:
                x, y, w, h = face.bbox
                # Expand to get border region
                margin = int(max(w, h) * 0.15)
                x1 = max(0, x - margin)
                y1 = max(0, y - margin)
                x2 = min(img_array.shape[1], x + w + margin)
                y2 = min(img_array.shape[0], y + h + margin)
                roi = img_array[y1:y2, x1:x2]
            else:
                # Use center region
                h, w = img_array.shape[:2]
                cx, cy = w // 2, h // 2
                size = min(w, h) // 2
                roi = img_array[cy-size//2:cy+size//2, cx-size//2:cx+size//2]
            
            if roi.size == 0:
                return 0.0, {'blending_score': 0, 'boundary_artifacts': False}
            
            # Convert to grayscale for edge detection
            gray = np.mean(roi, axis=2).astype(np.uint8)
            
            # Sobel edge detection
            sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            edge_magnitude = np.sqrt(sobel_x**2 + sobel_y**2)
            
            # Calculate edge statistics
            mean_edge = np.mean(edge_magnitude)
            std_edge = np.std(edge_magnitude)
            max_edge = np.max(edge_magnitude)
            
            # Find sharp boundary regions (potential blend lines)
            threshold = mean_edge + 2 * std_edge
            sharp_edges = edge_magnitude > threshold
            sharp_ratio = np.sum(sharp_edges) / sharp_edges.size
            
            # Unnaturally sharp boundaries = blending artifacts
            # Also check for circular/oval patterns (face mask boundaries)
            suspicion = 0.0
            boundary_artifacts = False
            
            if sharp_ratio > 0.03 and sharp_ratio < 0.15:
                # Moderate sharp edge ratio - suspicious for face blending
                suspicion = sharp_ratio * 5
                boundary_artifacts = True
            
            if max_edge > 200 and std_edge > 30:
                # Very high edge contrast with moderate variation
                suspicion = max(suspicion, 0.3)
            
            details = {
                'blending_score': round(float(min(suspicion, 1.0)), 3),
                'boundary_artifacts_detected': bool(boundary_artifacts),
                'edge_mean': round(float(mean_edge), 2),
                'edge_std': round(float(std_edge), 2),
                'sharp_edge_ratio': round(float(sharp_ratio), 4)
            }
            
            return min(suspicion, 1.0), details
            
        except Exception as e:
            print(f"   ⚠️ Blending detection failed: {e}")
            return 0.0, {'blending_score': 0, 'error': str(e)}
    
    # ==================== PHASE 2: ENHANCED DETECTION ====================
    
    def analyze_facial_landmarks(self, face_image: Image.Image) -> Tuple[float, dict]:
        """
        Analyze facial proportions to detect unnatural/AI-generated faces.
        Uses geometric ratios instead of heavy landmark models.
        Returns suspicion score and analysis details.
        """
        try:
            img_array = np.array(face_image.convert('L'))  # Grayscale
            h, w = img_array.shape
            
            if h < 50 or w < 50:
                return 0.0, {'error': 'Face too small for landmark analysis'}
            
            # Use edge detection to find facial features
            edges = cv2.Canny(img_array, 50, 150)
            
            # Divide face into regions for symmetry analysis
            left_half = edges[:, :w//2]
            right_half = cv2.flip(edges[:, w//2:], 1)  # Flip for comparison
            
            # Symmetry score (real faces have slight asymmetry)
            if left_half.shape == right_half.shape:
                diff = np.abs(left_half.astype(float) - right_half.astype(float))
                symmetry_score = 1 - (np.sum(diff) / (left_half.size * 255))
            else:
                # Resize if needed
                min_w = min(left_half.shape[1], right_half.shape[1])
                left_crop = left_half[:, :min_w]
                right_crop = right_half[:, :min_w]
                diff = np.abs(left_crop.astype(float) - right_crop.astype(float))
                symmetry_score = 1 - (np.sum(diff) / (left_crop.size * 255))
            
            # Perfect symmetry (>0.95) or extreme asymmetry (<0.5) is suspicious
            # AI often creates too-perfect or inconsistent faces
            suspicion = 0.0
            
            if symmetry_score > 0.92:
                # Too symmetric - likely AI generated
                suspicion = (symmetry_score - 0.92) * 5  # Max ~0.4
                symmetry_flag = "too_symmetric"
            elif symmetry_score < 0.55:
                # Very asymmetric - possible bad manipulation
                suspicion = (0.55 - symmetry_score) * 2
                symmetry_flag = "too_asymmetric"
            else:
                symmetry_flag = "natural"
            
            # Analyze eye region (top 40% of face)
            eye_region = img_array[:int(h*0.4), :]
            eye_edges = cv2.Canny(eye_region, 30, 100)
            eye_density = np.sum(eye_edges > 0) / eye_edges.size
            
            # Eyes should have moderate edge density (0.05-0.20)
            if eye_density < 0.03 or eye_density > 0.25:
                suspicion += 0.15
                eye_flag = "abnormal"
            else:
                eye_flag = "normal"
            
            # Analyze mouth region (bottom 35% of face)
            mouth_region = img_array[int(h*0.65):, :]
            mouth_edges = cv2.Canny(mouth_region, 30, 100)
            mouth_density = np.sum(mouth_edges > 0) / mouth_edges.size
            
            # Check mouth-to-eye ratio
            if eye_density > 0:
                me_ratio = mouth_density / eye_density
                if me_ratio > 2.5 or me_ratio < 0.3:
                    suspicion += 0.10
                    mouth_flag = "abnormal_ratio"
                else:
                    mouth_flag = "normal"
            else:
                mouth_flag = "unknown"
                me_ratio = 0
            
            # Texture analysis - AI faces often lack fine texture
            texture_std = np.std(img_array)
            if texture_std < 25:
                suspicion += 0.15
                texture_flag = "too_smooth"
            elif texture_std > 80:
                suspicion += 0.10
                texture_flag = "too_noisy"
            else:
                texture_flag = "natural"
            
            details = {
                'symmetry_score': round(float(symmetry_score), 3),
                'symmetry_flag': symmetry_flag,
                'eye_density': round(float(eye_density), 4),
                'eye_flag': eye_flag,
                'mouth_density': round(float(mouth_density), 4),
                'mouth_flag': mouth_flag,
                'mouth_eye_ratio': round(float(me_ratio), 3),
                'texture_std': round(float(texture_std), 2),
                'texture_flag': texture_flag,
                'landmark_score': round(float(min(suspicion, 1.0)), 3),
                'suspicious': bool(suspicion > 0.25)
            }
            
            return min(suspicion, 1.0), details
            
        except Exception as e:
            print(f"   ⚠️ Landmark analysis failed: {e}")
            return 0.0, {'landmark_score': 0, 'error': str(e)}
    
    def ensemble_confidence_check(self, primary_score: float, secondary_checks: List[float]) -> Tuple[float, dict]:
        """
        Cross-validate primary model score with secondary analysis scores.
        Returns adjusted confidence and ensemble details.
        """
        try:
            if not secondary_checks:
                return primary_score, {'ensemble_used': False}
            
            # Calculate agreement between primary and secondary
            avg_secondary = sum(secondary_checks) / len(secondary_checks)
            disagreement = abs(primary_score - avg_secondary)
            
            # Weighted ensemble (primary: 0.6, secondary: 0.4)
            ensemble_score = primary_score * 0.6 + avg_secondary * 0.4
            
            # If significant disagreement, add uncertainty boost
            boost = 0.0
            if disagreement > 0.3:
                # Models disagree significantly - increase fake likelihood
                boost = disagreement * 0.15
                agreement_flag = "high_disagreement"
            elif disagreement > 0.15:
                agreement_flag = "moderate_disagreement"
            else:
                agreement_flag = "agreement"
            
            details = {
                'ensemble_used': True,
                'primary_score': round(float(primary_score), 3),
                'secondary_avg': round(float(avg_secondary), 3),
                'disagreement': round(float(disagreement), 3),
                'ensemble_score': round(float(ensemble_score), 3),
                'agreement_flag': agreement_flag,
                'disagreement_boost': round(float(boost), 3)
            }
            
            return min(ensemble_score + boost, 1.0), details
            
        except Exception as e:
            print(f"   ⚠️ Ensemble check failed: {e}")
            return primary_score, {'ensemble_used': False, 'error': str(e)}
    
    def analyze_image_content_type(self, image: Image.Image) -> dict:
        """
        Analyze what type of content the image contains:
        - has_face: Boolean
        - face_type: 'photographic', 'animated', 'ai_generated', or None
        - content_type: 'portrait', 'group', 'scene', 'object', 'abstract'
        """
        faces = self.detect_faces(image)
        
        result = {
            'has_face': len(faces) > 0,
            'face_count': len(faces),
            'face_type': None,
            'face_type_confidence': 0.0,
            'content_type': 'scene',  # default
            'skin_suspicion': 0.0,
            'skin_reason': ''
        }
        
        if faces:
            # Analyze the largest/most prominent face
            main_face = max(faces, key=lambda f: f.bbox[2] * f.bbox[3])
            face_crop = self.extract_face_crop(image, main_face)
            
            face_type, type_confidence = self.detect_face_type(face_crop)
            result['face_type'] = face_type
            result['face_type_confidence'] = type_confidence
            
            if face_type == 'photographic':
                skin_suspicion, skin_reason = self.analyze_skin_naturalness(face_crop)
                result['skin_suspicion'] = skin_suspicion
                result['skin_reason'] = skin_reason
            
            result['content_type'] = 'portrait' if len(faces) == 1 else 'group'
        else:
            # Analyze non-face content
            img_array = np.array(image.convert('RGB'))
            
            # Check for text/abstract patterns
            edges = cv2.Canny(img_array, 50, 150)
            edge_density = np.sum(edges > 0) / edges.size
            
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            texture_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            if edge_density > 0.15:  # Very high edge content
                result['content_type'] = 'abstract'
            elif texture_var > 1000:  # High texture = natural scene
                result['content_type'] = 'scene'
            else:
                result['content_type'] = 'object'
        
        return result

    # ==================== FACE DETECTION ====================
    
    def detect_faces(self, image: Image.Image) -> List[FaceInfo]:
        """Detect all faces in an image using OpenCV with multiple parameters (optimized with resizing)."""
        if not self._face_detector_loaded:
            return []
        
        # Performance: Resize large images before detection
        max_width = 640
        w_orig, h_orig = image.size
        if w_orig > max_width:
            scale = max_width / w_orig
            detection_img = image.resize((max_width, int(h_orig * scale)), Image.NEAREST)
        else:
            scale = 1.0
            detection_img = image
        
        cv_image = cv2.cvtColor(np.array(detection_img), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        
        # Try multiple detection parameters for better results
        all_faces = []
        min_size = int(MIN_FACE_SIZE * scale) if scale < 1.0 else MIN_FACE_SIZE
        
        for scale_factor, neighbors in [(1.1, 5), (1.05, 3), (1.2, 6)]:
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=scale_factor,
                minNeighbors=neighbors,
                minSize=(min_size, min_size),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            if len(faces) > 0:
                all_faces = faces
                break
        
        face_infos = []
        for i, (x, y, w, h) in enumerate(all_faces):
            # Scale back to original image coordinates
            if scale < 1.0:
                x, y, w, h = int(x / scale), int(y / scale), int(w / scale), int(h / scale)
            
            aspect_ratio = w / h if h > 0 else 0
            size_score = min(1.0, (w * h) / (150 * 150))
            aspect_score = 1.0 - abs(1.0 - aspect_ratio) * 0.5
            confidence = (size_score + aspect_score) / 2
            
            if confidence >= FACE_CONFIDENCE_THRESHOLD:
                face_infos.append(FaceInfo(bbox=(x, y, w, h), confidence=confidence, index=i))
        
        return face_infos
    
    def extract_face_crop(self, image: Image.Image, face: FaceInfo) -> Image.Image:
        """Extract a face crop with margin from the image, with v6 enhanced preprocessing."""
        x, y, w, h = face.bbox
        img_w, img_h = image.size
        
        margin_x = int(w * FACE_MARGIN)
        margin_y = int(h * FACE_MARGIN)
        
        left = max(0, x - margin_x)
        top = max(0, y - margin_y)
        right = min(img_w, x + w + margin_x)
        bottom = min(img_h, y + h + margin_y)
        
        face_crop = image.crop((left, top, right, bottom))
        face_crop = face_crop.resize((self.optimal_size, self.optimal_size), Image.LANCZOS)
        
        # v6 Enhanced preprocessing for better clarity
        face_crop = self._enhance_face_crop(face_crop)
        
        return face_crop
    
    def _enhance_face_crop(self, face_crop: Image.Image) -> Image.Image:
        """
        v6 Enhanced face preprocessing:
        - Histogram equalization for better contrast
        - Noise reduction to remove artifacts
        - Sharpening for better detail detection
        """
        if not VIDEO_SUPPORT:
            return face_crop
        
        try:
            # Convert to numpy for OpenCV processing
            img_array = np.array(face_crop)
            
            # Step 1: Denoise using bilateral filter (preserves edges)
            denoised = cv2.bilateralFilter(img_array, 9, 75, 75)
            
            # Step 2: Histogram equalization in LAB color space (better for faces)
            if HIST_EQUALIZE:
                lab = cv2.cvtColor(denoised, cv2.COLOR_RGB2LAB)
                l_channel, a_channel, b_channel = cv2.split(lab)
                
                # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                l_enhanced = clahe.apply(l_channel)
                
                # Merge back
                lab_enhanced = cv2.merge([l_enhanced, a_channel, b_channel])
                enhanced = cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2RGB)
            else:
                enhanced = denoised
            
            # Step 3: Apply unsharp mask for sharpening
            gaussian = cv2.GaussianBlur(enhanced, (0, 0), 3)
            sharpened = cv2.addWeighted(enhanced, 1.0 + SHARPEN_STRENGTH, gaussian, -SHARPEN_STRENGTH, 0)
            
            # Ensure values are in valid range
            sharpened = np.clip(sharpened, 0, 255).astype(np.uint8)
            
            return Image.fromarray(sharpened)
            
        except Exception as e:
            # Fallback to original if enhancement fails
            print(f"   ⚠️ Face enhancement failed: {e}")
            return face_crop
    
    def detect_media_type(self, url: str) -> str:
        """Detect if URL is image or video based on URL patterns."""
        url_lower = url.lower()
        
        # Extended list of video indicators including various Cloudinary patterns
        video_indicators = [
            '/video/',           # Cloudinary video path
            '/video/upload/',    # Cloudinary video upload path
            'res_type=video',    # Cloudinary resource type parameter
            'resource_type=video', # Alternative Cloudinary param
            '.mp4', '.mov', '.avi', '.webm', '.mkv', 
            '.m4v', '.3gp', '.flv', '.wmv', '.ogv'
        ]
        
        print(f"🎬 Detecting media type for: {url[:80]}...")
        
        for indicator in video_indicators:
            if indicator in url_lower:
                print(f"   → VIDEO (matched: '{indicator}')")
                return MediaType.VIDEO
        
        print(f"   → IMAGE (no video indicators matched)")
        return MediaType.IMAGE
    
    def clean_cloudinary_url(self, url: str) -> str:
        """
        Remove Cloudinary transformation parameters from URL to get original file.
        
        Handles various URL patterns including:
        - Standard transformations: /upload/w_500,h_500/v1234/path
        - Audio/video codecs: /upload/ac_aac,q_auto:good,vc_auto/v1/path
        - Nested transformations: /upload/f_auto,q_auto/c_fill,w_100/v1/path
        """
        import re
        
        if 'cloudinary.com' not in url or '/upload/' not in url:
            return url
        
        try:
            parts = url.split('/upload/')
            if len(parts) != 2:
                return url
            
            base = parts[0] + '/upload/'
            path = parts[1]
            
            # If path already starts with version (v + digit), no transformations
            if re.match(r'^v\d+/', path):
                return url
            
            # Find the version marker (v followed by digits)
            # Handle multiple transformation segments before version
            match = re.search(r'(v\d+/.*)', path)
            if match:
                clean_path = match.group(1)
                # Remove query parameters that might cause issues
                if '?' in clean_path:
                    clean_path = clean_path.split('?')[0]
                clean_url = base + clean_path
                print(f"   📌 URL cleaned: removed transformations")
                return clean_url
            
            # No version found - might be a different URL format
            # Try to remove common transformation prefixes
            transform_pattern = r'^[a-z]{1,3}_[^/]+/'
            cleaned = re.sub(transform_pattern, '', path)
            if cleaned != path:
                return base + cleaned
                
        except Exception as e:
            print(f"   ⚠️ URL cleaning error: {e}")
        
        return url
    
    def download_with_retry(self, url: str, max_retries: int = 3, timeout: int = 60) -> bytes:
        """
        Download content from URL with exponential backoff retry logic.
        
        Args:
            url: URL to download from
            max_retries: Maximum number of retry attempts
            timeout: Request timeout in seconds
            
        Returns:
            Downloaded content as bytes
            
        Raises:
            Exception: If all retries fail
        """
        import time as time_module
        
        last_error = None
        
        for attempt in range(max_retries):
            try:
                # Clean the URL before downloading
                clean_url = self.clean_cloudinary_url(url)
                
                response = requests.get(clean_url, timeout=timeout)
                
                # Handle specific HTTP errors
                if response.status_code == 404:
                    raise FileNotFoundError(f"Resource not found: {clean_url[:60]}...")
                elif response.status_code == 400:
                    # Try original URL without cleaning
                    if clean_url != url:
                        print(f"   🔄 Retrying with original URL...")
                        response = requests.get(url, timeout=timeout)
                        response.raise_for_status()
                    else:
                        response.raise_for_status()
                elif response.status_code >= 500:
                    # Server error - worth retrying
                    raise ConnectionError(f"Server error {response.status_code}")
                else:
                    response.raise_for_status()
                
                return response.content
                
            except FileNotFoundError:
                # Don't retry 404s
                raise
            except (requests.exceptions.Timeout, ConnectionError) as e:
                last_error = e
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 0.5  # 0.5s, 1s, 2s
                    print(f"   ⏳ Retry {attempt + 1}/{max_retries} in {wait_time:.1f}s...")
                    time_module.sleep(wait_time)
            except requests.exceptions.RequestException as e:
                last_error = e
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 0.5
                    print(f"   ⏳ Retry {attempt + 1}/{max_retries} in {wait_time:.1f}s (error: {type(e).__name__})")
                    time_module.sleep(wait_time)
        
        raise Exception(f"Download failed after {max_retries} attempts: {last_error}")
    
    def download_media(self, url: str) -> Tuple[bytes, str]:
        """Download media from URL with retry logic."""
        content = self.download_with_retry(url)
        return content, self.detect_media_type(url)
    
    def download_image(self, url: str) -> Image.Image:
        """Download image from URL with retry logic."""
        content = self.download_with_retry(url, timeout=30)
        return Image.open(BytesIO(content)).convert("RGB")
    
    # ==================== IMAGE ANALYSIS v5 ====================
    
    def generate_image_frames(self, image: Image.Image) -> Tuple[List[Tuple[Image.Image, str, float]], List[FaceInfo], dict]:
        """
        Generate analysis frames with v5 enhanced techniques.
        Now returns content_info dict for better classification.
        """
        frames = []
        w, h = image.size
        size = self.optimal_size
        
        # Detect faces
        faces = self.detect_faces(image)
        print(f"   👤 Detected {len(faces)} face(s)")
        
        # Analyze content type for smarter processing
        content_info = self.analyze_image_content_type(image) if VIDEO_SUPPORT else {
            'has_face': len(faces) > 0,
            'face_count': len(faces),
            'face_type': None,
            'content_type': 'scene'
        }
        
        if content_info.get('face_type'):
            print(f"   🎭 Face Type: {content_info['face_type']} (conf: {content_info.get('face_type_confidence', 0):.2f})")
        
        analysis_flags = {
            'frequency_suspicious': False,
            'color_suspicious': False,
            'noise_suspicious': False,
            'animated_face': content_info.get('face_type') == 'animated',
            'ai_generated_face': content_info.get('face_type') == 'ai_generated',
            'skin_suspicious': content_info.get('skin_suspicion', 0) > 0.3
        }
        
        if faces:
            for i, face in enumerate(faces):
                face_crop = self.extract_face_crop(image, face)
                base_weight = 5.0 - (i * 0.3)
                
                # 1. Original face at multiple scales
                for scale_idx, scale in enumerate(MULTI_SCALE_SIZES):
                    scaled_size = int(self.optimal_size * scale)
                    if scaled_size >= 128:
                        scaled = face_crop.resize((scaled_size, scaled_size), Image.LANCZOS)
                        scaled = scaled.resize((self.optimal_size, self.optimal_size), Image.LANCZOS)
                        weight = base_weight * scale
                        frames.append((scaled, f"face{i+1}_s{int(scale*100)}", max(weight, 2.0)))
                
                # 2. FFT Frequency Analysis
                fft_image = self.analyze_frequency_domain(face_crop)
                frames.append((fft_image, f"face{i+1}_fft", FREQUENCY_WEIGHT * 2.0))
                
                # 3. Color Consistency
                color_suspicion, color_image = self.analyze_color_consistency(face_crop)
                color_weight = COLOR_WEIGHT * (1.0 + color_suspicion)
                frames.append((color_image, f"face{i+1}_color", color_weight))
                if color_suspicion > 0.4:
                    analysis_flags['color_suspicious'] = True
                
                # 4. Noise Pattern
                noise_suspicion, noise_image = self.analyze_noise_pattern(face_crop)
                noise_weight = 1.0 + noise_suspicion
                frames.append((noise_image, f"face{i+1}_noise", noise_weight))
                if noise_suspicion > 0.3:
                    analysis_flags['noise_suspicious'] = True
                
                # 5. Eye Region Focus
                eye_region = self.extract_eye_region(face_crop)
                if eye_region:
                    frames.append((eye_region, f"face{i+1}_eyes", 3.5))
                    # Eye edges for artifact detection
                    eye_edges = eye_region.filter(ImageFilter.FIND_EDGES)
                    frames.append((eye_edges, f"face{i+1}_eyes_edge", 2.0))
                
                # 6. Mouth Region Focus
                mouth_region = self.extract_mouth_region(face_crop)
                if mouth_region:
                    frames.append((mouth_region, f"face{i+1}_mouth", 3.0))
                
                # 7. Edge detection on face
                face_edges = face_crop.filter(ImageFilter.FIND_EDGES)
                frames.append((face_edges, f"face{i+1}_edges", 2.5))
                
                # 8. Sharpened face
                face_sharp = face_crop.filter(ImageFilter.SHARPEN).filter(ImageFilter.SHARPEN)
                frames.append((face_sharp, f"face{i+1}_sharp", 1.5))
        
        # Full image analysis
        full = image.resize((size, size), Image.LANCZOS)
        full_weight = 1.0 if faces else 3.0
        frames.append((full, "full", full_weight))
        
        # Full image FFT
        full_fft = self.analyze_frequency_domain(image)
        frames.append((full_fft, "full_fft", FREQUENCY_WEIGHT))
        
        # If no faces, use enhanced center crops and AI art detection
        if not faces:
            # NEW v7: Run AI art signature detection for no-face images
            if AI_ART_DETECTION_AVAILABLE:
                try:
                    ai_art_result = comprehensive_no_face_analysis(image)
                    content_info['ai_art_analysis'] = ai_art_result
                    
                    # Add boost for AI art detection
                    if ai_art_result['classification'] == 'likely_ai_generated':
                        content_info['ai_art_boost'] = 0.35
                        print(f"   🎨 AI Art Detected: {ai_art_result['ai_generator']} ({ai_art_result['combined_score']*100:.0f}%)")
                    elif ai_art_result['classification'] == 'suspicious':
                        content_info['ai_art_boost'] = 0.15
                        print(f"   ⚠️ AI Art Suspicious: {ai_art_result['ai_generator']} ({ai_art_result['combined_score']*100:.0f}%)")
                    
                    # Flag analysis patterns
                    analysis_flags['ai_generated_art'] = ai_art_result['classification'] == 'likely_ai_generated'
                    analysis_flags['background_suspicious'] = ai_art_result['background_suspicious']
                    analysis_flags['scene_inconsistent'] = not ai_art_result['scene_consistent']
                    
                except Exception as e:
                    print(f"   ⚠️ AI art detection error: {e}")
            
            for pct, weight in [(0.35, 4.5), (0.45, 4.0), (0.55, 3.5), (0.65, 3.0)]:
                mx, my = int(w * (1-pct) / 2), int(h * (1-pct) / 2)
                crop = image.crop((mx, my, w-mx, h-my)).resize((size, size), Image.LANCZOS)
                frames.append((crop, f"center_{int(pct*100)}", weight))
                
                # Add FFT for center crops too
                crop_fft = self.analyze_frequency_domain(crop)
                frames.append((crop_fft, f"center_{int(pct*100)}_fft", weight * 0.5))
        
        # Edge detection
        edges = image.filter(ImageFilter.FIND_EDGES).convert("RGB")
        edges = edges.resize((size, size), Image.LANCZOS)
        frames.append((edges, "edges", 1.0))
        
        # Enhanced contrast
        contrast = ImageEnhance.Contrast(image).enhance(1.3).resize((size, size), Image.LANCZOS)
        frames.append((contrast, "contrast", 0.8))
        
        # Mirror test for single face
        if len(faces) == 1:
            mirror = ImageOps.mirror(image).resize((size, size), Image.LANCZOS)
            frames.append((mirror, "mirror", 1.0))
        
        print(f"   📊 Generated {len(frames)} analysis frames")
        if any(analysis_flags.values()):
            flags = [k for k, v in analysis_flags.items() if v]
            print(f"   ⚠️  Suspicious patterns: {', '.join(flags)}")
        
        # Add analysis flags to content_info
        content_info['analysis_flags'] = analysis_flags
        
        return frames, faces, content_info
    
    # ==================== VIDEO ANALYSIS ====================
    
    # ==================== VIDEO ANALYSIS ====================
    
    def extract_video_frames(self, video_data: bytes) -> Tuple[List[Tuple[Image.Image, str, float]], List[FaceInfo]]:
        """Extract key frames from video with v5 enhanced analysis."""
        if not VIDEO_SUPPORT:
            raise RuntimeError("OpenCV not installed - cannot process video")
        
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as f:
            f.write(video_data)
            temp_path = f.name
        
        try:
            cap = cv2.VideoCapture(temp_path)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            # Handle corrupted or unreadable video metadata
            if total_frames <= 0 or fps <= 0 or total_frames > 100000000:
                print(f"   ⚠️ Invalid video metadata (frames={total_frames}, fps={fps})")
                print(f"   📹 Attempting frame-by-frame read...")
                
                # Try to read frames directly
                frame_list = []
                read_attempts = 0
                max_attempts = 500  # Limit to prevent infinite loop
                while read_attempts < max_attempts:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    frame_list.append(frame)
                    read_attempts += 1
                    if len(frame_list) >= 16:  # Limit frames to analyze
                        break
                
                cap.release()
                
                if not frame_list:
                    print(f"   ❌ No frames readable - creating synthetic placeholder")
                    # Create a placeholder frame for minimal analysis
                    # This ensures we always have something to analyze
                    placeholder = Image.new('RGB', (224, 224), color=(128, 128, 128))
                    frames = [
                        (placeholder, "placeholder_full", 1.0),
                    ]
                    # Add FFT of placeholder
                    try:
                        fft_placeholder = self.analyze_frequency_domain(placeholder)
                        frames.append((fft_placeholder, "placeholder_fft", 0.5))
                    except:
                        pass
                    
                    return frames, []
                
                print(f"   ✅ Read {len(frame_list)} frames directly")
                total_frames = len(frame_list)
                fps = 30.0  # Assume 30fps
                
                # Process the frames we read
                frames = []
                all_faces = []
                sample_indices = list(range(min(8, len(frame_list))))
                
                for i, frame_idx in enumerate(sample_indices):
                    print(f"   📹 Fallback frame {i+1}/{len(sample_indices)}...", end=" ", flush=True)
                    frame_rgb = cv2.cvtColor(frame_list[frame_idx], cv2.COLOR_BGR2RGB)
                    pil_image = Image.fromarray(frame_rgb)
                    
                    frame_faces = self.detect_faces(pil_image)
                    
                    if frame_faces:
                        # Analyze all detected faces (up to 5 per frame for multi-face support)
                        for j, face in enumerate(frame_faces[:5]):
                            face_crop = self.extract_face_crop(pil_image, face)
                            weight = 3.5 if (i == 0 or i == len(sample_indices) - 1) else 2.5
                            face_size = face.size
                            frames.append((face_crop, f"f{i+1}_face{j+1}_sz{face_size}", weight))
                            all_faces.append(face)
                        print(f"✅ {len(frame_faces)} face(s) [sizes: {[f.size for f in frame_faces[:5]]}]")

                    else:
                        # No face - just use resized frame (no extra FFT/color/noise)
                        resized = pil_image.resize((self.optimal_size, self.optimal_size), Image.LANCZOS)
                        weight = 2.5 if (i == 0 or i == len(sample_indices) - 1) else 2.0
                        frames.append((resized, f"frame_{i+1}", weight))
                        print(f"📷 no face")
                
                # Ensure we have at least one frame for analysis
                if not frames and frame_list:
                    print(f"   ⚠️ No frames generated - using first raw frame")
                    first_frame = cv2.cvtColor(frame_list[0], cv2.COLOR_BGR2RGB)
                    pil_first = Image.fromarray(first_frame)
                    resized = pil_first.resize((self.optimal_size, self.optimal_size), Image.LANCZOS)
                    frames.append((resized, "fallback_frame", 2.0))
                
                print(f"   👤 Total faces detected: {len(all_faces)}")
                print(f"   📊 Generated {len(frames)} analysis frames")
                return frames, all_faces
            
            duration = total_frames / fps if fps > 0 else 0
            
            print(f"   Video: {total_frames} frames, {fps:.1f} fps, {duration:.1f}s")
            
            frames = []
            all_faces = []
            
            if total_frames <= VIDEO_FRAME_COUNT:
                indices = list(range(total_frames))
            else:
                step = total_frames / (VIDEO_FRAME_COUNT - 1)
                indices = [int(i * step) for i in range(VIDEO_FRAME_COUNT)]
                indices[-1] = min(indices[-1], total_frames - 1)
            
            for i, frame_idx in enumerate(indices):
                print(f"   📹 Frame {i+1}/{len(indices)}...", end=" ", flush=True)
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                
                if ret:
                    # Downscale frame for memory efficiency (LIGHTWEIGHT_MODE)
                    if LIGHTWEIGHT_MODE:
                        h, w = frame.shape[:2]
                        if max(h, w) > VIDEO_MAX_RESOLUTION:
                            scale = VIDEO_MAX_RESOLUTION / max(h, w)
                            new_w, new_h = int(w * scale), int(h * scale)
                            frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)
                    
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil_image = Image.fromarray(frame_rgb)
                    
                    # Free the numpy array immediately
                    del frame_rgb
                    del frame
                    
                    frame_faces = self.detect_faces(pil_image)
                    
                    if frame_faces:
                        # Analyze all detected faces (up to 5 per frame for multi-face support)
                        for j, face in enumerate(frame_faces[:5]):
                            face_crop = self.extract_face_crop(pil_image, face)
                            weight = 3.5 if (i == 0 or i == len(indices) - 1) else 2.5
                            # Include face size in name for tracking
                            face_size = face.size
                            frames.append((face_crop, f"f{i+1}_face{j+1}_sz{face_size}", weight))
                            all_faces.append(face)
                        print(f"✅ {len(frame_faces)} face(s) [sizes: {[f.size for f in frame_faces[:5]]}]")

                    else:
                        # No face - just use resized full frame
                        resized = pil_image.resize((self.optimal_size, self.optimal_size), Image.LANCZOS)
                        weight = 2.5 if (i == 0 or i == len(indices) - 1) else 2.0
                        frames.append((resized, f"frame_{i+1}", weight))
                        print(f"📷 no face")
                    
                    # Memory cleanup after each frame in LIGHTWEIGHT_MODE
                    if LIGHTWEIGHT_MODE:
                        del pil_image
                        import gc
                        gc.collect()
            
            cap.release()
            
            print(f"   👤 Total faces detected: {len(all_faces)}")
            
            return frames, all_faces
            
        except Exception as e:
            # Ensure cap is released on error
            if 'cap' in locals():
                cap.release()
            raise e
        finally:
            # On Windows, we need to ensure the file handle is released
            # before we can delete. Add a small delay and retry logic.
            import time
            import gc
            gc.collect()  # Force garbage collection to release file handles
            
            for attempt in range(3):
                try:
                    time.sleep(0.1)  # Small delay for file handle release
                    os.unlink(temp_path)
                    break
                except PermissionError:
                    if attempt == 2:
                        # Last attempt failed, log but don't crash
                        print(f"   ⚠️  Warning: Could not delete temp file: {temp_path}")
                    else:
                        time.sleep(0.5)  # Longer wait before retry    
    def analyze_temporal_consistency(self, results: List[Dict[str, float]]) -> float:
        """Analyze temporal consistency across video frames."""
        if len(results) < 2:
            return 0.0
        
        fake_scores = [r['fake'] for r in results]
        variance = np.var(fake_scores)
        mean_diff = np.mean(np.abs(np.diff(fake_scores)))
        
        # High variance = temporal inconsistency
        inconsistency_score = (variance * 2.5 + mean_diff * 1.5) / 2
        
        return min(inconsistency_score, 0.35)
    
    # ==================== CORE CLASSIFICATION ====================
    
    def classify_single(self, image: Image.Image) -> Dict[str, float]:
        """Classify a single image."""
        if not self._loaded:
            self.load_model()
        
        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            probs = torch.nn.functional.softmax(outputs.logits, dim=1).squeeze().tolist()
        
        return {ID2LABEL[i]: round(probs[i], 4) for i in range(len(probs))}
    
    def analyze_frames(self, frames: List[Tuple[Image.Image, str, float]], 
                      faces: List[FaceInfo],
                      is_video: bool = False,
                      content_info: Optional[dict] = None) -> Tuple[Dict, List, dict]:
        """Analyze all frames and aggregate results."""
        if not self._loaded:
            self.load_model()
        
        results = []
        weighted_fake = 0.0
        weighted_real = 0.0
        total_weight = 0.0
        fake_votes = 0
        face_scores = []
        fft_scores = []
        eye_scores = []
        
        total = len(frames)
        if total == 0:
            return {'fake': 0.15, 'real': 0.85}, [], {'faces_detected': len(faces)}

        print(f"{'─'*70}")
        print(f"🚀 Batch processing {total} frames...")
        start = time.time()
        
        # BATCH INFERENCE: Process all frames in one model call
        images_list = [f[0] for f in frames]
        inputs = self.processor(images=images_list, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            batch_probs = torch.nn.functional.softmax(outputs.logits, dim=1).tolist()
        
        batch_time = time.time() - start
        print(f"✅ Batch inference: {batch_time:.2f}s for {total} frames")
        print(f"{'─'*70}")
        
        # Aggregate results from batch
        for i, (frame, name, weight) in enumerate(frames):
            probs = batch_probs[i]
            result = {ID2LABEL[j]: round(probs[j], 4) for j in range(len(probs))}
            results.append(result)
            
            weighted_fake += result['fake'] * weight
            weighted_real += result['real'] * weight
            total_weight += weight
            
            if result['fake'] > 0.5:
                fake_votes += 1
            
            # Track specific analysis scores
            name_lower = name.lower()
            if 'face' in name_lower and 'fft' not in name_lower and 'eye' not in name_lower:
                face_scores.append(result['fake'])
            if 'fft' in name_lower:
                fft_scores.append(result['fake'])
            if 'eye' in name_lower:
                eye_scores.append(result['fake'])
            
            # Progress Logging
            icon = "🔴" if result['fake'] > 0.5 else "🟢"
            print(f"   {i+1:2d}/{total} | {name:16s} | w={weight:.1f} | {icon} {result['fake']*100:5.1f}%")

        elapsed = time.time() - start
        print(f"{'─'*70}")
        print(f"⏱️  Total: {elapsed:.2f}s ({len(frames)/elapsed:.1f} fps)")
        
        if total_weight == 0:
            return {'fake': 0.15, 'real': 0.85}, [], {'faces_detected': len(faces)}

        avg_fake = weighted_fake / total_weight
        avg_real = weighted_real / total_weight
        
        # Temporal boost for video
        temporal_boost = 0.0
        if is_video and len(results) > 2:
            temporal_boost = self.analyze_temporal_consistency(results)
            if temporal_boost > 0.05:
                print(f"⚡ Temporal inconsistency: +{temporal_boost*100:.1f}%")
                avg_fake += temporal_boost
        
        # ========== v8 ACCURACY IMPROVEMENTS ==========
        
        # 1. Multi-face consistency check
        face_consistency_boost = 0.0
        if len(face_scores) > 1:
            face_variance = np.var(face_scores)
            if face_variance > 0.15:
                # High variance across faces = possible selective manipulation
                face_consistency_boost = min(0.12, face_variance * 0.5)
                print(f"⚠️ Face score variance: {face_variance:.3f} → +{face_consistency_boost*100:.1f}%")
                avg_fake += face_consistency_boost
        
        # 2. Filter compensation (reduce false positives on filtered selfies)
        filter_compensation = 0.0
        if content_info and content_info.get('filter_intensity', 0) > 0.5:
            filter_compensation = content_info['filter_intensity'] * 0.06
            avg_fake = max(0.08, avg_fake - filter_compensation)
            print(f"🎨 Heavy filter detected → -{filter_compensation*100:.1f}% compensation")
        
        # 3. GAN fingerprint boost (from FFT analysis)
        gan_boost = 0.0
        if fft_scores and max(fft_scores) > FAKE_THRESHOLD:
            gan_boost = GAN_FINGERPRINT_BOOST
            avg_fake += gan_boost
            print(f"🔬 GAN fingerprint detected → +{gan_boost*100:.1f}%")
        
        # ✨ NEW v8.2: Screen Content Detection
        # Gaming footage, screen recordings, coding videos should not be flagged as deepfakes
        screen_compensation = 0.0
        screen_detected = False
        if len(faces) == 0 and len(frames) > 0:
            # Run screen detection on first frame
            try:
                first_frame = frames[0][0] if frames else None
                if first_frame:
                    is_screen, screen_conf, screen_details = self.detect_screen_content(first_frame)
                    if is_screen:
                        screen_detected = True
                        # Apply significant authenticity compensation for screen content
                        # Higher confidence = more compensation
                        screen_compensation = 0.20 + (screen_conf * 0.25)  # 20-45% reduction
                        avg_fake = max(0.05, avg_fake - screen_compensation)
                        print(f"🖥️ SCREEN CONTENT DETECTED (conf={screen_conf*100:.0f}%)")
                        print(f"   Indicators: {', '.join(screen_details.get('indicators', []))}")
                        print(f"   → Authenticity boost: +{screen_compensation*100:.1f}%")
            except Exception as e:
                print(f"   ⚠️ Screen detection error: {e}")
        
        # ✨ CRITICAL FIX v8.1: No-face content scoring
        # Only boost to AUTHENTIC if both:
        # 1. No faces detected AND
        # 2. Frame scores are genuinely low (not just analysis scores)
        if len(faces) == 0 and not screen_detected:
            avg_face = sum(face_scores) / len(face_scores) if face_scores else 0
            avg_fft = sum(fft_scores) / len(fft_scores) if fft_scores else 0
            avg_eye = sum(eye_scores) / len(eye_scores) if eye_scores else 0
            
            # Check if frame-level analysis shows high fake probability
            frame_based_avg = avg_fake  # This is the weighted average from all frames
            
            # If frames show HIGH fake scores (>50%), trust the frame analysis!
            if frame_based_avg > 0.5:
                # Keep the frame-based score - don't override it
                print(f"⚠️ No faces BUT high frame scores ({frame_based_avg*100:.1f}%) → keeping as SUSPICIOUS")
                # No modification to avg_fake - trust the weighted frame analysis
            elif avg_face < 0.1 and avg_fft < 0.1 and avg_eye < 0.1:
                # Low frame scores AND low analysis scores = genuine clean content
                print(f"✅ No faces + clean scores → AUTHENTIC (not a deepfake)")
                avg_fake = 0.08  # 8% fake = 92% real
                avg_real = 0.92
            else:
                # Mixed signals - moderate suspicion, but don't cap too aggressively
                print(f"⚠️ No faces, mixed signals (avg_fake={avg_fake*100:.1f}%) - moderate risk")
                # Don't cap at 32% - let the frame analysis speak
                avg_real = 1.0 - avg_fake
        
        # Final aggregation
        final_scores = {
            'fake': min(0.99, avg_fake),
            'real': max(0.01, 1.0 - avg_fake)
        }
        
        # ========== Multi-Face Analysis ==========
        # Aggregate per-face data with sizes for comprehensive analysis
        multi_face_analysis = {
            'total_unique_faces': 0,
            'face_sizes': [],
            'per_face_scores': [],
            'size_consistency': 'unknown',
            'size_variance': 0.0
        }
        
        if faces:
            # Get unique face sizes
            face_sizes = [f.size for f in faces]
            multi_face_analysis['face_sizes'] = face_sizes
            multi_face_analysis['total_unique_faces'] = len(set(face_sizes))
            
            # Calculate size variance (high variance = possible face swap)
            if len(face_sizes) > 1:
                size_mean = sum(face_sizes) / len(face_sizes)
                size_variance = sum((s - size_mean) ** 2 for s in face_sizes) / len(face_sizes)
                normalized_variance = size_variance / (size_mean ** 2) if size_mean > 0 else 0
                multi_face_analysis['size_variance'] = round(normalized_variance, 4)
                
                # Determine size consistency
                if normalized_variance < 0.1:
                    multi_face_analysis['size_consistency'] = 'consistent'
                elif normalized_variance < 0.3:
                    multi_face_analysis['size_consistency'] = 'moderate'
                else:
                    multi_face_analysis['size_consistency'] = 'inconsistent'
            else:
                multi_face_analysis['size_consistency'] = 'single_face'
            
            # Extract per-face scores from results
            for i, face in enumerate(faces):
                face_data = {
                    'face_index': i,
                    'bbox': face.bbox,
                    'size': face.size,
                    'confidence': face.confidence,
                    'fake_score': None
                }
                # Find matching score from face_scores
                if i < len(face_scores):
                    face_data['fake_score'] = round(face_scores[i], 4)
                multi_face_analysis['per_face_scores'].append(face_data)
        
        print(f"   👥 Multi-face analysis: {len(faces)} faces, sizes={[f.size for f in faces[:5]]}")
        
        # Build frame breakdown for report
        frame_breakdown = []
        for i, (frame, name, weight) in enumerate(frames):
            if i < len(results):
                frame_breakdown.append({
                    'index': i + 1,
                    'name': name,
                    'weight': round(float(weight), 2),
                    'fake_score': round(float(results[i].get('fake', 0)), 4),
                    'real_score': round(float(results[i].get('real', 0)), 4),
                    'is_suspicious': results[i].get('fake', 0) > 0.5
                })
        
        # Create detailed metadata
        details = {
            'total_frames': total,
            'fake_votes': fake_votes,
            'real_votes': total - fake_votes,
            'vote_ratio': fake_votes / total,
            'processing_time': elapsed,
            'temporal_boost': temporal_boost if is_video else None,
            'faces_detected': len(faces),
            'face_scores': face_scores,
            'avg_face_score': sum(face_scores) / len(face_scores) if face_scores else None,
            'avg_fft_score': sum(fft_scores) / len(fft_scores) if fft_scores else None,
            'avg_eye_score': sum(eye_scores) / len(eye_scores) if eye_scores else None,
            'multi_face_analysis': multi_face_analysis,
            'frame_breakdown': frame_breakdown,  # NEW: Individual frame analysis
            # v8 accuracy improvements metadata
            'v8_accuracy': {
                'face_consistency_boost': face_consistency_boost,
                'filter_compensation': filter_compensation,
                'gan_fingerprint_boost': gan_boost,
                'model_version': 'v8'
            }
        }
        
        if content_info:
            details.update(content_info)

        return final_scores, results, details
    
    def save_debug(self, frames: List, results: List, media_type: str) -> Tuple[str, List[dict]]:
        """Save debug images and return base64 encoded versions for PDF report."""
        import base64
        from io import BytesIO
        
        os.makedirs(DEBUG_DIR, exist_ok=True)
        
        for f in os.listdir(DEBUG_DIR):
            try:
                os.remove(os.path.join(DEBUG_DIR, f))
            except:
                pass
        
        ts = int(time.time())
        prefix = "VID" if media_type == MediaType.VIDEO else "IMG"
        
        debug_frames = []
        
        for i, ((frame, name, weight), result) in enumerate(zip(frames, results)):
            fake_pct = result['fake'] * 100
            status = "FAKE" if fake_pct > 50 else "REAL"
            path = os.path.join(DEBUG_DIR, f"{prefix}_{i:02d}_{name}_{status}_{fake_pct:.0f}.jpg")
            frame.save(path, "JPEG", quality=90)
            
            # Also encode to base64 for PDF report
            buffer = BytesIO()
            # Resize for PDF (smaller size)
            thumbnail = frame.copy()
            thumbnail.thumbnail((200, 200))
            thumbnail.save(buffer, format="JPEG", quality=80)
            img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            # Detect frame type from name - improved v7 detection
            frame_type = "full"
            name_lower = name.lower()
            
            # Face scale crops: face1_s100, face2_s75, etc.
            if "face" in name_lower and "_s" in name_lower:
                frame_type = "face"
            # FFT frequency analysis
            elif "fft" in name_lower:
                frame_type = "fft"
            # Eye region analysis
            elif "eye" in name_lower:
                frame_type = "eye"
            # Color consistency analysis
            elif "color" in name_lower:
                frame_type = "color"
            # Noise pattern analysis
            elif "noise" in name_lower:
                frame_type = "noise"
            # Edge detection
            elif "edge" in name_lower:
                frame_type = "edge"
            # Mouth region analysis
            elif "mouth" in name_lower:
                frame_type = "mouth"
            # Sharpened analysis
            elif "sharp" in name_lower:
                frame_type = "sharp"
            # Center crop
            elif "center" in name_lower:
                frame_type = "center"
            # Video frame
            elif "frame" in name_lower:
                frame_type = "video_frame"
            # Full image
            elif name_lower == "full":
                frame_type = "full"

            
            debug_frames.append({
                'index': i,
                'name': name,
                'type': frame_type,
                'weight': weight,
                'fake_score': round(result['fake'], 4),
                'real_score': round(result['real'], 4),
                'status': status,
                'image_base64': img_base64
            })
        
        print(f"   📊 Encoded {len(debug_frames)} debug frames for report")
        
        return DEBUG_DIR, debug_frames
    
    # ==================== MAIN ENTRY POINTS ====================
    
    def classify_from_url(self, url: str) -> Tuple[Dict[str, float], str, float, dict]:
        """Main entry: Analyze image or video from URL."""
        media_type = self.detect_media_type(url)
        
        print(f"{'='*70}")
        print(f"📥 DOWNLOADING {'VIDEO' if media_type == MediaType.VIDEO else 'IMAGE'}...")
        print(f"   URL: {url[:60]}...")
        
        if media_type == MediaType.VIDEO:
            return self._analyze_video(url)
        else:
            return self._analyze_image(url)
    
    def _analyze_image(self, url: str) -> Tuple[Dict[str, float], str, float, dict]:
        """Analyze image with v7 enhanced techniques (Phase 1 Advanced Detection)."""
        image = self.download_image(url)
        print(f"✅ Downloaded: {image.size[0]}x{image.size[1]} pixels")
        print(f"{'='*70}\n")
        
        print(f"🔬 DEEPFAKE ANALYSIS v7 (Advanced Detection)")
        
        # NEW: Stylization Detection for 3D renders, cartoons, animated avatars
        stylization_boost = 0.0
        stylization_result = None
        if STYLIZATION_DETECTION_AVAILABLE:
            print(f"   🎨 Running stylization detection...")
            stylization_result = detect_stylization(image)
            
            if stylization_result.is_stylized:
                style_name = stylization_result.style_type.value
                print(f"   🤖 STYLIZED CONTENT DETECTED: {style_name}")
                print(f"      Confidence: {stylization_result.confidence*100:.1f}%")
                print(f"      Indicators: {', '.join(stylization_result.indicators)}")
                
                # Apply fake boost for stylized content
                stylization_boost = stylization_result.fake_boost
                print(f"   ⚡ Stylization boost: +{stylization_boost*100:.1f}%")
            else:
                print(f"   ✅ Photorealistic content - no stylization detected")
        
        # Phase 1: New advanced analyses
        print(f"   📊 Running advanced analyses...")
        
        # Compression analysis
        compression_score, compression_details = self.analyze_compression_artifacts(image)
        print(f"   📦 Compression: {compression_score*100:.1f}% suspicious")
        
        # EXIF metadata analysis
        exif_score, exif_details = self.analyze_exif_metadata(image)
        print(f"   📋 EXIF: {exif_score*100:.1f}% suspicious")
        
        # NEW: Filter detection for Instagram/TikTok/Snapchat effects
        filter_score, filter_details = self.detect_social_media_filters(image)
        print(f"   🎨 Filters: {filter_score*100:.1f}% filtered")
        if filter_details.get('filters_detected'):
            print(f"      Detected: {', '.join(filter_details['filters_detected'])}")
        
        # Generate frames and run main analysis
        frames, faces, content_info = self.generate_image_frames(image)
        
        # ============ ACCURACY FIX: Early return for non-face content ============
        # Screenshots, UI, graphics, landscapes should NOT be flagged as deepfakes
        # Only run deepfake detection on images with actual human faces
        if not faces or len(faces) == 0:
            print(f"   ⚡ NO FACES DETECTED - Checking if screen/UI content...")
            
            # Check if this looks like screen content (website, code, gaming, UI)
            is_screen, screen_conf, screen_details = self.detect_screen_content(image)
            
            if is_screen:
                print(f"   ✅ SCREEN CONTENT DETECTED ({screen_conf*100:.0f}% confidence)")
                print(f"      Indicators: {', '.join(screen_details.get('indicators', []))}")
                print(f"   → Classifying as AUTHENTIC (not applicable for deepfake detection)")
                
                # Return as authentic - deepfake detection only applies to face content
                probs = {'fake': 0.02, 'real': 0.98}
                classification = 'real'
                confidence = 0.98
                details = {
                    'faces_detected': 0,
                    'content_type': 'screen',
                    'screen_content': screen_details,
                    'classification_reason': 'No faces detected - screen/UI content not applicable for deepfake analysis',
                    'debug_frames': [],
                    'model_version': 'deepfake-detector-v8'
                }
                return self._finalize(probs, details, MediaType.IMAGE, content_info)
            
            # No faces AND not obviously screen content - could be landscape, object, etc.
            # Still mark as authentic since no face manipulation is possible
            print(f"   ✅ NO FACE CONTENT - No faces to analyze")
            print(f"   → Classifying as AUTHENTIC (deepfake detection requires faces)")
            
            probs = {'fake': 0.05, 'real': 0.95}
            classification = 'real'
            confidence = 0.95
            details = {
                'faces_detected': 0,
                'content_type': content_info.get('content_type', 'scene'),
                'classification_reason': 'No faces detected - deepfake analysis not applicable',
                'debug_frames': [],
                'model_version': 'deepfake-detector-v8'
            }
            return self._finalize(probs, details, MediaType.IMAGE, content_info)
        
        # Continue with face-based deepfake analysis...
        print(f"   👤 Faces detected: {len(faces)} - Running deepfake analysis...")
        
        # Blending boundary analysis (if faces detected)
        blending_score = 0.0
        blending_details = {}
        if faces:
            blending_score, blending_details = self.detect_blending_boundaries(image, faces[0])
            print(f"   🎭 Blending: {blending_score*100:.1f}% suspicious")
        
        probs, results, details = self.analyze_frames(frames, faces, is_video=False, content_info=content_info)
        
        # Apply Phase 1 boosts to fake score
        phase1_boost = 0.0
        if compression_details.get('double_compression_detected'):
            phase1_boost += 0.08
            print(f"   ⚡ Double compression detected: +8%")
        if exif_details.get('editing_software_detected'):
            phase1_boost += 0.10
            print(f"   ⚡ Editing software detected: +10%")
        if exif_details.get('metadata_stripped'):
            phase1_boost += 0.05
            print(f"   ⚡ Metadata stripped: +5%")
        if blending_details.get('boundary_artifacts_detected'):
            phase1_boost += 0.12
            print(f"   ⚡ Blending artifacts detected: +12%")
        
        # Apply stylization boost (3D renders, cartoons, animated content)
        if stylization_boost > 0:
            probs['fake'] = min(probs['fake'] + stylization_boost, 0.99)
            probs['real'] = max(probs['real'] - stylization_boost, 0.01)
            details['stylization_boost'] = stylization_boost
            if stylization_result:
                details['stylization_type'] = stylization_result.style_type.value
                details['stylization_confidence'] = stylization_result.confidence
                details['stylization_indicators'] = stylization_result.indicators
        
        # Apply Phase 1 boost to probabilities
        if phase1_boost > 0:
            probs['fake'] = min(probs['fake'] + phase1_boost, 0.99)
            probs['real'] = max(probs['real'] - phase1_boost, 0.01)
            details['phase1_boost'] = phase1_boost
            print(f"   📊 Total Phase 1 boost: +{phase1_boost*100:.1f}%")
        
        # ========== PHASE 2: Enhanced Detection ==========
        print(f"   🔬 Running Phase 2 analysis...")
        phase2_boost = 0.0
        
        # Landmark analysis on first detected face
        landmark_details = {}
        if faces:
            face_crop = self.extract_face_crop(image, faces[0])
            landmark_score, landmark_details = self.analyze_facial_landmarks(face_crop)
            print(f"   👤 Landmark: {landmark_score*100:.1f}% suspicious")
            
            if landmark_details.get('suspicious'):
                phase2_boost += 0.15
                print(f"   ⚡ Facial proportions suspicious: +15%")
            
            if landmark_details.get('texture_flag') == 'too_smooth':
                phase2_boost += 0.08
                print(f"   ⚡ Face too smooth (AI-like): +8%")
        
        # Ensemble confidence check (use secondary analysis scores)
        secondary_scores = [
            compression_score,
            exif_score,
            blending_score,
            landmark_details.get('landmark_score', 0) if landmark_details else 0
        ]
        ensemble_score, ensemble_details = self.ensemble_confidence_check(probs['fake'], secondary_scores)
        print(f"   🔗 Ensemble agreement: {ensemble_details.get('agreement_flag', 'unknown')}")
        
        if ensemble_details.get('disagreement_boost', 0) > 0:
            phase2_boost += ensemble_details['disagreement_boost']
            print(f"   ⚡ Model disagreement boost: +{ensemble_details['disagreement_boost']*100:.1f}%")
        
        # Apply Phase 2 boost
        if phase2_boost > 0:
            probs['fake'] = min(probs['fake'] + phase2_boost, 0.99)
            probs['real'] = max(probs['real'] - phase2_boost, 0.01)
            details['phase2_boost'] = phase2_boost
            print(f"   📊 Total Phase 2 boost: +{phase2_boost*100:.1f}%")
        
        # Add all analysis details to response
        details['compression_analysis'] = compression_details
        details['exif_analysis'] = exif_details
        details['blending_analysis'] = blending_details
        details['landmark_analysis'] = landmark_details
        details['ensemble_analysis'] = ensemble_details
        # NEW: Filter detection details
        details['has_filter'] = filter_score > 0.3
        details['filter_intensity'] = round(filter_score, 3)
        details['filter_analysis'] = filter_details
        details['content_type'] = content_info.get('content_type', 'unknown') if content_info else 'unknown'
        
        _, debug_frames = self.save_debug(frames, results, MediaType.IMAGE)
        details['debug_frames'] = debug_frames
        
        # ========== NEW v7: Generate Annotated Image ==========
        if ANNOTATIONS_AVAILABLE and faces:
            try:
                print(f"   🎨 Generating visual annotations...")
                
                # Create manipulation regions from face scores
                face_scores_list = [r['fake'] for (_, name, _), r in zip(frames, results) 
                                   if 'face' in name.lower() and 'fft' not in name.lower() 
                                   and 'eye' not in name.lower()][:len(faces)]
                
                # Generate artifact markers from detected issues
                artifact_detections = []
                
                # Add compression artifact marker if detected
                if compression_details.get('double_compression_detected'):
                    artifact_detections.append({
                        'position': (image.width // 4, image.height // 4),
                        'label': 'Compression',
                        'severity': 'medium',
                        'description': 'Double compression detected'
                    })
                
                # Add blending artifact marker if detected
                if blending_details.get('boundary_artifacts_detected'):
                    artifact_detections.append({
                        'position': (3 * image.width // 4, image.height // 2),
                        'label': 'Blending',
                        'severity': 'high',
                        'description': 'Face blending boundary detected'
                    })
                
                # Add landmark artifact if suspicious
                if landmark_details.get('suspicious'):
                    artifact_detections.append({
                        'position': (image.width // 2, image.height // 3),
                        'label': 'Proportions',
                        'severity': 'medium',
                        'description': f"Face symmetry: {landmark_details.get('symmetry_flag', 'unknown')}"
                    })
                
                # Generate annotated image
                annotated_img, heatmap_img = create_full_annotated_image(
                    image,
                    faces,
                    face_scores_list,
                    artifact_detections,
                    include_heatmap=True,
                    include_boxes=True,
                    include_arrows=len(artifact_detections) > 0
                )
                
                # Encode annotated image to base64
                details['annotated_image'] = image_to_base64(annotated_img.convert('RGB'), 'JPEG')
                if heatmap_img:
                    details['heatmap_image'] = image_to_base64(heatmap_img.convert('RGB'), 'JPEG')
                
                print(f"   ✅ Visual annotations generated")
                
            except Exception as e:
                print(f"   ⚠️ Annotation generation error: {e}")
        
        return self._finalize(probs, details, "IMAGE", content_info)
    
    def _analyze_video(self, url: str) -> Tuple[Dict[str, float], str, float, dict]:
        """Analyze video with v7 enhanced techniques including motion blur and face tracking."""
        if not VIDEO_SUPPORT:
            raise RuntimeError("Video support requires OpenCV")
        
        content, _ = self.download_media(url)
        print(f"✅ Downloaded: {len(content) / 1024 / 1024:.1f} MB")
        print(f"{'='*70}\n")
        
        print(f"🎬 VIDEO ANALYSIS v7 (Enhanced Detection)")
        
        frames, faces = self.extract_video_frames(content)
        print(f"   Extracted {len(frames)} analysis frames")
        
        probs, results, details = self.analyze_frames(frames, faces, is_video=True)
        
        # ========== v7 Video Enhancements - DISABLED for speed ==========
        # These analyses add significant time (~2-5 minutes) for marginal accuracy gains.
        # The batch inference with temporal consistency already provides good results.
        # To re-enable, set VIDEO_ANALYSIS_AVAILABLE to True and uncomment below.
        
        # Skipped: motion blur analysis, face tracking, lip sync detection
        print(f"   ⏭️ v7 enhancements skipped for speed")
        
        # Generate debug frames - handle case where results might be empty
        if frames and results:
            _, debug_frames = self.save_debug(frames, results, MediaType.VIDEO)
            details['debug_frames'] = debug_frames
        elif frames:
            # Generate debug frames even if analysis returned early (no results)
            # Create mock results based on probs for each frame
            mock_results = [{'fake': probs['fake'], 'real': probs['real']} for _ in frames]
            _, debug_frames = self.save_debug(frames, mock_results, MediaType.VIDEO)
            details['debug_frames'] = debug_frames
        else:
            details['debug_frames'] = []
        
        return self._finalize(probs, details, "VIDEO")
    
    def _finalize(self, probs: Dict, details: dict, media_type: str, content_info: Optional[dict] = None) -> Tuple[Dict, str, float, dict]:
        """Finalize classification."""
        fake_score = probs['fake']
        
        if fake_score > FAKE_THRESHOLD:
            classification = "fake"
            confidence = fake_score
        elif fake_score > SUSPICIOUS_THRESHOLD:
            classification = "suspicious"
            confidence = fake_score
        else:
            classification = "real"
            confidence = probs['real']
        
        print(f"\n💾 Debug: {DEBUG_DIR}")
        print(f"\n{'='*70}")
        print(f"🎯 FINAL VERDICT ({media_type}) - v5 Enhanced")
        print(f"{'='*70}")
        
        if classification == "fake":
            print(f"   ⛔ FAKE - AI-generated or manipulated")
        elif classification == "suspicious":
            print(f"   ⚠️  SUSPICIOUS - Possible manipulation")
        else:
            print(f"   ✅ REAL - Authentic content")
        
        print(f"   📊 Confidence: {confidence*100:.1f}%")
        print(f"   📈 Fake: {probs['fake']*100:.1f}% | Real: {probs['real']*100:.1f}%")
        print(f"   🗳️  Votes: {details['fake_votes']}/{details['total_frames']} fake")
        print(f"   👤 Faces: {details['faces_detected']} detected")
        
        # Content info details
        if content_info:
            face_type = content_info.get('face_type')
            if face_type:
                type_icons = {'photographic': '📸', 'animated': '🎨', 'ai_generated': '🤖'}
                print(f"   {type_icons.get(face_type, '❓')} Face Type: {face_type}")
            content_type = content_info.get('content_type')
            if content_type:
                print(f"   📋 Content: {content_type}")
        
        if details.get('avg_face_score') is not None:
            print(f"   🎭 Face Score: {details['avg_face_score']*100:.1f}% fake")
        if details.get('avg_fft_score') is not None:
            print(f"   📡 FFT Score: {details['avg_fft_score']*100:.1f}% fake")
        if details.get('avg_eye_score') is not None:
            print(f"   👁️  Eye Score: {details['avg_eye_score']*100:.1f}% fake")
        if details.get('temporal_boost'):
            print(f"   ⚡ Temporal: +{details['temporal_boost']*100:.1f}%")
        if details.get('fft_boost'):
            print(f"   📡 FFT Boost: +{details['fft_boost']*100:.1f}%")
        if details.get('eye_boost'):
            print(f"   👁️  Eye Boost: +{details['eye_boost']*100:.1f}%")
        if details.get('face_type_boost'):
            print(f"   🎨 Face Type Boost: +{details['face_type_boost']*100:.1f}%")
        if details.get('skin_boost'):
            print(f"   💅 Skin Boost: +{details['skin_boost']*100:.1f}%")
        
        print(f"{'='*70}\n")
        
        # Add content info to details for API response
        if content_info:
            details['face_type'] = content_info.get('face_type')
            details['content_type'] = content_info.get('content_type')
            details['skin_reason'] = content_info.get('skin_reason')
        
        # Free memory
        import gc
        gc.collect()
        
        return probs, classification, confidence, details


# Global instance
detector = DeepfakeDetector()


def get_detector() -> DeepfakeDetector:
    """Get the global detector instance."""
    return detector
