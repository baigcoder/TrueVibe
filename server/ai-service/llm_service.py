"""
Multi-LLM Service for AI Report Generation
Supports: Google Gemini, OpenAI GPT (via ChatAnywhere), Groq
"""

import os
import json
import aiohttp
from typing import Dict, Optional, List, Any
from dataclasses import dataclass, asdict

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed, use system environment variables


# API Keys from environment
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GPT_API_KEY = os.environ.get("GPT5_API_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# API Endpoints
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
CHATANYWHERE_API_URL = "https://api.chatanywhere.tech/v1/chat/completions"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


@dataclass
class DetectionItem:
    """Single detection finding"""
    category: str
    detected: bool
    severity: str  # 'low', 'medium', 'high'
    explanation: str
    score: Optional[float] = None


@dataclass
class TechnicalDetail:
    """Technical analysis detail"""
    metric: str
    value: str
    interpretation: str


@dataclass
class AIReport:
    """Structured AI authenticity report"""
    verdict: str  # 'authentic', 'suspicious', 'fake'
    confidence: float
    summary: str
    detection_breakdown: List[DetectionItem]
    technical_details: List[TechnicalDetail]
    recommendations: List[str]
    model_used: str
    
    def to_dict(self) -> Dict:
        return {
            "verdict": self.verdict,
            "confidence": self.confidence,
            "summary": self.summary,
            "detectionBreakdown": [asdict(d) for d in self.detection_breakdown],
            "technicalDetails": [asdict(t) for t in self.technical_details],
            "recommendations": self.recommendations,
            "modelUsed": self.model_used
        }


def build_report_prompt(analysis_results: Dict) -> str:
    """Build the prompt for report generation"""
    fake_score = analysis_results.get("fake_score", 0)
    real_score = analysis_results.get("real_score", 1)
    classification = analysis_results.get("classification", "real")
    confidence = analysis_results.get("confidence", 0)
    faces_detected = analysis_results.get("faces_detected", 0)
    face_scores = analysis_results.get("face_scores", [])
    avg_face_score = analysis_results.get("avg_face_score")
    fft_boost = analysis_results.get("fft_boost")
    eye_boost = analysis_results.get("eye_boost")
    processing_time = analysis_results.get("processing_time_ms", 0)
    
    prompt = f"""You are an AI content authenticity expert. Analyze the following deepfake detection results and generate a detailed, user-friendly report.

## Detection Results:
- **Classification**: {classification.upper()}
- **Fake Score**: {fake_score * 100:.1f}%
- **Real Score**: {real_score * 100:.1f}%
- **Confidence**: {confidence * 100:.1f}%
- **Faces Detected**: {faces_detected}
- **Face Analysis Scores**: {face_scores if face_scores else 'N/A'}
- **Average Face Score**: {f'{avg_face_score * 100:.1f}%' if avg_face_score else 'N/A'}
- **FFT Frequency Anomaly Boost**: {f'+{fft_boost * 100:.1f}%' if fft_boost else 'None detected'}
- **Eye Region Anomaly Boost**: {f'+{eye_boost * 100:.1f}%' if eye_boost else 'None detected'}
- **Processing Time**: {processing_time}ms

## Your Task:
Generate a JSON report with exactly this structure:
{{
    "verdict": "authentic" | "suspicious" | "fake",
    "confidence": <0.0-1.0>,
    "summary": "<2-3 sentence summary explaining the verdict in plain language>",
    "detectionBreakdown": [
        {{
            "category": "<detection category>",
            "detected": <true/false>,
            "severity": "low" | "medium" | "high",
            "explanation": "<user-friendly explanation>",
            "score": <optional 0.0-1.0>
        }}
    ],
    "technicalDetails": [
        {{
            "metric": "<metric name>",
            "value": "<value string>",
            "interpretation": "<what this means>"
        }}
    ],
    "recommendations": ["<recommendation 1>", "<recommendation 2>", ...]
}}

Include these detection categories in breakdown:
1. Face Manipulation Detection
2. FFT Frequency Analysis (AI texture patterns)
3. Color Consistency Analysis
4. Noise Pattern Analysis
5. Eye Region Analysis

For recommendations, include:
- If FAKE/SUSPICIOUS: What signs indicate manipulation, what user can verify manually
- If AUTHENTIC: Confirmation of authenticity, general tips for content verification
- Always include an appeal option if user believes result is incorrect

Return ONLY valid JSON, no markdown formatting or extra text."""

    return prompt


async def call_gemini(prompt: str) -> Optional[str]:
    """Call Google Gemini API"""
    if not GEMINI_API_KEY:
        print("⚠️ Gemini API key not configured")
        return None
        
    url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.3,
            "topP": 0.8,
            "maxOutputTokens": 2048
        }
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, timeout=30) as response:
                if response.status == 200:
                    data = await response.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    print("✅ Gemini API call successful")
                    return text
                else:
                    error = await response.text()
                    print(f"❌ Gemini API error ({response.status}): {error}")
                    return None
    except Exception as e:
        print(f"❌ Gemini API exception: {e}")
        return None


