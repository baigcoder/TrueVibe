"""
Deepfake Detection FastAPI Service
Provides REST API for analyzing images for deepfake content.

Security Hardening:
- API Key authentication
- Rate limiting
- Strict CORS
- Production-ready logging
"""

import os
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any
import traceback
import hashlib
import time
from functools import lru_cache
from threading import Lock
import numpy as np


def convert_numpy_types(obj: Any) -> Any:
    """
    Recursively convert numpy types to Python native types.
    Fixes PydanticSerializationError with numpy.int32, numpy.float64, etc.
    """
    if isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    else:
        return obj


# Simple in-memory cache with TTL for analysis results
class AnalysisCache:
    """Thread-safe in-memory cache with TTL for analysis results."""
    def __init__(self, max_size: int = 100, ttl_seconds: int = 3600):
        self._cache: Dict[str, tuple] = {}  # {hash: (result, timestamp)}
        self._lock = Lock()
        self._max_size = max_size
        self._ttl = ttl_seconds
    
    def _hash_url(self, url: str) -> str:
        return hashlib.md5(url.encode()).hexdigest()
    
    def get(self, url: str) -> Optional[Dict]:
        """Get cached result if exists and not expired."""
        key = self._hash_url(url)
        with self._lock:
            if key in self._cache:
                result, timestamp = self._cache[key]
                if time.time() - timestamp < self._ttl:
                    return result
                else:
                    del self._cache[key]
        return None
    
    def set(self, url: str, result: Dict) -> None:
        """Cache a result with current timestamp."""
        key = self._hash_url(url)
        with self._lock:
            # Evict oldest entries if cache is full
            if len(self._cache) >= self._max_size:
                oldest_key = min(self._cache, key=lambda k: self._cache[k][1])
                del self._cache[oldest_key]
            self._cache[key] = (result, time.time())
    
    def invalidate(self, url: str) -> None:
        """Remove a specific URL from cache."""
        key = self._hash_url(url)
        with self._lock:
            self._cache.pop(key, None)

# Global cache instance
analysis_cache = AnalysisCache(max_size=100, ttl_seconds=3600)  # 1 hour TTL

from model import get_detector, DEBUG_DIR
from llm_service import generate_report, AIReport, generate_caption, suggest_hashtags, generate_post_ideas

# PDF Report generation
try:
    from pdf_report import generate_pdf_report, PDF_SUPPORT
except ImportError:
    PDF_SUPPORT = False
    print("⚠️ PDF report module not available")

# Environment configuration
ENV = os.environ.get("ENV", "development")
IS_PROD = ENV == "production"
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO" if IS_PROD else "DEBUG")

# API Key configuration
API_KEY = os.environ.get("AI_SERVICE_API_KEY", "")
REQUIRE_API_KEY = IS_PROD or bool(API_KEY)

# CORS configuration
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5000,http://localhost:5173").split(",")

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s' if IS_PROD else '%(levelname)s: %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("ai-service")

# Disable verbose logging in production
if IS_PROD:
    logging.getLogger("transformers").setLevel(logging.WARNING)
    logging.getLogger("torch").setLevel(logging.WARNING)


# API Key validation
async def verify_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    """Verify API key for protected endpoints."""
    if not REQUIRE_API_KEY:
        return True
    
    if not x_api_key:
        logger.warning("Request without API key")
        raise HTTPException(status_code=401, detail="API key required")
    
    # Hash comparison to prevent timing attacks
    if not API_KEY:
        raise HTTPException(status_code=500, detail="Server misconfigured")
    
    # For per-user keys, we'd hash and lookup in DB
    # For now, simple comparison with service key
    provided_hash = hashlib.sha256(x_api_key.encode()).hexdigest()
    expected_hash = hashlib.sha256(API_KEY.encode()).hexdigest()
    
    if provided_hash != expected_hash:
        logger.warning("Invalid API key attempt")
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return True


# Request/Response models
class AnalyzeRequest(BaseModel):
    """Request model for image/video analysis."""
    image_url: HttpUrl
    force_reanalyze: bool = False  # Force fresh analysis, bypass cache
    

