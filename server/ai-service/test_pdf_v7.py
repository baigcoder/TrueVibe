
import os
import sys
import base64
from datetime import datetime

# Add the current directory to sys.path to import pdf_report
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

try:
    from pdf_report import generate_pdf_report
    print("✅ Successfully imported generate_pdf_report")
except ImportError as e:
    print(f"❌ Failed to import generate_pdf_report: {e}")
    sys.exit(1)

def create_test_pdf():
    # Mock analysis results
    analysis_results = {
        'fake_score': 0.85,
        'real_score': 0.15,
        'faces_detected': 1,
        'face_scores': [0.85],
        'avg_face_score': 0.85,
        'avg_fft_score': 0.72,
        'avg_eye_score': 0.91,
        'fft_boost': 0.12,
        'eye_boost': 0.08,
        'processing_time_ms': 1250,
        'model_version': 'v7',
        'face_type': 'ai_generated',
        'skin_boost': 0.05,
        'phase1_boost': 0.03,
        'phase2_boost': 0.02,
        'ai_art_boost': 0.15,
        'ai_art_analysis': {
            'ai_generator': 'stable_diffusion',
            'combined_score': 0.88,
            'ai_signatures': ['denoising_noise', 'edge_artifacts']
        },
        'video_analysis': {
            'consistency_score': 0.45,
            'lip_sync_score': 0.32,
            'all_issues': ['unnatural_motion', 'lighting_flicker']
        },
        'video_boost': 0.10,
        'debug_frames': [
            {
                'image_base64': base64.b64encode(open('test_image.jpg', 'rb').read()).decode('utf-8') if os.path.exists('test_image.jpg') else '',
                'status': 'FAKE',
                'fake_score': 0.92
            }
        ] * 4,
        'annotated_image': base64.b64encode(open('test_image.jpg', 'rb').read()).decode('utf-8') if os.path.exists('test_image.jpg') else '',
        'heatmap_image': ''
    }

    # Mock report content
    report_content = {
        'verdict': 'fake',
        'confidence': 0.94,
        'summary': "This is a comprehensive test summary for the TrueVibe v7 PDF report. The analysis detected significant manipulation artifacts in the frequency domain and eye region, suggesting high probability of AI generation.",
        'detectionBreakdown': [
            {'category': 'Face Analysis', 'detected': True, 'severity': 'high', 'score': 0.85},
            {'category': 'FFT Frequency', 'detected': True, 'severity': 'medium', 'score': 0.72},
            {'category': 'AI Art Signature', 'detected': True, 'severity': 'high', 'score': 0.88}
        ],
        'recommendations': [
            "Verify the source of this media.",
            "Check for EXIF metadata discrepancies.",
            "Compare with known authentic images of the subject."
        ]
    }

    print("🚀 Starting PDF generation test...")
    try:
        pdf_bytes = generate_pdf_report(
            analysis_results=analysis_results,
            report_content=report_content,
            analyzed_image_url=None
        )
        
        output_file = f"test_report_v7_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        with open(output_file, 'wb') as f:
            f.write(pdf_bytes)
        
        print(f"✅ PDF generated successfully: {output_file} ({len(pdf_bytes)} bytes)")
        return True
    except Exception as e:
        print(f"❌ PDF generation failed with error:")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    create_test_pdf()