async def call_groq(prompt: str) -> Optional[str]:
    """Call Groq API"""
    if not GROQ_API_KEY:
        print("⚠️ Groq API key not configured")
        return None
        
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are an AI content authenticity expert. Always respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 2048
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(GROQ_API_URL, headers=headers, json=payload, timeout=30) as response:
                if response.status == 200:
                    data = await response.json()
                    text = data["choices"][0]["message"]["content"]
                    print("✅ Groq API call successful")
                    return text
                else:
                    error = await response.text()
                    print(f"❌ Groq API error ({response.status}): {error}")
                    return None
    except Exception as e:
        print(f"❌ Groq API exception: {e}")
        return None


async def call_gpt(prompt: str) -> Optional[str]:
    """Call ChatAnywhere GPT API"""
    if not GPT_API_KEY:
        print("⚠️ GPT API key not configured")
        return None
        
    headers = {
        "Authorization": f"Bearer {GPT_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are an AI content authenticity expert. Always respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 2048
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(CHATANYWHERE_API_URL, headers=headers, json=payload, timeout=30) as response:
                if response.status == 200:
                    data = await response.json()
                    text = data["choices"][0]["message"]["content"]
                    print("✅ ChatAnywhere GPT API call successful")
                    return text
                else:
                    error = await response.text()
                    print(f"❌ ChatAnywhere GPT API error ({response.status}): {error}")
                    return None
    except Exception as e:
        print(f"❌ ChatAnywhere GPT API exception: {e}")
        return None


def parse_llm_response(response_text: str) -> Optional[Dict]:
    """Parse LLM response to extract JSON"""
    if not response_text:
        return None
    
    # Try to extract JSON from response
    text = response_text.strip()
    
    # Remove markdown code blocks if present
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    
    text = text.strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"⚠️ JSON parse error: {e}")
        # Try to find JSON object in text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except:
                pass
        return None


