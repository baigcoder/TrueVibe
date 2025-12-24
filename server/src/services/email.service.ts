/**
 * Email Service for TrueVibe
 * Handles sending emails including PDF report attachments
 */

import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

// Email configuration from environment
const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    },
    from: process.env.SMTP_FROM || 'TrueVibe <noreply@truevibe.app>',
};

// Create transporter (lazy initialization)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
    if (!transporter) {
        if (!emailConfig.auth.user || !emailConfig.auth.pass) {
            throw new Error('Email not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
        }

        transporter = nodemailer.createTransport({
            host: emailConfig.host,
            port: emailConfig.port,
            secure: emailConfig.secure,
            auth: emailConfig.auth,
        });
    }
    return transporter;
}

export interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
        encoding?: 'base64' | 'utf-8';
    }>;
}

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
    try {
        const transport = getTransporter();

        const mailOptions = {
            from: emailConfig.from,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
            attachments: options.attachments,
        };

        const result = await transport.sendMail(mailOptions);
        console.log(`📧 Email sent to ${options.to}: ${result.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        throw error;
    }
}

/**
 * Send AI Analysis PDF Report via email
 */
export async function sendPDFReportEmail(params: {
    recipientEmail: string;
    recipientName: string;
    postId: string;
    pdfBase64: string;
    pdfFilename: string;
    verdict: string;
    confidence: number;
    postImageUrl?: string;
}): Promise<boolean> {
    const { recipientEmail, recipientName, postId, pdfBase64, pdfFilename, verdict, confidence, postImageUrl } = params;

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Determine verdict color for email
    const verdictColors: Record<string, string> = {
        authentic: '#10B981',  // Green
        suspicious: '#F59E0B', // Amber
        fake: '#EF4444',       // Red
    };
    const verdictColor = verdictColors[verdict] || '#6B7280';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F172A; color: #E2E8F0; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .header { background: linear-gradient(135deg, #A855F7 0%, #7C3AED 100%); padding: 30px; text-align: center; }
        .header h1 { margin: 0; color: white; font-size: 24px; }
        .header p { margin: 10px 0 0; color: rgba(255,255,255,0.8); }
        .content { padding: 30px; }
        .verdict-box { background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px; }
        .verdict { font-size: 28px; font-weight: bold; color: ${verdictColor}; text-transform: uppercase; }
        .confidence { font-size: 16px; color: #94A3B8; margin-top: 8px; }
        .info { background: rgba(30, 41, 59, 0.5); border-radius: 8px; padding: 15px; margin-bottom: 20px; }
        .info p { margin: 8px 0; font-size: 14px; color: #94A3B8; }
        .info strong { color: #E2E8F0; }
        .footer { text-align: center; padding: 20px; border-top: 1px solid rgba(148, 163, 184, 0.2); color: #64748B; font-size: 12px; }
        .button { display: inline-block; background: linear-gradient(135deg, #A855F7 0%, #7C3AED 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; }
        ${postImageUrl ? '.post-image { width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; }' : ''}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ TrueVibe AI Analysis Report</h1>
            <p>Content Authenticity Verification</p>
        </div>
        <div class="content">
            ${postImageUrl ? `<img src="${postImageUrl}" alt="Analyzed content" class="post-image" />` : ''}
            
            <div class="verdict-box">
                <div class="verdict">${verdict.toUpperCase()}</div>
                <div class="confidence">Confidence: ${Math.round(confidence * 100)}%</div>
            </div>
            
            <div class="info">
                <p><strong>Post ID:</strong> ${postId}</p>
                <p><strong>Recipient:</strong> ${recipientName}</p>
                <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p style="color: #94A3B8; line-height: 1.6;">
                Your detailed AI authenticity analysis report is attached as a PDF document. 
                This report includes detection breakdown, technical metrics, and recommendations.
            </p>
            
            <p style="text-align: center;">
                <a href="${config.frontend.url}" class="button">View on TrueVibe</a>
            </p>
        </div>
        <div class="footer">
            <p>This is an automated message from TrueVibe AI Analysis System.</p>
            <p>© ${new Date().getFullYear()} TrueVibe. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

    return sendEmail({
        to: recipientEmail,
        subject: `🛡️ AI Analysis Report - Content ${verdict.toUpperCase()}`,
        html: htmlContent,
        text: `TrueVibe AI Analysis Report\n\nVerdict: ${verdict.toUpperCase()}\nConfidence: ${Math.round(confidence * 100)}%\n\nYour detailed report is attached as a PDF.`,
        attachments: [
            {
                filename: pdfFilename,
                content: pdfBuffer,
                contentType: 'application/pdf',
            }
        ]
    });
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
    return !!(emailConfig.auth.user && emailConfig.auth.pass);
}
