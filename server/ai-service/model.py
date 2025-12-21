"""
Advanced Deepfake Detection Model v5
Enhanced with: FFT Frequency Analysis, Color Consistency, Noise Patterns, Multi-Scale Analysis
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

# Model configuration
MODEL_PATH = os.environ.get(
    "MODEL_PATH", 
    r"D:\BSSE\Projects\FYP\AI_models\deepfake-detector-model-v1"
)
HUGGINGFACE_MODEL_ID = "prithivMLmods/deepfake-detector-model-v1"

# Label mapping
ID2LABEL = {0: "fake", 1: "real"}

# Detection thresholds (calibrated for v5)
FAKE_THRESHOLD = 0.52
SUSPICIOUS_THRESHOLD = 0.42

# Debug folder
DEBUG_DIR = os.path.join(os.path.dirname(__file__), "debug_images")

# Video settings
VIDEO_FRAME_COUNT = 5  # Reduced from 10
VIDEO_TEMPORAL_WEIGHT = 1.3

# Face detection settings
FACE_MARGIN = 0.30  # Increased margin for better context
MIN_FACE_SIZE = 40  # Lower threshold for smaller faces
FACE_CONFIDENCE_THRESHOLD = 0.6

# v5 Enhancement settings - Optimized for 1GB RAM
MULTI_SCALE_SIZES = [1.0, 0.7]  # Reduced from [1.0, 0.75, 0.5]
FREQUENCY_WEIGHT = 1.5  # Weight for frequency domain analysis
COLOR_WEIGHT = 1.2  # Weight for color consistency


class MediaType:
    IMAGE = "image"
    VIDEO = "video"


class FaceInfo:
    """Information about a detected face."""
    def __init__(self, bbox: Tuple[int, int, int, int], confidence: float, index: int):
        self.bbox = bbox
        self.confidence = confidence
        self.index = index
        self.fake_score = 0.0
        self.real_score = 0.0


class DeepfakeDetector:
    """
    Production-ready Deepfake Detection v5.
    
    NEW in v5:
    - FFT Frequency Analysis (detects AI texture artifacts)
    - Color Consistency Check (unnatural skin colors)
    - Noise Pattern Analysis (inconsistent noise = fake)
    - Multi-Scale Face Analysis (artifacts at different scales)
    - Eye/Mouth Region Focus (highest manipulation areas)
    """
    
    def __init__(self):
        self.model = None
        self.processor = None
        self.device = "cpu" # Force CPU for free tier predictability
        self._loaded = False
        self.optimal_size = 384 # Reduced from 512
        self.face_cascade = None
        self._face_detector_loaded = False
        
    def load_model(self) -> None:
        """Load the detection model and face detector."""
        if self._loaded:
            return
        
        print(f"🔄 Loading Deepfake Detection Model v5...")
        print(f"   Device: {self.device}")
        print(f"   Video Support: {'✅ Enabled' if VIDEO_SUPPORT else '❌ Disabled'}")
        
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
        
        print("✅ Model ready! (v5 Enhanced Detection)\n")
    
    def _load_face_detector(self) -> None:
        """Load OpenCV face detector with multiple cascades."""
        if not VIDEO_SUPPORT:
            print("   ⚠️ Face detection requires OpenCV")
            return
            
        try:
            # Try different cascades for better detection
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
                    print(f"   ✅ Face Detector: {cascade}")
                    break
            
            if not self._face_detector_loaded:
                print("   ⚠️ Face Detector: Failed to load")
                
        except Exception as e:
            print(f"   ⚠️ Face Detector error: {e}")
    
    # ==================== NEW v5 ANALYSIS METHODS ====================
    
    def analyze_frequency_domain(self, image: Image.Image) -> Image.Image:
        """
        Analyze image in frequency domain using FFT.
        Deepfakes often have artifacts in high-frequency components.
        Returns the magnitude spectrum as an image for model analysis.
        """
        # Convert to grayscale numpy array
        gray = np.array(image.convert('L'), dtype=np.float32)
        
        # Apply FFT
        f_transform = np.fft.fft2(gray)
        f_shift = np.fft.fftshift(f_transform)
        
        # Get magnitude spectrum
        magnitude = np.log(np.abs(f_shift) + 1)
        
        # Normalize to 0-255
        magnitude = (magnitude / magnitude.max() * 255).astype(np.uint8)
        
        # Convert back to RGB PIL Image
        fft_image = Image.fromarray(magnitude).convert('RGB')
        fft_image = fft_image.resize((self.optimal_size, self.optimal_size), Image.LANCZOS)
        
        return fft_image
    
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
    
    # ==================== FACE DETECTION ====================
    
    def detect_faces(self, image: Image.Image) -> List[FaceInfo]:
        """Detect all faces in an image using OpenCV with multiple parameters."""
        if not self._face_detector_loaded:
            return []
        
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        
        # Try multiple detection parameters for better results
        all_faces = []
        
        for scale, neighbors in [(1.1, 5), (1.05, 3), (1.2, 6)]:
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=scale,
                minNeighbors=neighbors,
                minSize=(MIN_FACE_SIZE, MIN_FACE_SIZE),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            if len(faces) > 0:
                all_faces = faces
                break
        
        face_infos = []
        for i, (x, y, w, h) in enumerate(all_faces):
            aspect_ratio = w / h if h > 0 else 0
            size_score = min(1.0, (w * h) / (150 * 150))
            aspect_score = 1.0 - abs(1.0 - aspect_ratio) * 0.5
            confidence = (size_score + aspect_score) / 2
            
            if confidence >= FACE_CONFIDENCE_THRESHOLD:
                face_infos.append(FaceInfo(bbox=(x, y, w, h), confidence=confidence, index=i))
        
        return face_infos
    
    def extract_face_crop(self, image: Image.Image, face: FaceInfo) -> Image.Image:
        """Extract a face crop with margin from the image."""
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
        
        return face_crop
    
    def detect_media_type(self, url: str) -> str:
        """Detect if URL is image or video."""
        url_lower = url.lower()
        video_indicators = ['/video/', '.mp4', '.mov', '.avi', '.webm', '.mkv', 'video/upload']
        for indicator in video_indicators:
            if indicator in url_lower:
                return MediaType.VIDEO
        return MediaType.IMAGE
    
    def download_media(self, url: str) -> Tuple[bytes, str]:
        """Download media from URL."""
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        return response.content, self.detect_media_type(url)
    
    def download_image(self, url: str) -> Image.Image:
        """Download image from URL."""
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return Image.open(BytesIO(response.content)).convert("RGB")
    
    # ==================== IMAGE ANALYSIS v5 ====================
    
    def generate_image_frames(self, image: Image.Image) -> Tuple[List[Tuple[Image.Image, str, float]], List[FaceInfo]]:
        """
        Generate analysis frames with v5 enhanced techniques.
        """
        frames = []
        w, h = image.size
        size = self.optimal_size
        
        # Detect faces
        faces = self.detect_faces(image)
        print(f"   👤 Detected {len(faces)} face(s)")
        
        analysis_flags = {
            'frequency_suspicious': False,
            'color_suspicious': False,
            'noise_suspicious': False
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
        
        # If no faces, use enhanced center crops
        if not faces:
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
        
        return frames, faces
    
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
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                
                if ret:
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil_image = Image.fromarray(frame_rgb)
                    
                    frame_faces = self.detect_faces(pil_image)
                    
                    if frame_faces:
                        for j, face in enumerate(frame_faces):
                            face_crop = self.extract_face_crop(pil_image, face)
                            weight = 3.5 if (i == 0 or i == len(indices) - 1) else 2.5
                            frames.append((face_crop, f"f{i+1}_face{j+1}", weight))
                            all_faces.append(face)
                            
                            # Add FFT for video faces
                            if i % 2 == 0:  # Every other frame to save time
                                fft_face = self.analyze_frequency_domain(face_crop)
                                frames.append((fft_face, f"f{i+1}_face{j+1}_fft", weight * 0.6))
                            
                            # Add eye region for key frames
                            if i == 0 or i == len(indices) - 1:
                                eyes = self.extract_eye_region(face_crop)
                                if eyes:
                                    frames.append((eyes, f"f{i+1}_face{j+1}_eyes", weight * 0.8))
                    else:
                        resized = pil_image.resize((self.optimal_size, self.optimal_size), Image.LANCZOS)
                        weight = 2.0 if (i == 0 or i == len(indices) - 1) else 1.5
                        frames.append((resized, f"frame_{i+1}", weight))
            
            cap.release()
            
            print(f"   👤 Total faces detected: {len(all_faces)}")
            
            return frames, all_faces
            
        finally:
            os.unlink(temp_path)
    
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
                      is_video: bool = False) -> Tuple[Dict, List, dict]:
        """Analyze all frames and aggregate results."""
        if not self._loaded:
            self.load_model()
        
        total = len(frames)
        print(f"{'─'*70}")
        
        results = []
        weighted_fake = 0.0
        weighted_real = 0.0
        total_weight = 0.0
        fake_votes = 0
        face_scores = []
        fft_scores = []
        eye_scores = []
        
        start = time.time()
        
        for i, (frame, name, weight) in enumerate(frames):
            result = self.classify_single(frame)
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
            
            # Progress
            icon = "🔴" if result['fake'] > 0.5 else "🟢"
            elapsed = time.time() - start
            fps = (i + 1) / elapsed if elapsed > 0 else 0
            bar_len = 20
            filled = int((i + 1) * bar_len / total)
            bar = f"[{'█' * filled}{'░' * (bar_len - filled)}]"
            
            print(f"   {bar} {i+1:2d}/{total} | {name:16s} | w={weight:.1f} | {icon} {result['fake']*100:5.1f}%")
        
        elapsed = time.time() - start
        print(f"{'─'*70}")
        print(f"⏱️  {elapsed:.2f}s ({len(frames)/elapsed:.1f} fps)")
        
        # Base scores
        avg_fake = weighted_fake / total_weight
        avg_real = weighted_real / total_weight
        
        # Temporal boost for video
        temporal_boost = 0.0
        if is_video and len(results) > 2:
            temporal_boost = self.analyze_temporal_consistency(results)
            if temporal_boost > 0.05:
                print(f"⚡ Temporal inconsistency: +{temporal_boost*100:.1f}%")
                avg_fake += temporal_boost
        
        # FFT boost if frequency analysis is suspicious
        fft_boost = 0.0
        if fft_scores:
            avg_fft_fake = sum(fft_scores) / len(fft_scores)
            if avg_fft_fake > 0.6:
                fft_boost = (avg_fft_fake - 0.5) * 0.2
                print(f"📡 Frequency anomaly: +{fft_boost*100:.1f}%")
                avg_fake += fft_boost
        
        # Eye region boost
        eye_boost = 0.0
        if eye_scores:
            avg_eye_fake = sum(eye_scores) / len(eye_scores)
            if avg_eye_fake > 0.65:
                eye_boost = (avg_eye_fake - 0.5) * 0.15
                print(f"👁️  Eye region suspicious: +{eye_boost*100:.1f}%")
                avg_fake += eye_boost
        
        # Normalize
        total_prob = avg_fake + avg_real
        final_fake = avg_fake / total_prob
        final_real = avg_real / total_prob
        
        probs = {'fake': round(final_fake, 4), 'real': round(final_real, 4)}
        
        details = {
            'total_frames': total,
            'fake_votes': fake_votes,
            'real_votes': total - fake_votes,
            'vote_ratio': fake_votes / total,
            'processing_time': elapsed,
            'temporal_boost': temporal_boost if is_video else None,
            'fft_boost': fft_boost if fft_boost > 0 else None,
            'eye_boost': eye_boost if eye_boost > 0 else None,
            'faces_detected': len(faces),
            'face_scores': face_scores,
            'avg_face_score': sum(face_scores) / len(face_scores) if face_scores else None,
            'avg_fft_score': sum(fft_scores) / len(fft_scores) if fft_scores else None,
            'avg_eye_score': sum(eye_scores) / len(eye_scores) if eye_scores else None,
        }
        
        return probs, results, details
    
    def save_debug(self, frames: List, results: List, media_type: str) -> str:
        """Save debug images."""
        os.makedirs(DEBUG_DIR, exist_ok=True)
        
        for f in os.listdir(DEBUG_DIR):
            try:
                os.remove(os.path.join(DEBUG_DIR, f))
            except:
                pass
        
        ts = int(time.time())
        prefix = "VID" if media_type == MediaType.VIDEO else "IMG"
        
        for i, ((frame, name, weight), result) in enumerate(zip(frames, results)):
            fake_pct = result['fake'] * 100
            status = "FAKE" if fake_pct > 50 else "REAL"
            path = os.path.join(DEBUG_DIR, f"{prefix}_{i:02d}_{name}_{status}_{fake_pct:.0f}.jpg")
            frame.save(path, "JPEG", quality=90)
        
        return DEBUG_DIR
    
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
        """Analyze image with v5 enhanced techniques."""
        image = self.download_image(url)
        print(f"✅ Downloaded: {image.size[0]}x{image.size[1]} pixels")
        print(f"{'='*70}\n")
        
        print(f"🔬 DEEPFAKE ANALYSIS v5 (Enhanced Detection)")
        
        frames, faces = self.generate_image_frames(image)
        probs, results, details = self.analyze_frames(frames, faces, is_video=False)
        
        self.save_debug(frames, results, MediaType.IMAGE)
        
        return self._finalize(probs, details, "IMAGE")
    
    def _analyze_video(self, url: str) -> Tuple[Dict[str, float], str, float, dict]:
        """Analyze video with v5 enhanced techniques."""
        if not VIDEO_SUPPORT:
            raise RuntimeError("Video support requires OpenCV")
        
        content, _ = self.download_media(url)
        print(f"✅ Downloaded: {len(content) / 1024 / 1024:.1f} MB")
        print(f"{'='*70}\n")
        
        print(f"🎬 VIDEO ANALYSIS v5 (Enhanced Detection)")
        
        frames, faces = self.extract_video_frames(content)
        print(f"   Extracted {len(frames)} analysis frames")
        
        probs, results, details = self.analyze_frames(frames, faces, is_video=True)
        
        self.save_debug(frames, results, MediaType.VIDEO)
        
        return self._finalize(probs, details, "VIDEO")
    
    def _finalize(self, probs: Dict, details: dict, media_type: str) -> Tuple[Dict, str, float, dict]:
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
        
        print(f"{'='*70}\n")
        
        # Free memory
        import gc
        gc.collect()
        
        return probs, classification, confidence, details


# Global instance
detector = DeepfakeDetector()


def get_detector() -> DeepfakeDetector:
    """Get the global detector instance."""
    return detector