class AnalyzeResponse(BaseModel):
    """Response model for image analysis."""
    model_config = {"protected_namespaces": ()}  # Allow 'model_' prefix
    
    fake_score: float
    real_score: float
    classification: str  # "fake", "suspicious", or "real"
    confidence: float
    processing_time_ms: int
    model_version: str = "deepfake-detector-v7"
    faces_detected: int = 0
    face_scores: list = []
    avg_face_score: Optional[float] = None
    avg_fft_score: Optional[float] = None
    avg_eye_score: Optional[float] = None
    fft_boost: Optional[float] = None
    eye_boost: Optional[float] = None
    temporal_boost: Optional[float] = None
    # Phase 1: Advanced detection
    phase1_boost: Optional[float] = None
    compression_analysis: Optional[dict] = None
    exif_analysis: Optional[dict] = None
    blending_analysis: Optional[dict] = None
    # Phase 2: Enhanced detection
    phase2_boost: Optional[float] = None
    landmark_analysis: Optional[dict] = None
    ensemble_analysis: Optional[dict] = None
    debug_frames: Optional[list] = None  # Base64 encoded analysis frames for PDF report
    # NEW: Content classification and filter detection
    content_type: Optional[str] = None  # 'portrait', 'group', 'scene'
    has_filter: Optional[bool] = None
    filter_intensity: Optional[float] = None
    filter_analysis: Optional[dict] = None  # Detailed filter detection results
    multi_face_analysis: Optional[dict] = None  # Per-face breakdown for multi-face content



class HealthResponse(BaseModel):
    """Response model for health check."""
    model_config = {"protected_namespaces": ()}  # Allow 'model_' prefix
    
    status: str
    model_loaded: bool
    device: str
    memory_usage_mb: Optional[float] = None


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    detail: Optional[str] = None


# Report Generation Models
class ReportRequest(BaseModel):
    """Request model for report generation."""
    image_url: Optional[HttpUrl] = None
    analysis_results: Dict[str, Any]


class DetectionItemModel(BaseModel):
    category: str
    detected: bool
    severity: str
    explanation: str
    score: Optional[float] = None


class TechnicalDetailModel(BaseModel):
    metric: str
    value: str
    interpretation: str


class ReportResponse(BaseModel):
    """Response model for generated report."""
    verdict: str
    confidence: float
    summary: str
    detectionBreakdown: List[DetectionItemModel]
    technicalDetails: List[TechnicalDetailModel]
    recommendations: List[str]
    modelUsed: str


# ============ AI CONTENT COPILOT MODELS ============

class CaptionRequest(BaseModel):
    """Request for caption generation."""
    context: str
    image_description: Optional[str] = None


class CaptionResponse(BaseModel):
    """Response with generated captions."""
    captions: List[str]
    modelUsed: str


class HashtagRequest(BaseModel):
    """Request for hashtag suggestions."""
    content: str


class HashtagResponse(BaseModel):
    """Response with suggested hashtags."""
    hashtags: List[str]
    trending: List[str]
    modelUsed: str


class PostIdeaModel(BaseModel):
    """Single post idea."""
    title: str
    caption: str
    hashtags: List[str]


class IdeasRequest(BaseModel):
    """Request for post idea generation."""
    topic: str
    style: str = "trendy"  # trendy, professional, casual, humorous


class IdeasResponse(BaseModel):
    """Response with generated post ideas."""
    ideas: List[PostIdeaModel]
    modelUsed: str


# Lifespan context manager for model loading
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup."""
    logger.info("🚀 Starting Deepfake Detection Service...")
    detector = get_detector()
    detector.load_model()
    yield
    logger.info("👋 Shutting down service...")


# Create FastAPI app
app = FastAPI(
    title="Deepfake Detection Service",
    description="AI-powered deepfake detection for images using SigLIP2 model",
    version="2.0.0",
    lifespan=lifespan,
    docs_url=None if IS_PROD else "/docs",  # Disable docs in production
    redoc_url=None if IS_PROD else "/redoc",
)

# CORS middleware - strict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if IS_PROD else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*", "X-API-Key"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    Returns service status and model information.
    """
    detector = get_detector()
    
    # Get memory usage
    memory_mb = None
    try:
        import psutil
        process = psutil.Process()
        memory_mb = round(process.memory_info().rss / 1024 / 1024, 2)
    except ImportError:
        pass
    
    return HealthResponse(
        status="healthy",
        model_loaded=detector._loaded,
        device=detector.device,
        memory_usage_mb=memory_mb
    )


