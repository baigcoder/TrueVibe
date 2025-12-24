import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from 'sonner';

interface PDFReportResponse {
    pdf_base64: string;
    filename: string;
    success: boolean;
    message: string;
}

interface GeneratePDFParams {
    postId: string;
    analysisResults: {
        fake_score: number;
        real_score: number;
        faces_detected?: number;
        avg_face_score?: number;
        avg_fft_score?: number;
        avg_eye_score?: number;
        fft_boost?: number;
        eye_boost?: number;
        temporal_boost?: number;
        processing_time_ms: number;
        model_version: string;
    };
    reportContent: {
        verdict: string;
        confidence: number;
        summary: string;
        detectionBreakdown: Array<{
            category: string;
            detected: boolean;
            severity: string;
            explanation: string;
            score?: number;
        }>;
        technicalDetails: Array<{
            metric: string;
            value: string;
            interpretation: string;
        }>;
        recommendations: string[];
    };
}

/**
 * Hook for downloading AI analysis PDF reports
 */
export function useDownloadPDFReport() {
    const mutation = useMutation({
        mutationFn: async ({ postId, analysisResults, reportContent }: GeneratePDFParams) => {
            // Call the backend endpoint that proxies to Python AI service
            // The api client already unwraps the axios response
            const response = await api.post<{ success: boolean; data: PDFReportResponse }>(
                `/posts/${postId}/download-pdf-report`,
                {
                    analysis_results: analysisResults,
                    report_content: reportContent
                }
            );

            // Handle both wrapped { success, data } and unwrapped response formats
            const data = response.data || response as unknown as PDFReportResponse;
            return data;
        },
        onSuccess: (data) => {
            // Check both nested and flat response structures
            const pdfData = (data as unknown as { pdf_base64?: string; filename?: string; success?: boolean })?.pdf_base64
                ? data as unknown as PDFReportResponse
                : (data as { data?: PDFReportResponse })?.data;

            if (pdfData?.pdf_base64) {
                // Convert base64 to blob and trigger download
                const byteCharacters = atob(pdfData.pdf_base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });

                // Create download link
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = pdfData.filename || 'truevibe_report.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                toast.success('📄 PDF Report downloaded successfully!');
            } else {
                console.error('PDF data structure:', data);
                toast.error('Failed to generate PDF report - invalid response');
            }
        },
        onError: (error: Error) => {
            console.error('PDF download error:', error);
            toast.error(`Failed to download report: ${error.message}`);
        }
    });

    return {
        downloadPDF: mutation.mutate,
        downloadPDFAsync: mutation.mutateAsync,
        isDownloading: mutation.isPending,
        error: mutation.error
    };
}

/**
 * Hook for emailing AI analysis PDF reports to admin
 */
export function useEmailReport() {
    const mutation = useMutation({
        mutationFn: async ({ postId, analysisResults, reportContent }: GeneratePDFParams) => {
            const response = await api.post<{ success: boolean; message: string; data?: { success: boolean; message: string } }>(
                `/posts/${postId}/email-pdf-report`,
                {
                    analysis_results: analysisResults,
                    report_content: reportContent
                }
            );
            // Handle both nested { data: { success, message } } and flat { success, message } responses
            return response.data || response;
        },
        onSuccess: (data) => {
            // Handle both response formats and add null safety
            const result = data as unknown as { success?: boolean; message?: string };
            if (result?.success) {
                toast.success(result.message || '📧 Report emailed successfully!');
            } else {
                toast.error(result?.message || 'Failed to email report');
            }
        },
        onError: (error: Error) => {
            console.error('Email report error:', error);
            toast.error(`Error emailing report: ${error.message}`);
        }
    });

    return {
        emailReport: mutation.mutate,
        isEmailing: mutation.isPending,
        error: mutation.error
    };
}

/**
 * Utility function to open PDF in new tab instead of downloading
 */
export function openPDFInNewTab(pdfBase64: string, _filename: string) {
    const byteCharacters = atob(pdfBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');

    // Clean up URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}
