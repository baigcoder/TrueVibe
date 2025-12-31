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
class FrameAnalysisItem:
    """Individual frame analysis result"""
    name: str
    weight: float
    fake_score: float
    status: str  # 'ok', 'suspicious'


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
    frame_analysis: Optional[List[FrameAnalysisItem]] = None
    
    def to_dict(self) -> Dict:
        result = {
            "verdict": self.verdict,
            "confidence": self.confidence,
            "summary": self.summary,
            "detectionBreakdown": [asdict(d) for d in self.detection_breakdown],
            "technicalDetails": [asdict(t) for t in self.technical_details],
            "recommendations": self.recommendations,
            "modelUsed": self.model_used
        }
        if self.frame_analysis:
            result["frameAnalysis"] = [asdict(f) for f in self.frame_analysis]
        return result



def build_report_prompt(analysis_results: Dict) -> str:
    """Build the prompt for report generation"""
    fake_score = analysis_results.get("fake_score", 0)
    real_score = analysis_results.get("real_score", 1)
    classification = analysis_results.get("classification", "real")
    confidence = analysis_results.get("confidence", 0)
    faces_detected = analysis_results.get("faces_detected", 0)
    face_scores = analysis_results.get("face_scores", [])
    avg_face_score = analysis_results.get("avg_face_score")
    avg_fft_score = analysis_results.get("avg_fft_score")
    avg_eye_score = analysis_results.get("avg_eye_score")
    fft_boost = analysis_results.get("fft_boost")
    eye_boost = analysis_results.get("eye_boost")
    temporal_boost = analysis_results.get("temporal_boost")
    processing_time = analysis_results.get("processing_time_ms", 0)
    media_type = analysis_results.get("media_type", "image")
    frames_analyzed = analysis_results.get("frames_analyzed", 0)
    frame_breakdown = analysis_results.get("frame_breakdown", [])
    
    # Build frame breakdown text for the prompt
    frame_details_text = ""
    if frame_breakdown:
        frame_details_text = "\n## Individual Frame Analysis:\n"
        for frame in frame_breakdown:
            status = "🔴 SUSPICIOUS" if frame.get('is_suspicious', False) else "🟢 OK"
            name = frame.get('name', 'unknown')
            weight = frame.get('weight', 0)
            fake = frame.get('fake_score', 0) * 100
            frame_details_text += f"- **{name}** (weight={weight}): {fake:.1f}% fake {status}\n"
    
    prompt = f"""You are an AI content authenticity expert. Analyze the following deepfake detection results and generate a detailed, user-friendly report.

## Detection Results:
- **Classification**: {classification.upper()}
- **Fake Score**: {fake_score * 100:.1f}%
- **Real Score**: {real_score * 100:.1f}%
- **Confidence**: {confidence * 100:.1f}%
- **Media Type**: {media_type}
- **Total Frames Analyzed**: {frames_analyzed if frames_analyzed else len(frame_breakdown)}

## Face Analysis:
- **Faces Detected**: {faces_detected}
- **Face Analysis Scores**: {face_scores if face_scores else 'N/A'}
- **Average Face Score**: {f'{avg_face_score * 100:.1f}%' if avg_face_score else 'N/A'}

## v7 Enhanced Analysis:
- **Average FFT Score**: {f'{avg_fft_score * 100:.1f}%' if avg_fft_score else 'N/A'}
- **Average Eye Region Score**: {f'{avg_eye_score * 100:.1f}%' if avg_eye_score else 'N/A'}
- **FFT Frequency Anomaly Boost**: {f'+{fft_boost * 100:.1f}%' if fft_boost else 'None detected'}
- **Eye Region Anomaly Boost**: {f'+{eye_boost * 100:.1f}%' if eye_boost else 'None detected'}
- **Temporal Boost**: {f'+{temporal_boost * 100:.1f}%' if temporal_boost else 'None detected'}
- **Processing Time**: {processing_time}ms
{frame_details_text}
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
            "score": <REQUIRED: must be 0.0-1.0 based on actual analysis data above>
        }}
    ],
    "frameAnalysis": [
        {{
            "name": "<frame name>",
            "weight": <weight value>,
            "fakeScore": <0.0-1.0>,
            "status": "ok" | "suspicious"
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

IMPORTANT: For detection breakdown, use ACTUAL SCORES from the data above:
1. Face Manipulation Detection - score MUST be {avg_face_score if avg_face_score else fake_score}
2. FFT Frequency Analysis (AI texture patterns) - score MUST be {avg_fft_score if avg_fft_score else fake_score * 0.8}
3. Color Consistency Analysis - score based on classification confidence
4. Noise Pattern Analysis - score derived from confidence level  
5. Eye Region Analysis - score MUST be {avg_eye_score if avg_eye_score else fake_score * 0.7}

For frameAnalysis: Include ALL frames from the Individual Frame Analysis section above. Copy the exact names, weights, and scores.

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
            value="v7 Enhanced",
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
    
    # Build frame analysis from input data
    frame_analysis = None
    if analysis_results.get("frame_breakdown"):
        frame_analysis = [
            FrameAnalysisItem(
                name=f.get("name", "unknown"),
                weight=float(f.get("weight", 0)),
                fake_score=float(f.get("fake_score", 0)),
                status="suspicious" if f.get("is_suspicious", False) else "ok"
            ) for f in analysis_results.get("frame_breakdown", [])
        ]
    
    return AIReport(
        verdict=verdict,
        confidence=confidence,
        summary=summary,
        detection_breakdown=breakdown,
        technical_details=technical,
        recommendations=recommendations,
        model_used="fallback",
        frame_analysis=frame_analysis
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
                    # Parse frame analysis if present
                    frame_analysis = None
                    if parsed.get("frameAnalysis"):
                        frame_analysis = [
                            FrameAnalysisItem(
                                name=f.get("name", "unknown"),
                                weight=float(f.get("weight", 0)),
                                fake_score=float(f.get("fakeScore", 0)),
                                status=f.get("status", "ok")
                            ) for f in parsed.get("frameAnalysis", [])
                        ]
                    
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
                        model_used=name,
                        frame_analysis=frame_analysis
                    )
                except Exception as e:
                    print(f"⚠️ Error building report from {name}: {e}")
                    continue
    
    # All LLMs failed, use fallback
    print("\n⚠️ All LLM APIs failed, using fallback report generator")
    return create_fallback_report(analysis_results)


# ============ AI CONTENT COPILOT ============

@dataclass
class CaptionSuggestion:
    """Generated caption suggestions"""
    captions: List[str]
    model_used: str
    
    def to_dict(self):
        return {
            "captions": self.captions,
            "model_used": self.model_used
        }


@dataclass
class HashtagSuggestion:
    """Suggested hashtags"""
    hashtags: List[str]
    trending: List[str]
    model_used: str
    
    def to_dict(self):
        return {
            "hashtags": self.hashtags,
            "trending": self.trending,
            "model_used": self.model_used
        }


@dataclass
class PostIdea:
    """Single post idea"""
    title: str
    caption: str
    hashtags: List[str]


@dataclass
class PostIdeasSuggestion:
    """Generated post ideas"""
    ideas: List[PostIdea]
    model_used: str
    
    def to_dict(self):
        return {
            "ideas": [{"title": i.title, "caption": i.caption, "hashtags": i.hashtags} for i in self.ideas],
            "model_used": self.model_used
        }


def build_caption_prompt(context: str, image_description: str = None) -> str:
    """Build prompt for caption generation"""
    image_info = f"\nImage description: {image_description}" if image_description else ""
    
    return f"""You are a social media content expert helping users create engaging captions for their posts.