@app.post("/analyze", response_model=AnalyzeResponse, responses={
    400: {"model": ErrorResponse},
    401: {"model": ErrorResponse},
    500: {"model": ErrorResponse}
}, dependencies=[Depends(verify_api_key)])
async def analyze_image(request: AnalyzeRequest):
    """
    Analyze an image or video for deepfake content.
    Requires API key authentication.
    
    Set force_reanalyze=true to bypass cache and force fresh analysis.
    """
    start_time = time.time()
    url_str = str(request.image_url)
    
    try:
        logger.info(f"📥 New analysis request received (force_reanalyze={request.force_reanalyze})")
        
        # Check cache unless force_reanalyze is requested
        if not request.force_reanalyze:
            cached_result = analysis_cache.get(url_str)
            if cached_result:
                logger.info("📦 Returning cached analysis result")
                # Update processing time to indicate cache hit
                cached_result['processing_time_ms'] = 0
                # Convert numpy types to native Python (for old cache entries)
                cached_result = convert_numpy_types(cached_result)
                return AnalyzeResponse(**cached_result)
        else:
            # Invalidate cache when force_reanalyze is requested
            analysis_cache.invalidate(url_str)
            logger.info("🔄 Force reanalyze requested - cache invalidated")
        
        detector = get_detector()
        
        # Classify the image/video
        probs, classification, confidence, details = detector.classify_from_url(url_str)
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        logger.info(f"✅ Analysis complete in {processing_time_ms}ms - {classification}")
        
        # Build response
        result = {
            'fake_score': probs["fake"],
            'real_score': probs["real"],
            'classification': classification,
            'confidence': confidence,
            'processing_time_ms': processing_time_ms,
            'faces_detected': details.get('faces_detected', 0),
            'face_scores': details.get('face_scores', []),
            'avg_face_score': details.get('avg_face_score'),
            'avg_fft_score': details.get('avg_fft_score'),
            'avg_eye_score': details.get('avg_eye_score'),
            'fft_boost': details.get('fft_boost'),
            'eye_boost': details.get('eye_boost'),
            'temporal_boost': details.get('temporal_boost'),
            'phase1_boost': details.get('phase1_boost'),
            'compression_analysis': details.get('compression_analysis'),
            'exif_analysis': details.get('exif_analysis'),
            'blending_analysis': details.get('blending_analysis'),
            'phase2_boost': details.get('phase2_boost'),
            'landmark_analysis': details.get('landmark_analysis'),
            'ensemble_analysis': details.get('ensemble_analysis'),
            'debug_frames': details.get('debug_frames'),
            # NEW: Content classification and filter detection
            'content_type': details.get('content_type'),
            'has_filter': details.get('has_filter'),
            'filter_intensity': details.get('filter_intensity'),
            'filter_analysis': details.get('filter_analysis'),
            'multi_face_analysis': details.get('multi_face_analysis'),
            # NEW: Individual frame breakdown for detailed report
            'frame_breakdown': details.get('frame_breakdown'),
        }
        
        # Convert numpy types to native Python types (fixes PydanticSerializationError)
        result = convert_numpy_types(result)
        
        # Cache the result for future requests
        analysis_cache.set(url_str, result)
        
        return AnalyzeResponse(**result)
        
    except Exception as e:
        processing_time_ms = int((time.time() - start_time) * 1000)
        logger.error(f"❌ Analysis error: {str(e)}")
        if not IS_PROD:
            traceback.print_exc()
        
        if "404" in str(e) or "not found" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail=f"Could not download image from URL"
            )
        
        raise HTTPException(
            status_code=500,
            detail="Analysis failed" if IS_PROD else f"Analysis failed: {str(e)}"
        )


@app.post("/generate-report", response_model=ReportResponse, responses={
    400: {"model": ErrorResponse},
    401: {"model": ErrorResponse},
    500: {"model": ErrorResponse}
}, dependencies=[Depends(verify_api_key)])
async def generate_ai_report(request: ReportRequest):
    """
    Generate a detailed AI authenticity report.
    Requires API key authentication.
    """
    try:
        logger.info("📝 Generating AI authenticity report")
        
        # Generate report using LLM service
        report = await generate_report(request.analysis_results)
        
        logger.info(f"✅ Report generated using {report.model_used}")
        
        return ReportResponse(**report.to_dict())
        
    except Exception as e:
        logger.error(f"❌ Report generation error: {str(e)}")
        if not IS_PROD:
            traceback.print_exc()
        
        raise HTTPException(
            status_code=500,
            detail="Report generation failed" if IS_PROD else f"Report generation failed: {str(e)}"
        )


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "service": "TrueVibe AI Service",
        "version": "2.1.0 (Model v7)",
        "endpoints": {
            "health": "GET /health",
            "analyze": "POST /analyze (requires X-API-Key)",
            "generate_report": "POST /generate-report (requires X-API-Key)",
            "generate_caption": "POST /generate-caption (requires X-API-Key)",
            "suggest_hashtags": "POST /suggest-hashtags (requires X-API-Key)",
            "generate_ideas": "POST /generate-ideas (requires X-API-Key)"
        },
        "model": "deepfake-detector-model-v1 (SigLIP2-based)",
        "security": "API key required for protected endpoints"
    }


# ============ AI CONTENT COPILOT ENDPOINTS ============

@app.post("/generate-caption", response_model=CaptionResponse, responses={
    400: {"model": ErrorResponse},
    401: {"model": ErrorResponse},
    500: {"model": ErrorResponse}
}, dependencies=[Depends(verify_api_key)])
async def generate_caption_endpoint(request: CaptionRequest):
    """
    Generate creative captions for a post.
    Requires API key authentication.
    """
    try:
        logger.info("✨ Caption generation request")
        
        result = await generate_caption(request.context, request.image_description)
        
        return CaptionResponse(
            captions=result.captions,
            modelUsed=result.model_used
        )
        
    except Exception as e:
        logger.error(f"❌ Caption generation error: {str(e)}")
        if not IS_PROD:
            traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Caption generation failed" if IS_PROD else f"Caption generation failed: {str(e)}"
        )


