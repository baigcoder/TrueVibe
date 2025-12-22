"""
Deepfake Detection FastAPI Service
Provides REST API for analyzing images for deepfake content.
"""

import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any
import traceback

from model import get_detector
from llm_service import generate_report, AIReport


# Request/Response models
class AnalyzeRequest(BaseModel):
    """Request model for image analysis."""
    image_url: HttpUrl
    

class AnalyzeResponse(BaseModel):
    """Response model for image analysis."""
    fake_score: float
    real_score: float
    classification: str  # "fake", "suspicious", or "real"
    confidence: float
    processing_time_ms: int
    model_version: str = "deepfake-detector-v4"
    faces_detected: int = 0
    face_scores: list = []
    avg_face_score: Optional[float] = None


class HealthResponse(BaseModel):
    """Response model for health check."""
    status: str
    model_loaded: bool
    device: str


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


# Lifespan context manager for model loading
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model on startup."""
    print("🚀 Starting Deepfake Detection Service...")
    detector = get_detector()
    detector.load_model()
    yield
    print("👋 Shutting down service...")


# Create FastAPI app
app = FastAPI(
    title="Deepfake Detection Service",
    description="AI-powered deepfake detection for images using SigLIP2 model",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    Returns service status and model information.
    """
    detector = get_detector()
    return HealthResponse(
        status="healthy",
        model_loaded=detector._loaded,
        device=detector.device
    )


@app.post("/analyze", response_model=AnalyzeResponse, responses={
    400: {"model": ErrorResponse},
    500: {"model": ErrorResponse}
})
async def analyze_image(request: AnalyzeRequest):
    """
    Analyze an image for deepfake content.
    
    Downloads the image from the provided URL and runs it through
    the deepfake detection model.
    
    Args:
        request: Contains the image URL to analyze
        
    Returns:
        Analysis results including fake/real scores and classification
    """
    start_time = time.time()
    
    try:
        print(f"\n{'='*50}")
        print(f"🆕 NEW ANALYSIS REQUEST RECEIVED")
        print(f"{'='*50}")
        
        detector = get_detector()
        
        # Classify the image - now returns details too
        probs, classification, confidence, details = detector.classify_from_url(str(request.image_url))
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        print(f"📤 SENDING TO NODE.JS / POST FEED...")
        
        response = AnalyzeResponse(
            fake_score=probs["fake"],
            real_score=probs["real"],
            classification=classification,
            confidence=confidence,
            processing_time_ms=processing_time_ms,
            faces_detected=details.get('faces_detected', 0),
            face_scores=details.get('face_scores', []),
            avg_face_score=details.get('avg_face_score'),
        )
        
        print(f"✅ SENT! Response ready in {processing_time_ms}ms")
        print(f"{'='*50}\n")
        
        return response
        
    except Exception as e:
        processing_time_ms = int((time.time() - start_time) * 1000)
        print(f"❌ Analysis error: {str(e)}")
        traceback.print_exc()
        
        if "404" in str(e) or "not found" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail=f"Could not download image from URL: {str(e)}"
            )
        
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@app.post("/generate-report", response_model=ReportResponse, responses={
    400: {"model": ErrorResponse},
    500: {"model": ErrorResponse}
})
async def generate_ai_report(request: ReportRequest):
    """
    Generate a detailed AI authenticity report.
    
    Uses multiple LLMs (Gemini, Groq, GPT) to create a comprehensive
    explanation of the deepfake detection results.
    
    Args:
        request: Contains analysis results and optional image URL
        
    Returns:
        Detailed report with verdict, explanations, and recommendations
    """
    try:
        print(f"\n{'='*50}")
        print(f"📝 GENERATING AI AUTHENTICITY REPORT")
        print(f"{'='*50}")
        
        # Generate report using LLM service
        report = await generate_report(request.analysis_results)
        
        print(f"✅ Report generated using {report.model_used}")
        print(f"   Verdict: {report.verdict} ({report.confidence * 100:.1f}%)")
        print(f"{'='*50}\n")
        
        return ReportResponse(**report.to_dict())
        
    except Exception as e:
        print(f"❌ Report generation error: {str(e)}")
        traceback.print_exc()
        
        raise HTTPException(
            status_code=500,
            detail=f"Report generation failed: {str(e)}"
        )


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "service": "Deepfake Detection API",
        "version": "2.0.0",
        "endpoints": {
            "health": "GET /health",
            "analyze": "POST /analyze",
            "generate_report": "POST /generate-report"
        },
        "model": "deepfake-detector-model-v1 (SigLIP2-based)",
        "llm_support": ["gemini", "groq", "gpt"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