Context/Topic: {context}{image_info}

Generate 3 creative, engaging captions for a social media post. The captions should be:
- Authentic and relatable (Gen-Z friendly)
- Include relevant emojis
- Varying in length (short, medium, long options)
- Engaging and shareable

Return ONLY valid JSON in this exact format:
{{
    "captions": [
        "First caption with emoji 🔥",
        "Second caption that's a bit longer with more context ✨",
        "Third caption option here 💯"
    ]
}}

Return ONLY the JSON, no markdown or extra text."""


def build_hashtag_prompt(content: str) -> str:
    """Build prompt for hashtag suggestions"""
    return f"""You are a social media expert specializing in hashtag optimization.

Post content: "{content}"

Analyze this content and suggest relevant hashtags that will maximize reach. Provide:
1. 6-8 relevant hashtags based on the content
2. 2-3 trending hashtags that could apply (popular general tags)

Return ONLY valid JSON in this exact format:
{{
    "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6"],
    "trending": ["trending1", "trending2"]
}}

Important:
- Do NOT include the # symbol
- Use lowercase only
- No spaces (use underscores if needed)
- Return ONLY the JSON, no markdown or extra text."""


def build_ideas_prompt(topic: str, style: str = "trendy") -> str:
    """Build prompt for post idea generation"""
    style_descriptions = {
        "trendy": "trendy, Gen-Z friendly, using current social media trends",
        "professional": "professional, polished, suitable for LinkedIn or business accounts",
        "casual": "casual, friendly, conversational tone",
        "humorous": "funny, witty, meme-worthy humor"
    }
    
    style_desc = style_descriptions.get(style, style_descriptions["trendy"])
    
    return f"""You are a creative social media strategist helping content creators generate post ideas.

