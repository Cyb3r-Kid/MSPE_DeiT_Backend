"""Automated Clinical Decision-Support PDF Report Generator.
MSPE-DeiT Vision Transformer Multimodal Framework.
"""
import io
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Union

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def generate_pdf_report(
    assessment_id: Union[str, int],
    modality: str,
    clinical_metadata: Dict[str, Any],
    prediction: Optional[Dict[str, Any]] = None,
    image_path: Optional[str] = None,
    user_name: Optional[str] = None,
) -> bytes:
    """Generates structured clinical decision-support PDF report using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#081B39"),
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#12C9C1"),
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#102855"),
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1F2937"),
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#6B7280"),
    )
    risk_high = ParagraphStyle(
        "RiskHigh",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#DC2626"),
    )
    risk_mod = ParagraphStyle(
        "RiskMod",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#D97706"),
    )
    risk_low = ParagraphStyle(
        "RiskLow",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#059669"),
    )

    story = []

    # 1. Header banner
    story.append(Paragraph("MSPE-DeiT Screening Assessment Report", title_style))
    story.append(Paragraph("Multimodal Vision Transformer & Tabular Ensemble Clinical Decision-Support System", subtitle_style))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#12C9C1"), spaceBefore=2, spaceAfter=10))

    # 2. Metadata table
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    patient_info = [
        [
            Paragraph("<b>Assessment ID:</b>", body_style),
            Paragraph(str(assessment_id), body_style),
            Paragraph("<b>Date/Time:</b>", body_style),
            Paragraph(timestamp, body_style),
        ],
        [
            Paragraph("<b>Patient Name:</b>", body_style),
            Paragraph(user_name or "Anonymous Patient", body_style),
            Paragraph("<b>Image Modality:</b>", body_style),
            Paragraph(modality.replace("_", " ").title(), body_style),
        ],
    ]
    meta_table = Table(patient_info, colWidths=[95, 160, 95, 170])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 12))

    # 3. Clinical metadata section
    story.append(Paragraph("Clinical Lesion Metadata", section_heading))
    story.append(Spacer(1, 4))

    age_val = clinical_metadata.get("age", "N/A")
    sex_val = str(clinical_metadata.get("sex", "N/A")).title()
    site_val = str(clinical_metadata.get("anatomical_site") or clinical_metadata.get("anatomical_location", "N/A")).title()
    diam_val = f"{clinical_metadata.get('lesion_diameter_mm') or clinical_metadata.get('diameter_mm', 'N/A')} mm"
    evol_val = "Yes" if clinical_metadata.get("evolution") or clinical_metadata.get("evolution_history") else "No / Unknown"
    fam_val = "Yes" if clinical_metadata.get("family_history") else "No / Unknown"
    itch_val = "Yes" if clinical_metadata.get("itch_bleed") else "No / Unknown"
    fitz_val = f"Type {clinical_metadata.get('fitzpatrick_skin_type') or clinical_metadata.get('fitzpatrick', 'III')}"

    clin_rows = [
        [
            Paragraph("<b>Age:</b>", body_style), Paragraph(str(age_val), body_style),
            Paragraph("<b>Sex:</b>", body_style), Paragraph(sex_val, body_style),
        ],
        [
            Paragraph("<b>Anatomical Site:</b>", body_style), Paragraph(site_val, body_style),
            Paragraph("<b>Lesion Diameter:</b>", body_style), Paragraph(diam_val, body_style),
        ],
        [
            Paragraph("<b>History of Evolution:</b>", body_style), Paragraph(evol_val, body_style),
            Paragraph("<b>Family History:</b>", body_style), Paragraph(fam_val, body_style),
        ],
        [
            Paragraph("<b>Itching / Bleeding:</b>", body_style), Paragraph(itch_val, body_style),
            Paragraph("<b>Fitzpatrick Type:</b>", body_style), Paragraph(fitz_val, body_style),
        ],
    ]
    clin_table = Table(clin_rows, colWidths=[120, 135, 120, 145])
    clin_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING", (0, 0), (-1, -1), 4),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F5F9")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#F1F5F9")),
    ]))
    story.append(clin_table)
    story.append(Spacer(1, 14))

    # 4. Multimodal Model Inference Results
    story.append(Paragraph("Multimodal Ensemble Prediction", section_heading))
    story.append(Spacer(1, 4))

    if prediction:
        p_ens = float(prediction.get("ensemble_probability", 0.0))
        p_mspe = float(prediction.get("model_probabilities", {}).get("mspe_deit", prediction.get("image_probability", 0.0)))
        p_xgb = float(prediction.get("model_probabilities", {}).get("xgboost", prediction.get("xgboost_probability", 0.0)))
        p_ann = float(prediction.get("model_probabilities", {}).get("ann", prediction.get("ann_probability", 0.0)))
        risk = str(prediction.get("risk_level", "Unknown"))
        rec = str(prediction.get("recommendation", "Clinical correlation recommended."))

        risk_pstyle = risk_high if "High" in risk else (risk_mod if "Moderate" in risk else risk_low)

        results_data = [
            [Paragraph("<b>Model Branch</b>", body_style), Paragraph("<b>Input Domain</b>", body_style), Paragraph("<b>Malignancy Probability</b>", body_style)],
            [Paragraph("MSPE-DeiT (Tiny ViT)", body_style), Paragraph(f"Imagery ({modality.title()})", body_style), Paragraph(f"<b>{p_mspe * 100:.2f}%</b>", body_style)],
            [Paragraph("XGBoost Classifier", body_style), Paragraph("Tabular Clinical Features", body_style), Paragraph(f"<b>{p_xgb * 100:.2f}%</b>", body_style)],
            [Paragraph("3-Dense-Block ANN", body_style), Paragraph("Tabular Clinical Representation", body_style), Paragraph(f"<b>{p_ann * 100:.2f}%</b>", body_style)],
            [Paragraph("<b>Soft-Voting Ensemble (Final)</b>", body_style), Paragraph("<b>Fused Multimodal Representation</b>", body_style), Paragraph(f"<b>{p_ens * 100:.2f}%</b>", risk_pstyle)],
        ]
        res_table = Table(results_data, colWidths=[180, 180, 160])
        res_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#081B39")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("PADDING", (0, 0), (-1, -1), 5),
            ("BACKGROUND", (0, 4), (-1, 4), colors.HexColor("#EFF6FF")),
        ]))
        story.append(res_table)
        story.append(Spacer(1, 10))

        # Risk Banner
        banner_bg = "#FEE2E2" if "High" in risk else ("#FEF3C7" if "Moderate" in risk else "#D1FAE5")
        banner_border = "#DC2626" if "High" in risk else ("#D97706" if "Moderate" in risk else "#059669")
        risk_box_content = [
            [Paragraph(f"<b>Risk Assessment: {risk.upper()}</b>", risk_pstyle)],
            [Paragraph(f"<b>Clinical Recommendation:</b> {rec}", body_style)],
        ]
        risk_table = Table(risk_box_content, colWidths=[520])
        risk_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(banner_bg)),
            ("BOX", (0, 0), (-1, -1), 1.5, colors.HexColor(banner_border)),
            ("PADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(risk_table)
    else:
        story.append(Paragraph("<i>Inference pending or model weights offline.</i>", body_style))

    story.append(Spacer(1, 16))

    # 5. Academic Performance Benchmark Box
    story.append(Paragraph("Academic Research Performance Reference (ISIC Benchmark)", section_heading))
    story.append(Spacer(1, 4))
    metrics_data = [
        [Paragraph("<b>Metric</b>", body_style), Paragraph("<b>Reported Study Value</b>", body_style), Paragraph("<b>Reference Dataset</b>", body_style)],
        [Paragraph("Accuracy", body_style), Paragraph("91.76%", body_style), Paragraph("ISIC Multimodal Skin Cancer Dataset", body_style)],
        [Paragraph("AUROC (Area Under ROC)", body_style), Paragraph("0.953", body_style), Paragraph("ISIC Benchmark Evaluation", body_style)],
        [Paragraph("Specificity", body_style), Paragraph("91.77%", body_style), Paragraph("Dermoscopy / 3D-TBP Cohort", body_style)],
        [Paragraph("Sensitivity", body_style), Paragraph("84.81%", body_style), Paragraph("Melanoma / Malignant Lesions", body_style)],
    ]
    metrics_table = Table(metrics_data, colWidths=[160, 160, 200])
    metrics_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#102855")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("PADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 16))

    # 6. Medical Disclaimer and Safety Notice
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceBefore=5, spaceAfter=8))
    story.append(Paragraph("<b>IMPORTANT MEDICAL DISCLAIMER & RESEARCH SAFETY NOTICE:</b>", ParagraphStyle("DiscHead", parent=disclaimer_style, fontName="Helvetica-Bold", textColor=colors.HexColor("#B91C1C"))))
    story.append(Paragraph(
        "This software application is an <b>AI-Assisted Screening Research Prototype</b> based on the IEEE Access publication: "
        "<i>'MSPE-DeiT: A Vision Transformer-Based Multimodal Framework for Skin Cancer Diagnosis'</i>. "
        "It is <b>NOT</b> an FDA or CE-cleared medical device, nor does it provide definitive pathology diagnoses. "
        "Any risk classification or probability output represents a mathematical estimate that MUST be verified by a certified "
        "dermatologist through physical clinical dermoscopy, confocal microscopy, or histopathological biopsy. "
        "Never delay or modify clinical treatment based solely on this automated output.",
        disclaimer_style
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
