"""
Professional PDF Report Generator for TrueVibe v7
Enhanced with gauges, charts, comprehensive breakdown, and analysis frames.
"""

import os
import io
import base64
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

# PDF Generation imports
PDF_SUPPORT = False
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch, cm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        Image as RLImage, PageBreak, HRFlowable, KeepTogether, ListFlowable, ListItem
    )
    from reportlab.graphics.shapes import Drawing, Rect, String, Circle, Line, Wedge
    from reportlab.graphics.charts.piecharts import Pie
    from reportlab.graphics.charts.barcharts import VerticalBarChart
    from reportlab.graphics.widgets.grids import Grid
    PDF_SUPPORT = True
except ImportError:
    print("⚠️ ReportLab not installed - PDF generation disabled")
    colors = None
    A4 = (595.27, 841.89)

from PIL import Image

# Visual annotations for heatmaps and bounding boxes
try:
    from visual_annotations import (
        create_full_annotated_image,
        create_annotated_comparison,
        image_to_base64,
        ManipulationRegion
    )
    ANNOTATIONS_AVAILABLE = True
except ImportError:
    ANNOTATIONS_AVAILABLE = False
    print("⚠️ Visual annotations module not available")


@dataclass
class ReportData:
    """Data structure for PDF report generation."""
    verdict: str
    confidence: float
    fake_score: float
    real_score: float
    faces_detected: int
    face_scores: List[float]
    avg_face_score: Optional[float]
    avg_fft_score: Optional[float]
    avg_eye_score: Optional[float]
    fft_boost: Optional[float]
    eye_boost: Optional[float]
    temporal_boost: Optional[float]
    processing_time_ms: int
    model_version: str
    debug_images: List[str]
    detection_breakdown: List[Dict[str, Any]]
    technical_details: List[Dict[str, Any]]
    recommendations: List[str]
    summary: str
    analyzed_image_url: Optional[str] = None
    debug_frames: Optional[List[Dict[str, Any]]] = None
    annotated_image: Optional[str] = None
    heatmap_image: Optional[str] = None
    ai_art_analysis: Optional[Dict[str, Any]] = None
    video_analysis: Optional[Dict[str, Any]] = None
    ai_art_boost: Optional[float] = None
    video_boost: Optional[float] = None
    face_type: Optional[str] = None
    skin_boost: Optional[float] = None
    phase1_boost: Optional[float] = None
    phase2_boost: Optional[float] = None
    compression_analysis: Optional[Dict[str, Any]] = None
    exif_analysis: Optional[Dict[str, Any]] = None
    blending_analysis: Optional[Dict[str, Any]] = None
    landmark_analysis: Optional[Dict[str, Any]] = None


def generate_pdf_report(
    analysis_results: Dict[str, Any],
    report_content: Dict[str, Any],
    debug_image_dir: Optional[str] = None,
    analyzed_image_url: Optional[str] = None
) -> bytes:
    """Generate a professional PDF report."""
    if not PDF_SUPPORT:
        raise RuntimeError("ReportLab not installed - cannot generate PDF")
    
    debug_images = []
    if debug_image_dir and os.path.exists(debug_image_dir):
        for f in sorted(os.listdir(debug_image_dir)):
            if f.endswith(('.jpg', '.jpeg', '.png')):
                debug_images.append(os.path.join(debug_image_dir, f))
    
    report_data = ReportData(
        verdict=report_content.get('verdict', 'authentic'),
        confidence=report_content.get('confidence', 0.5),
        fake_score=analysis_results.get('fake_score', 0),
        real_score=analysis_results.get('real_score', 1),
        faces_detected=analysis_results.get('faces_detected', 0),
        face_scores=analysis_results.get('face_scores', []),
        avg_face_score=analysis_results.get('avg_face_score'),
        avg_fft_score=analysis_results.get('avg_fft_score'),
        avg_eye_score=analysis_results.get('avg_eye_score'),
        fft_boost=analysis_results.get('fft_boost'),
        eye_boost=analysis_results.get('eye_boost'),
        temporal_boost=analysis_results.get('temporal_boost'),
        processing_time_ms=analysis_results.get('processing_time_ms', 0),
        model_version=analysis_results.get('model_version', 'v7'),
        debug_images=debug_images,
        detection_breakdown=report_content.get('detectionBreakdown', []),
        technical_details=report_content.get('technicalDetails', []),
        recommendations=report_content.get('recommendations', []),
        summary=report_content.get('summary', 'Analysis complete.'),
        analyzed_image_url=analyzed_image_url,
        debug_frames=analysis_results.get('debug_frames'),
        annotated_image=analysis_results.get('annotated_image'),
        heatmap_image=analysis_results.get('heatmap_image'),
        ai_art_analysis=analysis_results.get('ai_art_analysis'),
        video_analysis=analysis_results.get('video_analysis'),
        ai_art_boost=analysis_results.get('ai_art_boost'),
        video_boost=analysis_results.get('video_boost'),
        face_type=analysis_results.get('face_type'),
        skin_boost=analysis_results.get('skin_boost'),
        phase1_boost=analysis_results.get('phase1_boost'),
        phase2_boost=analysis_results.get('phase2_boost'),
        compression_analysis=analysis_results.get('compression_analysis'),
        exif_analysis=analysis_results.get('exif_analysis'),
        blending_analysis=analysis_results.get('blending_analysis'),
        landmark_analysis=analysis_results.get('landmark_analysis'),
    )
    
    return _generate_pdf_internal(report_data)


# ==================== COLOR SCHEME ====================
COLORS = None

def init_colors():
    global COLORS
    COLORS = {
        'primary': colors.HexColor('#6366F1'),      # Indigo
        'primary_light': colors.HexColor('#818CF8'),
        'secondary': colors.HexColor('#10B981'),    # Emerald
        'secondary_light': colors.HexColor('#34D399'),
        'danger': colors.HexColor('#EF4444'),       # Red
        'danger_light': colors.HexColor('#F87171'),
        'warning': colors.HexColor('#F59E0B'),      # Amber
        'warning_light': colors.HexColor('#FBBF24'),
        'info': colors.HexColor('#3B82F6'),         # Blue
        'info_light': colors.HexColor('#60A5FA'),
        'dark': colors.HexColor('#0F172A'),         # Slate 900
        'dark_medium': colors.HexColor('#1E293B'),  # Slate 800
        'slate': colors.HexColor('#64748B'),        # Slate 500
        'slate_light': colors.HexColor('#94A3B8'),  # Slate 400
        'light': colors.HexColor('#E2E8F0'),        # Slate 200
        'lighter': colors.HexColor('#F8FAFC'),      # Slate 50
        'white': colors.white,
        'black': colors.black,
        'purple': colors.HexColor('#A855F7'),
        'cyan': colors.HexColor('#06B6D4'),
    }