Topic/Niche: {topic}
Style: {style_desc}

Generate 3 unique post ideas for this topic. Each idea should include:
- A catchy title/hook
- A ready-to-use caption with emojis
- 3-4 relevant hashtags

Return ONLY valid JSON in this exact format:
{{
    "ideas": [
        {{
            "title": "Catchy hook or title",
            "caption": "Full post caption with emojis ✨",
            "hashtags": ["tag1", "tag2", "tag3"]
        }},
        {{
            "title": "Second idea title",
            "caption": "Another creative caption 🔥",
            "hashtags": ["tag1", "tag2", "tag3"]
        }},
        {{
            "title": "Third idea title",
            "caption": "Third caption option 💯",
            "hashtags": ["tag1", "tag2", "tag3"]
        }}
    ]
}}

Return ONLY the JSON, no markdown or extra text."""


async def generate_caption(context: str, image_description: str = None) -> CaptionSuggestion:
    """
    Generate caption suggestions using LLMs.
    Tries: Gemini -> Groq -> GPT -> Fallback
    """
    print("\n" + "="*60)
    print("✨ GENERATING CAPTION SUGGESTIONS")
    print("="*60)
    
    prompt = build_caption_prompt(context, image_description)
    
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
            if parsed and "captions" in parsed:
                print(f"✅ Generated captions using {name.upper()}")
                return CaptionSuggestion(
                    captions=parsed["captions"][:3],
                    model_used=name
                )
    
    # Fallback captions
    print("⚠️ Using fallback caption generator")
    return CaptionSuggestion(
        captions=[
            f"Sharing some thoughts on {context} ✨",
            f"Here's my take on {context} 💯",
            f"{context.capitalize()} vibes today 🔥"
        ],
        model_used="fallback"
    )


async def suggest_hashtags(content: str) -> HashtagSuggestion:
    """
    Suggest hashtags for content using LLMs.
    Tries: Gemini -> Groq -> GPT -> Fallback
    """
    print("\n" + "="*60)
    print("#️⃣ SUGGESTING HASHTAGS")
    print("="*60)
    
    prompt = build_hashtag_prompt(content)
    
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
            if parsed and "hashtags" in parsed:
                print(f"✅ Generated hashtags using {name.upper()}")
                return HashtagSuggestion(
                    hashtags=parsed.get("hashtags", [])[:8],
                    trending=parsed.get("trending", [])[:3],
                    model_used=name
                )
    
    # Fallback hashtags
    print("⚠️ Using fallback hashtag generator")
    words = content.lower().split()[:5]
    return HashtagSuggestion(
        hashtags=[w.strip('.,!?') for w in words if len(w) > 3],
        trending=["fyp", "viral", "trending"],
        model_used="fallback"
    )


async def generate_post_ideas(topic: str, style: str = "trendy") -> PostIdeasSuggestion:
    """
    Generate post ideas for a topic using LLMs.
    Tries: Gemini -> Groq -> GPT -> Fallback
    """
    print("\n" + "="*60)
    print("💡 GENERATING POST IDEAS")
    print("="*60)
    
    prompt = build_ideas_prompt(topic, style)
    
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
            if parsed and "ideas" in parsed:
                print(f"✅ Generated ideas using {name.upper()}")
                ideas = []
                for idea in parsed["ideas"][:3]:
                    ideas.append(PostIdea(
                        title=idea.get("title", "Untitled"),
                        caption=idea.get("caption", ""),
                        hashtags=idea.get("hashtags", [])
                    ))
                return PostIdeasSuggestion(ideas=ideas, model_used=name)
    
    # Fallback ideas
    print("⚠️ Using fallback idea generator")
    return PostIdeasSuggestion(
        ideas=[
            PostIdea(
                title=f"My {topic} journey",
                caption=f"Sharing my experience with {topic} today! What's your take? ✨",
                hashtags=[topic.lower().replace(" ", ""), "lifestyle", "inspiration"]
            ),
            PostIdea(
                title=f"Behind the scenes",
                caption=f"Here's what {topic} looks like from my perspective 🔥",
                hashtags=[topic.lower().replace(" ", ""), "behindthescenes", "reallife"]
            ),
            PostIdea(
                title=f"Tips & tricks",
                caption=f"My top 3 tips for {topic} that actually work 💯",
                hashtags=[topic.lower().replace(" ", ""), "tips", "learnwitme"]
            )
        ],
        model_used="fallback"
    )