@app.post("/suggest-hashtags", response_model=HashtagResponse, responses={
    400: {"model": ErrorResponse},
    401: {"model": ErrorResponse},
    500: {"model": ErrorResponse}
}, dependencies=[Depends(verify_api_key)])
async def suggest_hashtags_endpoint(request: HashtagRequest):
    """
    Suggest relevant hashtags for post content.
    Requires API key authentication.
    """
    try:
        logger.info("#️⃣ Hashtag suggestion request")
        
        result = await suggest_hashtags(request.content)
        
        return HashtagResponse(
            hashtags=result.hashtags,
            trending=result.trending,
            modelUsed=result.model_used
        )
        
    except Exception as e:
        logger.error(f"❌ Hashtag suggestion error: {str(e)}")
        if not IS_PROD:
            traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Hashtag suggestion failed" if IS_PROD else f"Hashtag suggestion failed: {str(e)}"
        )


@app.post("/generate-ideas", response_model=IdeasResponse, responses={
    400: {"model": ErrorResponse},
    401: {"model": ErrorResponse},
    500: {"model": ErrorResponse}
}, dependencies=[Depends(verify_api_key)])
async def generate_ideas_endpoint(request: IdeasRequest):
    """
    Generate creative post ideas for a topic.
    Requires API key authentication.
    """
    try:
        logger.info("💡 Post ideas request")
        
        result = await generate_post_ideas(request.topic, request.style)
        
        return IdeasResponse(
            ideas=[PostIdeaModel(
                title=idea.title,
                caption=idea.caption,
                hashtags=idea.hashtags
            ) for idea in result.ideas],
            modelUsed=result.model_used
        )
        
    except Exception as e:
        logger.error(f"❌ Ideas generation error: {str(e)}")
        if not IS_PROD:
            traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Ideas generation failed" if IS_PROD else f"Ideas generation failed: {str(e)}"
        )


# ============ PDF REPORT GENERATION ============

class PDFReportRequest(BaseModel):
    """Request model for PDF report generation."""
    analysis_results: Dict[str, Any]
    report_content: Dict[str, Any]
    analyzed_image_url: Optional[str] = None  # URL of the analyzed image


class PDFReportResponse(BaseModel):
    """Response model for generated PDF report."""
    pdf_base64: str
    filename: str
    success: bool
    message: str


@app.post("/generate-pdf-report", response_model=PDFReportResponse, responses={
    400: {"model": ErrorResponse},
    401: {"model": ErrorResponse},
    500: {"model": ErrorResponse}
}, dependencies=[Depends(verify_api_key)])
async def generate_pdf_report_endpoint(request: PDFReportRequest):
    """
    Generate a professional PDF report with embedded debug images.
    Requires API key authentication.
    """
    try:
        logger.info("📄 PDF report generation request")
        
        if not PDF_SUPPORT:
            raise HTTPException(
                status_code=500,
                detail="PDF generation not available - ReportLab not installed"
            )
        
        # Generate PDF with debug frames from the stored analysis
        pdf_bytes = generate_pdf_report(
            analysis_results=request.analysis_results,
            report_content=request.report_content,
            debug_image_dir=None,  # Don't use disk images - use debug_frames from analysis instead
            analyzed_image_url=request.analyzed_image_url
        )
        
        # Convert to base64
        import base64
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        # Generate filename
        from datetime import datetime
        filename = f"truevibe_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        logger.info(f"✅ PDF report generated: {len(pdf_bytes)} bytes")
        
        return PDFReportResponse(
            pdf_base64=pdf_base64,
            filename=filename,
            success=True,
            message="PDF report generated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ PDF generation error: {str(e)}")
        if not IS_PROD:
            traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="PDF generation failed" if IS_PROD else f"PDF generation failed: {str(e)}"
        )


@app.get("/debug-images", responses={
    401: {"model": ErrorResponse},
    500: {"model": ErrorResponse}
}, dependencies=[Depends(verify_api_key)])
async def list_debug_images():
    """
    List available debug images from the last analysis.
    Requires API key authentication.
    """
    try:
        images = []
        if os.path.exists(DEBUG_DIR):
            for f in sorted(os.listdir(DEBUG_DIR)):
                if f.endswith(('.jpg', '.jpeg', '.png')):
                    images.append({
                        "filename": f,
                        "path": os.path.join(DEBUG_DIR, f)
                    })
        
        return {
            "debug_dir": DEBUG_DIR,
            "images": images,
            "count": len(images)
        }
        
    except Exception as e:
        logger.error(f"❌ Debug images list error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list debug images: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