def get_score_color(score: float):
    """Get color based on score (0-1). Higher = more suspicious/fake."""
    if score < 0.3:
        return COLORS['secondary']
    elif score < 0.5:
        return COLORS['info']
    elif score < 0.7:
        return COLORS['warning']
    else:
        return COLORS['danger']


def get_verdict_colors(verdict: str):
    """Get background and text colors for verdict."""
    if verdict == 'fake':
        return COLORS['danger'], COLORS['white']
    elif verdict == 'suspicious':
        return COLORS['warning'], COLORS['dark']
    else:
        return COLORS['secondary'], COLORS['white']


# ==================== CHART HELPERS ====================

def create_donut_chart(fake_score: float, real_score: float, size: int = 120) -> Drawing:
    """Create a donut chart showing fake vs real distribution using wedges."""
    drawing = Drawing(size, size)
    
    cx, cy = size // 2, size // 2
    outer_radius = size // 2 - 5
    inner_radius = outer_radius - 18
    
    # Calculate angles (pie chart style, starting from 90 degrees / top)
    fake_angle = fake_score * 360
    
    # Draw fake portion (red) - from 90 to 90 - fake_angle
    if fake_score > 0.01:
        fake_wedge = Wedge(cx, cy, outer_radius, 90, 90 - fake_angle, 
                          fillColor=COLORS['danger'], strokeColor=None)
        drawing.add(fake_wedge)
    
    # Draw real portion (green) - remaining arc
    if real_score > 0.01:
        real_wedge = Wedge(cx, cy, outer_radius, 90 - fake_angle, 90 - 360, 
                          fillColor=COLORS['secondary'], strokeColor=None)
        drawing.add(real_wedge)
    
    # Inner circle to create donut effect
    inner_circle = Circle(cx, cy, inner_radius, 
                          fillColor=COLORS['white'], strokeColor=None)
    drawing.add(inner_circle)
    
    # Center text
    fake_pct = int(fake_score * 100)
    label = String(cx, cy + 2, f"{fake_pct}%", 
                   fontSize=16, fontName='Helvetica-Bold',
                   textAnchor='middle', fillColor=COLORS['dark'])
    drawing.add(label)
    
    sublabel = String(cx, cy - 12, "Fake", 
                      fontSize=8, fontName='Helvetica',
                      textAnchor='middle', fillColor=COLORS['slate'])
    drawing.add(sublabel)
    
    return drawing


def create_bar_chart(scores: List[tuple], width: int = 250, height: int = 100) -> Drawing:
    """Create a horizontal bar chart for scores."""
    drawing = Drawing(width, height)
    
    bar_height = 14
    spacing = 22
    y_offset = height - 20
    
    for i, (label, score) in enumerate(scores[:4]):
        y = y_offset - (i * spacing)
        
        # Background bar
        bg_bar = Rect(60, y, width - 80, bar_height, 
                      fillColor=COLORS['light'], strokeColor=None, rx=3, ry=3)
        drawing.add(bg_bar)
        
        # Score bar
        bar_width = max(3, (score * (width - 80)))
        score_color = get_score_color(score)
        score_bar = Rect(60, y, bar_width, bar_height,
                         fillColor=score_color, strokeColor=None, rx=3, ry=3)
        drawing.add(score_bar)
        
        # Label
        label_text = String(2, y + 4, label[:10], fontSize=8, fontName='Helvetica',
                           textAnchor='start', fillColor=COLORS['slate'])
        drawing.add(label_text)
        
        # Percentage
        pct_text = String(width - 5, y + 4, f"{score*100:.0f}%", fontSize=8, fontName='Helvetica-Bold',
                         textAnchor='end', fillColor=COLORS['dark'])
        drawing.add(pct_text)
    
    return drawing