def create_fallback_report(analysis_results: Dict) -> AIReport:
    """Create a basic report if LLM calls fail"""
    fake_score = analysis_results.get("fake_score", 0)
    real_score = analysis_results.get("real_score", 1)
    classification = analysis_results.get("classification", "real")
    confidence = analysis_results.get("confidence", real_score)
    faces_detected = analysis_results.get("faces_detected", 0)
    
    # Determine verdict
    if fake_score > 0.6:
        verdict = "fake"
        severity = "high"
    elif fake_score > 0.4:
        verdict = "suspicious"
        severity = "medium"
    else:
        verdict = "authentic"
        severity = "low"
    
    # Build detection breakdown
    breakdown = [
        DetectionItem(
            category="Face Manipulation Detection",
            detected=faces_detected > 0 and fake_score > 0.5,
            severity=severity if fake_score > 0.5 else "low",
            explanation=f"Analyzed {faces_detected} face(s) with {fake_score * 100:.1f}% manipulation probability.",
            score=fake_score
        ),
        DetectionItem(
            category="FFT Frequency Analysis",
            detected=analysis_results.get("fft_boost") is not None,
            severity="medium" if analysis_results.get("fft_boost") else "low",
            explanation="Frequency domain analysis checks for AI-generated texture patterns.",
            score=analysis_results.get("avg_fft_score")
        ),
        DetectionItem(
            category="Noise Pattern Analysis",
            detected=False,
            severity="low",
            explanation="Noise consistency analysis checks for unnatural noise patterns common in synthetic images.",
            score=None
        ),
        DetectionItem(
            category="Color Consistency",
            detected=False,
            severity="low",
            explanation="Color distribution analysis checks for unnatural skin tones and color artifacts.",
            score=None
        ),
        DetectionItem(
            category="Eye Region Analysis",
            detected=analysis_results.get("eye_boost") is not None,
            severity="medium" if analysis_results.get("eye_boost") else "low",
            explanation="Eye region is typically the most manipulated area in deepfakes.",
            score=analysis_results.get("avg_eye_score")
        )
    ]
    
    # Build technical details
    technical = [
        TechnicalDetail(
            metric="Fake Score",
            value=f"{fake_score * 100:.1f}%",
            interpretation="Probability that the content has been manipulated"
        ),
        TechnicalDetail(
            metric="Real Score",
            value=f"{real_score * 100:.1f}%",
            interpretation="Probability that the content is authentic"
        ),
        TechnicalDetail(
            metric="Faces Detected",
            value=str(faces_detected),
            interpretation="Number of faces analyzed in the content"
        ),
        TechnicalDetail(
            metric="Model Version",
            value="v5 Enhanced",
            interpretation="SigLIP2-based deepfake detector with FFT and multi-scale analysis"
        )
    ]
    
    # Build recommendations
    if verdict == "fake":
        recommendations = [
            "This content shows signs of AI manipulation. Exercise caution before sharing.",
            "Look for visual artifacts around facial features, especially eyes and mouth.",
            "Check if the source is verified and trustworthy.",
            "If you believe this is a false detection, you can request a manual review."
        ]
        summary = f"Our AI analysis detected a {confidence * 100:.0f}% probability of manipulation. The content shows characteristics consistent with AI-generated or manipulated media."
    elif verdict == "suspicious":
        recommendations = [
            "This content shows some characteristics that may indicate manipulation.",
            "Verify the source of this content before sharing.",
            "Compare with other verified images from the same source if available.",
            "If you believe this is authentic, additional verification is recommended."
        ]
        summary = f"Our AI analysis found some potentially suspicious patterns with {confidence * 100:.0f}% confidence. The result is inconclusive and warrants further verification."
    else:
        recommendations = [
            "This content appears to be authentic based on our AI analysis.",
            "Always remain vigilant about media content you encounter online.",
            "Verified content can still be taken out of context.",
            "Report any concerns about specific content for manual review."
        ]
        summary = f"Our AI analysis indicates this content is authentic with {confidence * 100:.0f}% confidence. No significant manipulation markers were detected."
    
    return AIReport(
        verdict=verdict,
        confidence=confidence,
        summary=summary,
        detection_breakdown=breakdown,
        technical_details=technical,
        recommendations=recommendations,
        model_used="fallback"
    )


async def generate_report(analysis_results: Dict) -> AIReport:
    """
    Generate an AI report using multiple LLMs with fallback.
    Tries: Gemini -> Groq -> GPT -> Fallback
    """
    print("\n" + "="*60)
    print("🤖 GENERATING AI AUTHENTICITY REPORT")
    print("="*60)
    
    prompt = build_report_prompt(analysis_results)
    
    # Try LLMs in order of preference
    llms = [
        ("gemini", call_gemini),
        ("groq", call_groq),
        ("gpt", call_gpt)
    ]
    
    for name, call_fn in llms:
        print(f"\n📡 Trying {name.upper()}...")
        response = await call_fn(prompt)
        
        if response:
            parsed = parse_llm_response(response)
            if parsed:
                print(f"✅ Successfully generated report using {name.upper()}")
                
                # Build AIReport from parsed JSON
                try:
                    return AIReport(
                        verdict=parsed.get("verdict", "authentic"),
                        confidence=parsed.get("confidence", 0.5),
                        summary=parsed.get("summary", "Analysis complete."),
                        detection_breakdown=[
                            DetectionItem(**d) for d in parsed.get("detectionBreakdown", [])
                        ],
                        technical_details=[
                            TechnicalDetail(**t) for t in parsed.get("technicalDetails", [])
                        ],
                        recommendations=parsed.get("recommendations", []),
                        model_used=name
                    )
                except Exception as e:
                    print(f"⚠️ Error building report from {name}: {e}")
                    continue
    
    # All LLMs failed, use fallback
    print("\n⚠️ All LLM APIs failed, using fallback report generator")
    return create_fallback_report(analysis_results)