def create_gauge(score: float, label: str, size: int = 80) -> Drawing:
    """Create a semi-circular gauge."""
    drawing = Drawing(size, size // 2 + 25)
    
    cx, cy = size // 2, size // 2 + 5
    radius = size // 2 - 8
    
    # Background arc
    bg_wedge = Wedge(cx, cy, radius, 180, 0, 
                     fillColor=COLORS['light'], strokeColor=None)
    drawing.add(bg_wedge)
    
    # Score arc
    angle = 180 - (min(score, 1.0) * 180)
    score_color = get_score_color(score)
    score_wedge = Wedge(cx, cy, radius, 180, angle,
                        fillColor=score_color, strokeColor=None)
    drawing.add(score_wedge)
    
    # Inner circle (makes it look like a gauge)
    inner_circle = Circle(cx, cy, radius - 12, 
                          fillColor=COLORS['white'], strokeColor=None)
    drawing.add(inner_circle)
    
    # Score text
    score_text = String(cx, cy - 5, f"{score*100:.0f}%", 
                        fontSize=12, fontName='Helvetica-Bold',
                        textAnchor='middle', fillColor=score_color)
    drawing.add(score_text)
    
    # Label
    label_text = String(cx, 3, label, fontSize=7, fontName='Helvetica',
                        textAnchor='middle', fillColor=COLORS['slate'])
    drawing.add(label_text)
    
    return drawing


# ==================== MAIN PDF GENERATION ====================

def _generate_pdf_internal(data: ReportData) -> bytes:
    """Generate the PDF report with modern professional design."""
    
    init_colors()
    
    # Create styles
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='TVHeader',
        fontSize=20,
        leading=24,
        textColor=COLORS['white'],
        fontName='Helvetica-Bold',
    ))
    
    styles.add(ParagraphStyle(
        name='TVSection',
        fontSize=13,
        leading=16,
        textColor=COLORS['primary'],
        fontName='Helvetica-Bold',
        spaceBefore=14,
        spaceAfter=8,
    ))
    
    styles.add(ParagraphStyle(
        name='TVSubsection',
        fontSize=10,
        leading=13,
        textColor=COLORS['dark'],
        fontName='Helvetica-Bold',
        spaceBefore=8,
        spaceAfter=4,
    ))
    
    styles.add(ParagraphStyle(
        name='TVBody',
        fontSize=9,
        leading=13,
        textColor=COLORS['slate'],
        fontName='Helvetica',
        alignment=TA_JUSTIFY
    ))
    
    styles.add(ParagraphStyle(
        name='TVSmall',
        fontSize=8,
        leading=10,
        textColor=COLORS['slate_light'],
        fontName='Helvetica',
    ))
    
    elements = []
    from io import BytesIO
    from PIL import Image as PILImage
    
    # ==================== HEADER ====================
    report_id = f"TVR-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    header_content = [
        [Paragraph("<font size='18' color='#FFFFFF'><b>🛡️ TrueVibe</b></font>", ParagraphStyle('H1', alignment=TA_LEFT)),
         Paragraph(f"<font size='8' color='#94A3B8'>AI AUTHENTICITY REPORT<br/>{datetime.now().strftime('%B %d, %Y')}</font>", 
                   ParagraphStyle('H2', alignment=TA_RIGHT))]
    ]
    header = Table(header_content, colWidths=[4*inch, 3*inch])
    header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLORS['dark']),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (0, 0), 16),
        ('RIGHTPADDING', (-1, 0), (-1, 0), 16),
    ]))
    elements.append(header)
    elements.append(Spacer(1, 16))
    
    # ==================== VERDICT SECTION ====================
    verdict_bg, verdict_fg = get_verdict_colors(data.verdict)
    verdict_text = {
        'fake': '⛔ MANIPULATED CONTENT DETECTED',
        'suspicious': '⚠️ SUSPICIOUS CONTENT', 
        'authentic': '✅ AUTHENTIC CONTENT VERIFIED',
        'real': '✅ AUTHENTIC CONTENT VERIFIED'
    }.get(data.verdict, '✅ AUTHENTIC CONTENT VERIFIED')
    
    verdict_card = Table([
        [Paragraph(f"<font size='22' color='#FFFFFF'><b>{verdict_text}</b></font>", 
                   ParagraphStyle('VT', alignment=TA_CENTER))],
        [Paragraph(f"<font size='11' color='#FFFFFF'>Confidence Level: <b>{data.confidence*100:.1f}%</b></font>", 
                   ParagraphStyle('VC', alignment=TA_CENTER))]
    ], colWidths=[7*inch], rowHeights=[45, 25])
    
    verdict_card.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), verdict_bg),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (0, 0), 10),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 8),
        ('ROUNDEDCORNERS', [8, 8, 8, 8]),
    ]))
    elements.append(verdict_card)
    elements.append(Spacer(1, 16))
    
    # ==================== EXECUTIVE SUMMARY ====================
    elements.append(Paragraph("📋 Executive Summary", styles['TVSection']))
    
    summary_text = data.summary if data.summary else (
        f"The AI analysis system performed a comprehensive scan of the submitted media using "
        f"multi-layer detection techniques including SigLIP2 neural classification, FFT frequency analysis, "
        f"eye region examination, and skin texture validation. "
        f"The content was classified as <b>{data.verdict.upper()}</b> with "
        f"<b>{data.confidence*100:.1f}%</b> confidence. "
        f"{'Manipulation artifacts were detected in multiple analysis layers.' if data.fake_score > 0.5 else 'No significant manipulation indicators were found.'}"
    )
    
    summary_box = Table([
        [Paragraph(f"<font size='9' color='#475569'>{summary_text}</font>", styles['TVBody'])]
    ], colWidths=[7*inch])
    summary_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLORS['lighter']),
        ('BOX', (0, 0), (-1, -1), 1, COLORS['primary']),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ]))
    elements.append(summary_box)
    elements.append(Spacer(1, 18))
    
    # ==================== ANALYZED IMAGE DISPLAY ====================
    if data.analyzed_image_url or data.annotated_image:
        elements.append(Paragraph("🖼️ Analyzed Media", styles['TVSection']))
        
        try:
            analyzed_img = None
            
            # Try to load the analyzed image
            if data.analyzed_image_url:
                import requests
                response = requests.get(data.analyzed_image_url, timeout=10)
                if response.status_code == 200:
                    analyzed_img = Image.open(io.BytesIO(response.content))
            
            if analyzed_img:
                # Create annotated version if we have face data and annotations are available
                annotated_img = None
                if ANNOTATIONS_AVAILABLE and data.face_scores and len(data.face_scores) > 0:
                    # Create face regions for annotation
                    regions = []
                    img_w, img_h = analyzed_img.size
                    # Approximate face regions (in real implementation, these come from face detection)
                    num_faces = min(len(data.face_scores), 4)
                    for i, score in enumerate(data.face_scores[:num_faces]):
                        # Create approximate regions for visualization
                        x = int(img_w * (0.2 + 0.2 * (i % 2)))
                        y = int(img_h * (0.2 + 0.2 * (i // 2)))
                        w = int(img_w * 0.25)
                        h = int(img_h * 0.35)
                        label = f"Face {i+1}: {score*100:.0f}%"
                        regions.append(ManipulationRegion((x, y, w, h), score, label, "face"))
                    
                    try:
                        annotated_img = create_full_annotated_image(
                            analyzed_img, 
                            faces=None,  # We don't have actual face objects here
                            face_scores=data.face_scores,
                            artifact_detections=None,
                            include_heatmap=True if data.fake_score > 0.3 else False,
                            include_boxes=True,
                            include_arrows=False
                        )
                    except Exception as e:
                        print(f"Could not create annotated image: {e}")
                        annotated_img = None
                
                # Resize for PDF display
                max_width = 6 * inch
                max_height = 3 * inch
                orig_w, orig_h = analyzed_img.size
                scale = min(max_width / orig_w, max_height / orig_h, 1.0)
                display_w = int(orig_w * scale)
                display_h = int(orig_h * scale)
                
                # Create image flowable
                img_buffer = io.BytesIO()
                display_img = analyzed_img.resize((display_w, display_h), Image.LANCZOS)
                display_img.save(img_buffer, format='PNG')
                img_buffer.seek(0)
                
                # Add the image with a caption
                img_flowable = RLImage(img_buffer, width=display_w * 0.7, height=display_h * 0.7)
                
                # Create image table with caption
                if data.fake_score > 0.5:
                    caption = "⛔ Manipulation artifacts detected in this media"
                    caption_color = '#EF4444'
                elif data.fake_score > 0.3:
                    caption = "⚠️ Some suspicious patterns found in this media"
                    caption_color = '#F59E0B'
                else:
                    caption = "✅ No significant manipulation detected"
                    caption_color = '#10B981'
                
                img_table = Table([
                    [img_flowable],
                    [Paragraph(f"<font size='8' color='{caption_color}'>{caption}</font>", 
                              ParagraphStyle('ImgCap', alignment=TA_CENTER))]
                ], colWidths=[7*inch])
                
                img_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('TOPPADDING', (0, 0), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                    ('BACKGROUND', (0, 0), (-1, -1), COLORS['lighter']),
                    ('BOX', (0, 0), (-1, -1), 1, COLORS['light']),
                ]))
                elements.append(img_table)
                elements.append(Spacer(1, 16))
                
        except Exception as e:
            print(f"Could not add analyzed image to PDF: {e}")
            elements.append(Paragraph(
                f"<font size='8' color='#64748B'>[Image could not be loaded]</font>",
                styles['TVSmall']
            ))
            elements.append(Spacer(1, 12))
    
    # ==================== SCORE OVERVIEW WITH CHARTS ====================
    elements.append(Paragraph("📊 Analysis Overview", styles['TVSection']))
    
    # Create donut chart and metrics side by side
    donut = create_donut_chart(data.fake_score, data.real_score, 100)
    
    # Metrics cards - Clear labeling for fake detection
    metrics_data = [
        ('Manipulation', f"{data.fake_score*100:.1f}%", COLORS['danger'] if data.fake_score > 0.5 else COLORS['secondary']),
        ('Authentic', f"{data.real_score*100:.1f}%", COLORS['danger'] if data.real_score < 0.5 else COLORS['secondary']),
        ('Faces', str(data.faces_detected), COLORS['info']),
        ('Time', f"{data.processing_time_ms}ms", COLORS['slate']),
    ]
    
    metric_cells = []
    for title, value, color in metrics_data:
        hex_color = color.hexval() if hasattr(color, 'hexval') else '#0F172A'
        cell = Table([
            [Paragraph(f"<font size='7' color='#64748B'>{title}</font>", ParagraphStyle('MT', alignment=TA_CENTER))],
            [Paragraph(f"<font size='14' color='{hex_color}'><b>{value}</b></font>", ParagraphStyle('MV', alignment=TA_CENTER))]
        ], colWidths=[1.2*inch], rowHeights=[14, 24])
        cell.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLORS['lighter']),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 1, COLORS['light']),
        ]))
        metric_cells.append(cell)
    
    # Combine chart and metrics
    overview_table = Table([
        [donut, metric_cells[0], metric_cells[1], metric_cells[2], metric_cells[3]]
    ], colWidths=[1.6*inch, 1.35*inch, 1.35*inch, 1.35*inch, 1.35*inch])
    overview_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(overview_table)
    elements.append(Spacer(1, 18))
    
    # ==================== ANALYSIS SCORES TABLE ====================
    scores_for_chart = []
    if data.avg_face_score is not None:
        scores_for_chart.append(('Face Analysis', data.avg_face_score))
    if data.avg_fft_score is not None:
        scores_for_chart.append(('FFT Frequency', data.avg_fft_score))
    if data.avg_eye_score is not None:
        scores_for_chart.append(('Eye Region', data.avg_eye_score))
    
    if scores_for_chart:
        elements.append(Paragraph("🔬 Analysis Scores", styles['TVSection']))
        
        # Create simple score table with visual bars
        score_rows = []
        for label, score in scores_for_chart:
            pct = int(score * 100)
            # Use a visual bar representation with colored text
            score_color = '#EF4444' if score > 0.5 else '#F59E0B' if score > 0.3 else '#10B981'
            bar = '█' * min(10, max(1, int(score * 10))) + '░' * (10 - min(10, max(1, int(score * 10))))
            score_rows.append([
                Paragraph(f"<font size='10' color='#0F172A'><b>{label}</b></font>", 
                          ParagraphStyle('SL', alignment=TA_LEFT)),
                Paragraph(f"<font size='10' color='{score_color}'>{bar}</font>", 
                          ParagraphStyle('SB', alignment=TA_CENTER, fontName='Courier')),
                Paragraph(f"<font size='11' color='{score_color}'><b>{pct}%</b></font>", 
                          ParagraphStyle('SV', alignment=TA_RIGHT))
            ])
        
        score_table = Table(score_rows, colWidths=[2.5*inch, 2.5*inch, 2*inch])
        score_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLORS['lighter']),
            ('GRID', (0, 0), (-1, -1), 1, COLORS['light']),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(score_table)
        elements.append(Spacer(1, 16))
    
    # ==================== PER-FACE SCORES TABLE ====================
    if data.face_scores and len(data.face_scores) > 0:
        elements.append(Paragraph("👤 Individual Face Analysis", styles['TVSection']))
        elements.append(Paragraph(
            f"<font size='8' color='#64748B'>Each detected face was analyzed independently. Higher fake score indicates more manipulation likelihood.</font>",
            styles['TVSmall']
        ))
        elements.append(Spacer(1, 8))
        
        face_table_data = [['Face #', 'Fake Score', 'Real Score', 'Classification', 'Visual']]
        for i, score in enumerate(data.face_scores[:8]):  # Limit to 8 faces
            fake_pct = score * 100
            real_pct = (1 - score) * 100
            classification = "⛔ FAKE" if score > 0.5 else "⚠️ SUSPICIOUS" if score > 0.3 else "✅ REAL"
            class_color = '#EF4444' if score > 0.5 else '#F59E0B' if score > 0.3 else '#10B981'
            
            # Visual bar
            bar_filled = int(score * 10)
            bar = '🔴' * bar_filled + '🟢' * (10 - bar_filled)
            
            face_table_data.append([
                Paragraph(f"<font size='9'><b>Face {i+1}</b></font>", ParagraphStyle('FN', alignment=TA_CENTER)),
                Paragraph(f"<font size='9' color='#EF4444'><b>{fake_pct:.1f}%</b></font>", ParagraphStyle('FS1', alignment=TA_CENTER)),
                Paragraph(f"<font size='9' color='#10B981'><b>{real_pct:.1f}%</b></font>", ParagraphStyle('RS1', alignment=TA_CENTER)),
                Paragraph(f"<font size='9' color='{class_color}'><b>{classification}</b></font>", ParagraphStyle('CL', alignment=TA_CENTER)),
                Paragraph(f"<font size='7'>{bar}</font>", ParagraphStyle('VB', alignment=TA_CENTER)),
            ])
        
        face_table = Table(face_table_data, colWidths=[0.8*inch, 1.2*inch, 1.2*inch, 1.5*inch, 2.3*inch])
        face_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLORS['primary']),
            ('TEXTCOLOR', (0, 0), (-1, 0), COLORS['white']),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS['white'], COLORS['lighter']]),
            ('BOX', (0, 0), (-1, -1), 2, COLORS['primary']),
            ('LINEBELOW', (0, 0), (-1, 0), 2, COLORS['primary']),
        ]))
        elements.append(face_table)
        elements.append(Spacer(1, 16))
    
    # ==================== FRAME ANALYSIS SUMMARY TABLE ====================
    if data.debug_frames and len(data.debug_frames) > 0:
        elements.append(Paragraph("📊 Frame Analysis Statistics", styles['TVSection']))
        
        # Calculate statistics from debug_frames
        total_frames = len(data.debug_frames)
        fake_frames = sum(1 for f in data.debug_frames if f.get('status') == 'FAKE')
        real_frames = total_frames - fake_frames
        avg_fake_score = sum(f.get('fake_score', 0) for f in data.debug_frames) / total_frames if total_frames > 0 else 0
        max_fake = max((f.get('fake_score', 0) for f in data.debug_frames), default=0)
        min_fake = min((f.get('fake_score', 0) for f in data.debug_frames), default=0)
        
        # Frame type breakdown
        frame_types = {}
        for f in data.debug_frames:
            ftype = f.get('type', 'unknown')
            frame_types[ftype] = frame_types.get(ftype, 0) + 1
        
        stats_data = [
            ['📈 Metric', 'Value', 'Description'],
            ['Total Frames Analyzed', f'{total_frames}', 'Number of regions examined'],
            ['Frames Flagged as FAKE', f'{fake_frames} ({fake_frames/total_frames*100:.0f}%)', 'Regions with >50% fake score'],
            ['Frames Classified as REAL', f'{real_frames} ({real_frames/total_frames*100:.0f}%)', 'Regions with ≤50% fake score'],
            ['Average Fake Score', f'{avg_fake_score*100:.1f}%', 'Mean manipulation probability'],
            ['Max Fake Score', f'{max_fake*100:.1f}%', 'Highest manipulation detected'],
            ['Min Fake Score', f'{min_fake*100:.1f}%', 'Lowest manipulation detected'],
        ]
        
        stats_table = Table(stats_data, colWidths=[2.2*inch, 2*inch, 2.8*inch])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLORS['dark']),
            ('TEXTCOLOR', (0, 0), (-1, 0), COLORS['white']),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS['lighter'], COLORS['white']]),
            ('BOX', (0, 0), (-1, -1), 2, COLORS['info']),
            ('LINEBELOW', (0, 0), (-1, 0), 2, COLORS['info']),
        ]))
        elements.append(stats_table)
        elements.append(Spacer(1, 12))
        
        # Frame type breakdown mini-table
        if frame_types:
            type_rows = [['Analysis Type', 'Count', 'Description']]
            type_descriptions = {
                'face': 'Face region crops for deepfake detection',
                'fft': 'Frequency domain analysis for GAN artifacts',
                'eye': 'Eye region for reflection/symmetry analysis',
                'color': 'Color consistency across face regions',
                'noise': 'Noise pattern analysis for editing traces',
                'full': 'Full image classification',
                'video_frame': 'Keyframes from video for temporal analysis',
                'center': 'Center crops for content analysis',
            }
            for ftype, count in sorted(frame_types.items(), key=lambda x: -x[1]):
                desc = type_descriptions.get(ftype, 'Analysis region')
                type_rows.append([ftype.replace('_', ' ').title(), str(count), desc])
            
            type_table = Table(type_rows, colWidths=[1.8*inch, 0.8*inch, 4.4*inch])
            type_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), COLORS['slate']),
                ('TEXTCOLOR', (0, 0), (-1, 0), COLORS['white']),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS['white'], COLORS['lighter']]),
                ('BOX', (0, 0), (-1, -1), 1, COLORS['slate']),
            ]))
            elements.append(type_table)
        
        elements.append(Spacer(1, 16))
    
    # ==================== VISUAL COMPARISON ====================
    img_cells = []
    img_labels = []
    
    if data.analyzed_image_url:
        try:
            import urllib.request
            with urllib.request.urlopen(data.analyzed_image_url, timeout=15) as response:
                img_data = response.read()
            pil_img = PILImage.open(BytesIO(img_data))
            img_buffer = BytesIO()
            pil_img.convert('RGB').save(img_buffer, format='JPEG', quality=85)
            img_buffer.seek(0)
            img_cells.append(RLImage(img_buffer, width=2.5*inch, height=2*inch))
            img_labels.append("Original Media")
        except Exception as e:
            print(f"⚠️ Failed to load original image: {e}")
    
    if data.annotated_image:
        try:
            img_data = base64.b64decode(data.annotated_image)
            pil_img = PILImage.open(BytesIO(img_data))
            img_buffer = BytesIO()
            pil_img.convert('RGB').save(img_buffer, format='JPEG', quality=85)
            img_buffer.seek(0)
            img_cells.append(RLImage(img_buffer, width=2.5*inch, height=2*inch))
            img_labels.append("AI Analysis Overlay")
        except Exception as e:
            print(f"⚠️ Failed to load annotated image: {e}")
    
    if img_cells:
        elements.append(Paragraph("📷 Visual Comparison", styles['TVSection']))
        
        label_row = [Paragraph(f"<font size='8' color='#64748B'><b>{l}</b></font>", 
                              ParagraphStyle('IL', alignment=TA_CENTER)) for l in img_labels]
        
        if len(img_cells) == 2:
            img_table = Table([img_cells, label_row], colWidths=[3.5*inch, 3.5*inch])
        else:
            img_table = Table([[img_cells[0]], [label_row[0]]], colWidths=[4*inch])
        
        img_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('BOX', (0, 0), (-1, -1), 1, COLORS['light']),
        ]))
        elements.append(img_table)
        elements.append(Spacer(1, 16))
    
    # ==================== DETECTION BREAKDOWN ====================
    elements.append(Paragraph("🔍 Comprehensive Detection Breakdown", styles['TVSection']))
    
    # Generate breakdown even if not provided by LLM
    breakdown_items = data.detection_breakdown if data.detection_breakdown else []
    
    # Always add core detection results
    core_detections = [
        {'category': 'Face Manipulation Detection', 'detected': data.fake_score > 0.5, 
         'severity': 'high' if data.fake_score > 0.7 else 'medium' if data.fake_score > 0.4 else 'low', 
         'score': data.avg_face_score or data.fake_score},
        {'category': 'FFT Frequency Analysis', 'detected': (data.avg_fft_score or 0) > 0.5,
         'severity': 'high' if (data.avg_fft_score or 0) > 0.7 else 'medium' if (data.avg_fft_score or 0) > 0.4 else 'low',
         'score': data.avg_fft_score},
        {'category': 'Color Consistency Analysis', 'detected': (data.fft_boost or 0) > 0.1,
         'severity': 'medium' if (data.fft_boost or 0) > 0.15 else 'low',
         'score': data.fft_boost or 0},
        {'category': 'Noise Pattern Analysis', 'detected': (data.phase1_boost or 0) > 0.05,
         'severity': 'medium' if (data.phase1_boost or 0) > 0.1 else 'low',
         'score': data.phase1_boost or 0},
        {'category': 'Eye Region Analysis', 'detected': (data.avg_eye_score or 0) > 0.5,
         'severity': 'high' if (data.avg_eye_score or 0) > 0.7 else 'medium' if (data.avg_eye_score or 0) > 0.4 else 'low',
         'score': data.avg_eye_score},
    ]
    
    # Use provided breakdown or fallback to core
    final_breakdown = breakdown_items if len(breakdown_items) >= 3 else core_detections
    
    breakdown_data = [['Detection Category', 'Status', 'Severity', 'Confidence']]
    for item in final_breakdown[:8]:
        detected = item.get('detected', False)
        status_icon = "⚠️ Yes" if detected else "✓ No"
        det_color = '#EF4444' if detected else '#10B981'
        
        severity = item.get('severity', 'low').lower()
        sev_display = severity.capitalize()
        sev_color = '#EF4444' if severity == 'high' else '#F59E0B' if severity == 'medium' else '#10B981'
        
        score = item.get('score')
        score_display = f"{score*100:.0f}%" if score is not None else "N/A"
        
        breakdown_data.append([
            Paragraph(f"<font size='8'>{item.get('category', 'Unknown')}</font>", ParagraphStyle('BC')),
            Paragraph(f"<font size='8' color='{det_color}'><b>{status_icon}</b></font>", ParagraphStyle('BS', alignment=TA_CENTER)),
            Paragraph(f"<font size='8' color='{sev_color}'><b>{sev_display}</b></font>", ParagraphStyle('BSV', alignment=TA_CENTER)),
            Paragraph(f"<font size='8' color='#0F172A'><b>{score_display}</b></font>", ParagraphStyle('BSC', alignment=TA_CENTER))
        ])
    
    breakdown_table = Table(breakdown_data, colWidths=[2.8*inch, 1.2*inch, 1*inch, 1*inch])
    breakdown_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['dark']),
        ('TEXTCOLOR', (0, 0), (-1, 0), COLORS['white']),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS['white'], COLORS['lighter']]),
        ('BOX', (0, 0), (-1, -1), 2, COLORS['primary']),
        ('LINEBELOW', (0, 0), (-1, 0), 2, COLORS['primary']),
    ]))
    elements.append(breakdown_table)
    elements.append(Spacer(1, 16))
    
    # ==================== DETECTION BOOSTS ====================
    boosts = []
    if data.fft_boost and data.fft_boost > 0:
        boosts.append(('📡 FFT Frequency Boost', data.fft_boost))
    if data.eye_boost and data.eye_boost > 0:
        boosts.append(('👁️ Eye Region Boost', data.eye_boost))
    if data.skin_boost and data.skin_boost > 0:
        boosts.append(('💅 Skin Texture Boost', data.skin_boost))
    if data.ai_art_boost and data.ai_art_boost > 0:
        boosts.append(('🎨 AI Art Detection Boost', data.ai_art_boost))
    if data.temporal_boost and data.temporal_boost > 0:
        boosts.append(('⏱️ Temporal Consistency Boost', data.temporal_boost))
    if data.video_boost and data.video_boost > 0:
        boosts.append(('🎬 Video Analysis Boost', data.video_boost))
    if data.phase1_boost and data.phase1_boost > 0:
        boosts.append(('🔬 Phase 1 Detection Boost', data.phase1_boost))
    if data.phase2_boost and data.phase2_boost > 0:
        boosts.append(('🧪 Phase 2 Detection Boost', data.phase2_boost))
    
    if boosts:
        elements.append(Paragraph("⚡ Detection Boost Factors", styles['TVSection']))
        elements.append(Paragraph(
            "<font size='8' color='#64748B'>These factors contributed additional confidence to the detection result:</font>",
            styles['TVSmall']
        ))
        elements.append(Spacer(1, 6))
        
        boost_rows = []
        for label, boost in boosts:
            pct = boost * 100
            color = '#EF4444' if pct > 15 else '#F59E0B' if pct > 8 else '#10B981'
            
            # Create mini progress bar representation
            bar_filled = '█' * min(int(pct / 5), 20)
            bar_empty = '░' * (20 - len(bar_filled))
            
            boost_rows.append([
                Paragraph(f"<font size='9' color='#475569'>{label}</font>", ParagraphStyle('BL')),
                Paragraph(f"<font size='8' color='#94A3B8'>{bar_filled}{bar_empty}</font>", ParagraphStyle('BB', alignment=TA_CENTER)),
                Paragraph(f"<font size='10' color='{color}'><b>+{pct:.1f}%</b></font>", ParagraphStyle('BV', alignment=TA_RIGHT))
            ])
        
        boost_table = Table(boost_rows, colWidths=[2.5*inch, 2.5*inch, 1*inch])
        boost_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLORS['lighter']),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, COLORS['light']),
            ('BOX', (0, 0), (-1, -1), 1, COLORS['light']),
        ]))
        elements.append(boost_table)
        elements.append(Spacer(1, 16))
    
    # ==================== AI ART ANALYSIS ====================
    if data.ai_art_analysis:
        elements.append(Paragraph("🎨 AI Art Generator Signature Analysis", styles['TVSection']))
        
        ai_art = data.ai_art_analysis
        generator = ai_art.get('ai_generator', 'unknown')
        score = ai_art.get('combined_score', 0) * 100
        gen_color = '#EF4444' if generator != 'likely_real' else '#10B981'
        gen_text = generator.replace('_', ' ').title()
        
        ai_art_content = [
            ['Metric', 'Result'],
            ['Detected Generator', Paragraph(f"<font color='{gen_color}'><b>{gen_text}</b></font>", ParagraphStyle('AAV'))],
            ['AI Confidence Score', f"{score:.0f}%"],
        ]
        
        signatures = ai_art.get('ai_signatures', [])
        if signatures:
            ai_art_content.append(['Detected Signatures', ', '.join(signatures[:4])])
        
        ai_art_table = Table(ai_art_content, colWidths=[2.5*inch, 4*inch])
        ai_art_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLORS['dark_medium']),
            ('TEXTCOLOR', (0, 0), (-1, 0), COLORS['white']),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 1), (-1, -1), COLORS['lighter']),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('BOX', (0, 0), (-1, -1), 1, COLORS['purple']),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, COLORS['light']),
        ]))
        elements.append(ai_art_table)
        elements.append(Spacer(1, 16))
    
    # ==================== VIDEO ANALYSIS ====================
    if data.video_analysis:
        elements.append(Paragraph("🎬 Video Temporal Analysis", styles['TVSection']))
        
        vid = data.video_analysis
        consistency = vid.get('consistency_score', 1.0) * 100
        cons_color = '#10B981' if consistency > 70 else '#F59E0B' if consistency > 50 else '#EF4444'
        
        video_content = [
            ['Metric', 'Result'],
            ['Temporal Consistency', Paragraph(f"<font color='{cons_color}'><b>{consistency:.0f}%</b></font>", ParagraphStyle('VV'))],
        ]
        
        if vid.get('lip_sync_score') is not None:
            lip_score = vid['lip_sync_score'] * 100
            video_content.append(['Lip Sync Score', f"{lip_score:.0f}%"])
        
        issues = vid.get('all_issues', [])
        if issues:
            video_content.append(['Issues Detected', Paragraph(f"<font color='#EF4444'>{', '.join(issues[:4])}</font>", ParagraphStyle('VI'))])
        
        video_table = Table(video_content, colWidths=[2.5*inch, 4*inch])
        video_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLORS['dark_medium']),
            ('TEXTCOLOR', (0, 0), (-1, 0), COLORS['white']),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 1), (-1, -1), COLORS['lighter']),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('BOX', (0, 0), (-1, -1), 1, COLORS['cyan']),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, COLORS['light']),
        ]))
        elements.append(video_table)
        elements.append(Spacer(1, 16))
    
    # ==================== RECOMMENDATIONS ====================
    if data.recommendations:
        elements.append(Paragraph("💡 Expert Recommendations", styles['TVSection']))
        
        for i, rec in enumerate(data.recommendations[:5], 1):
            rec_box = Table([
                [Paragraph(f"<font size='10' color='#6366F1'><b>{i}</b></font>", ParagraphStyle('RN', alignment=TA_CENTER)),
                 Paragraph(f"<font size='9' color='#475569'>{rec}</font>", styles['TVBody'])]
            ], colWidths=[0.4*inch, 6.6*inch])
            rec_box.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), COLORS['lighter']),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(rec_box)
            elements.append(Spacer(1, 4))
        
        elements.append(Spacer(1, 12))
    
    # ==================== METHODOLOGY EXPLANATION ====================
    elements.append(Paragraph("🔬 Detection Methodology", styles['TVSection']))
    
    methodology_text = (
        "Our AI authenticity system uses a multi-layered approach combining several advanced techniques:\n\n"
        "<b>• SigLIP2 Neural Classification:</b> A state-of-the-art vision-language model trained to detect "
        "subtle manipulation artifacts that are invisible to the human eye.\n\n"
        "<b>• FFT Frequency Analysis:</b> Analyzes the frequency domain of images to detect GAN-generated "
        "artifacts like periodic patterns left by neural networks.\n\n"
        "<b>• Eye Region Analysis:</b> Examines eye reflections and symmetry, which are often inconsistent "
        "in AI-generated faces.\n\n"
        "<b>• Skin Texture Validation:</b> Checks for natural skin texture patterns that deepfakes often "
        "fail to replicate accurately.\n\n"
        "<b>• Temporal Consistency (Videos):</b> Analyzes frame-to-frame consistency to detect flickering "
        "and temporal artifacts common in manipulated videos."
    )
    
    method_box = Table([
        [Paragraph(f"<font size='8' color='#475569'>{methodology_text}</font>", 
                  ParagraphStyle('Method', alignment=TA_LEFT, leading=12))]
    ], colWidths=[7*inch])
    method_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLORS['lighter']),
        ('BOX', (0, 0), (-1, -1), 1, COLORS['info']),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ]))
    elements.append(method_box)
    elements.append(Spacer(1, 16))
    
    # ==================== SCORE INTERPRETATION GUIDE ====================
    elements.append(Paragraph("📖 Understanding Your Scores", styles['TVSection']))
    
    score_guide = [
        ['Score Range', 'Classification', 'What It Means'],
        ['0% - 30%', Paragraph("<font color='#10B981'><b>✅ Authentic</b></font>", ParagraphStyle('SG1', alignment=TA_CENTER)),
         'No significant manipulation detected. The content appears genuine with high confidence.'],
        ['30% - 50%', Paragraph("<font color='#F59E0B'><b>⚠️ Suspicious</b></font>", ParagraphStyle('SG2', alignment=TA_CENTER)),
         'Some patterns warrant attention. May be edited, compressed, or have minor AI assistance.'],
        ['50% - 70%', Paragraph("<font color='#EF4444'><b>🚨 Likely Fake</b></font>", ParagraphStyle('SG3', alignment=TA_CENTER)),
         'Multiple manipulation indicators detected. Content is likely AI-generated or significantly altered.'],
        ['70% - 100%', Paragraph("<font color='#991B1B'><b>⛔ Confirmed Fake</b></font>", ParagraphStyle('SG4', alignment=TA_CENTER)),
         'Strong evidence of manipulation. Multiple detection layers confirm artificial generation or editing.'],
    ]
    
    guide_table = Table(score_guide, colWidths=[1.2*inch, 1.3*inch, 4.5*inch])
    guide_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLORS['dark']),
        ('TEXTCOLOR', (0, 0), (-1, 0), COLORS['white']),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ALIGN', (0, 0), (1, -1), 'CENTER'),
        ('ALIGN', (2, 0), (2, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS['white'], COLORS['lighter']]),
        ('BOX', (0, 0), (-1, -1), 2, COLORS['primary']),
        ('LINEBELOW', (0, 0), (-1, 0), 2, COLORS['primary']),
        ('GRID', (0, 1), (-1, -1), 0.5, COLORS['light']),
    ]))
    elements.append(guide_table)
    elements.append(Spacer(1, 12))
    
    # Confidence interpretation note
    conf_note = Table([
        [Paragraph(
            "<font size='8' color='#475569'><b>📊 About Confidence Levels:</b> "
            "The confidence percentage indicates how certain our AI is about its classification. "
            "Higher confidence means more detection layers agree on the result. "
            "A 95% confident 'Authentic' verdict means the AI is highly certain the content is genuine, "
            "while a 60% confident 'Suspicious' verdict suggests some uncertainty—consider manual review.</font>",
            ParagraphStyle('ConfNote', alignment=TA_LEFT, leading=11)
        )]
    ], colWidths=[7*inch])
    conf_note.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#EFF6FF')),  # Light blue
        ('BOX', (0, 0), (-1, -1), 1, COLORS['info']),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(conf_note)
    elements.append(Spacer(1, 16))

    if data.debug_frames and len(data.debug_frames) > 0:
        elements.append(PageBreak())
        elements.append(Paragraph("🖼️ Detailed Frame-by-Frame Analysis", styles['TVSection']))
        
        # Summary of frame types
        frame_types = {}
        for frame in data.debug_frames:
            ftype = frame.get('type', 'full')
            frame_types[ftype] = frame_types.get(ftype, 0) + 1
        
        type_summary = ', '.join([f"{v}x {k}" for k, v in frame_types.items()])
        
        elements.append(Paragraph(
            f"<font size='9' color='#475569'>The AI examined <b>{len(data.debug_frames)} distinct regions</b> "
            f"({type_summary}). Each frame shows the classification result (REAL/FAKE) and confidence score. "
            f"<font color='#EF4444'>Red border = FAKE</font>, <font color='#10B981'>Green border = REAL</font>.</font>",
            styles['TVBody']
        ))
        elements.append(Spacer(1, 14))
        
        frame_grid = []
        current_row = []
        
        # Show more frames (up to 16) in 3-column layout for bigger images
        for idx, frame in enumerate(data.debug_frames[:16]):
            try:
                img_bytes = base64.b64decode(frame.get('image_base64', ''))
                pil_img = PILImage.open(BytesIO(img_bytes))
                
                img_buffer = BytesIO()
                pil_img.save(img_buffer, format='JPEG', quality=85)
                img_buffer.seek(0)
                
                # Bigger images for better visibility
                img = RLImage(img_buffer, width=2.0*inch, height=2.0*inch)
                
                status = frame.get('status', 'REAL')
                fake_pct = frame.get('fake_score', 0) * 100
                real_pct = frame.get('real_score', 1) * 100
                weight = frame.get('weight', 1.0)
                
                # Status color and icon
                if status == 'FAKE':
                    status_color = '#EF4444'
                    status_icon = '⛔'
                    border_color = COLORS['danger']
                else:
                    status_color = '#10B981'
                    status_icon = '✅'
                    border_color = COLORS['secondary']
                
                # Get frame name and format nicely
                frame_name = frame.get('name', f'Frame {idx+1}')
                frame_type = frame.get('type', 'full')
                
                # Enhanced type labels with more info
                type_labels = {
                    'face': '👤 Face Crop',
                    'fft': '📡 FFT Frequency', 
                    'eye': '👁️ Eye Region',
                    'color': '🎨 Color Analysis',
                    'noise': '🔬 Noise Pattern',
                    'edge': '📐 Edge Detection',
                    'mouth': '👄 Mouth Region',
                    'sharp': '🔍 Sharpened',
                    'center': '🎯 Center Crop',
                    'video_frame': '🎬 Video Frame',
                    'full': '🖼️ Full Image'
                }
                
                # Create display label with frame index
                if 'face' in frame_name.lower():
                    import re
                    # Check for video frame face (e.g., f1_face1)
                    vid_match = re.search(r'f(\d+)_face(\d+)', frame_name.lower())
                    if vid_match:
                        frame_label = f"🎬 Frame {vid_match.group(1)} Face {vid_match.group(2)}"
                    else:
                        face_match = re.search(r'face(\d+)', frame_name.lower())
                        if face_match:
                            frame_label = f"👤 Face #{face_match.group(1)}"
                        else:
                            frame_label = type_labels.get(frame_type, frame_name)
                elif 'frame_' in frame_name.lower():
                    # Video frame without face
                    frame_num = frame_name.replace('frame_', '')
                    frame_label = f"🎬 Frame #{frame_num}"
                else:
                    frame_label = type_labels.get(frame_type, frame_name[:18])
                
                # Build detailed cell with 4 rows
                cell = Table([
                    [img],
                    [Paragraph(f"<font size='10' color='#1E293B'><b>{frame_label}</b></font>", 
                              ParagraphStyle('FL', alignment=TA_CENTER, fontName='Helvetica-Bold'))],
                    [Paragraph(f"<font size='11' color='{status_color}'><b>{status_icon} {status}</b></font>", 
                              ParagraphStyle('FS', alignment=TA_CENTER))],
                    [Paragraph(f"<font size='8' color='#64748B'>Fake: {fake_pct:.0f}% | Real: {real_pct:.0f}%</font>", 
                              ParagraphStyle('FD', alignment=TA_CENTER))]
                ], colWidths=[2.2*inch], rowHeights=[2.05*inch, 18, 20, 14])
                
                cell.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('BOX', (0, 0), (-1, -1), 3, border_color),  # Thicker colored border
                    ('BACKGROUND', (0, 0), (-1, -1), COLORS['lighter']),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ]))
                
                current_row.append(cell)
                
                # 3 columns for bigger images
                if len(current_row) == 3:
                    frame_grid.append(current_row)
                    current_row = []
                    
            except Exception as e:
                print(f"⚠️ Failed to process frame {idx}: {e}")
                continue

        
        if current_row:
            while len(current_row) < 3:
                current_row.append('')
            frame_grid.append(current_row)
        
        if frame_grid:
            frame_table = Table(frame_grid, colWidths=[2.35*inch]*3)
            frame_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ]))
            elements.append(frame_table)
            
            # Add legend
            elements.append(Spacer(1, 12))
            legend = Table([
                [Paragraph("<font size='8' color='#64748B'><b>Legend:</b> "
                          "👤 Face Crop = Face region extracted for analysis | "
                          "📡 FFT = Frequency domain analysis for GAN artifacts | "
                          "🎬 Frame = Video keyframe | "
                          "🎨 Color = Color consistency check</font>", 
                          ParagraphStyle('Legend', alignment=TA_CENTER))]
            ], colWidths=[7*inch])
            legend.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), COLORS['lighter']),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))
            elements.append(legend)
    
    # ==================== FOOTER ====================
    elements.append(Spacer(1, 24))
    elements.append(HRFlowable(width="100%", thickness=2, color=COLORS['primary']))
    elements.append(Spacer(1, 10))
    
    footer_text = (
        f"<font size='7' color='#64748B'>"
        f"<b>TrueVibe AI Authenticity System v{data.model_version}</b><br/>"
        f"This report was generated using SigLIP2 neural classification, FFT frequency analysis, "
        f"multi-layer manipulation detection, and advanced pattern recognition.<br/>"
        f"Report ID: {report_id} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | © 2024 TrueVibe"
        f"</font>"
    )
    elements.append(Paragraph(footer_text, ParagraphStyle('Footer', alignment=TA_CENTER, leading=11)))
    
    # Build PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=0.5*inch,
        rightMargin=0.5*inch,
        topMargin=0.4*inch,
        bottomMargin=0.4*inch
    )
    doc.build(elements)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes
