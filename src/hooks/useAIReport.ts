import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

// Types
export interface DetectionItem {
    category: string;
    detected: boolean;
    severity: 'low' | 'medium' | 'high';
    explanation: string;
    score?: number;
}

export interface TechnicalDetail {
    metric: string;
    value: string;
    interpretation: string;
}

export interface AIReportContent {
    verdict: 'authentic' | 'suspicious' | 'fake';
    confidence: number;
    summary: string;
    detectionBreakdown: DetectionItem[];
    technicalDetails: TechnicalDetail[];
    recommendations: string[];
}

export interface AIReport {
    _id: string;
    postId: string;
    userId: string;
    analysisId: string;
    report: AIReportContent;
    modelUsed: 'gemini' | 'gpt' | 'groq' | 'fallback';
    generatedAt: string;
    createdAt: string;
}

interface GenerateReportResponse {
    success: boolean;
    data: {
        report: AIReport;
        cached: boolean;
    };
}

interface GetReportResponse {
    success: boolean;
    data: {
        report: AIReport;
    };
}

// Generate AI Report (mutation)
export function useGenerateReport(postId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await api.post<GenerateReportResponse>(`/posts/${postId}/generate-report`);
            return response.data;
        },
        onSuccess: (data) => {
            // Invalidate and refetch the report query
            queryClient.setQueryData(['ai-report', postId], data);
        },
    });
}

// Get AI Report (query)
export function useGetReport(postId: string, enabled = true) {
    return useQuery({
        queryKey: ['ai-report', postId],
        queryFn: async () => {
            const response = await api.get<GetReportResponse>(`/posts/${postId}/report`);
            return response.data;
        },
        enabled,
        staleTime: 1000 * 60 * 30, // 30 minutes - reports don't change often
        retry: false, // Don't retry on 404
    });
}

// Hook that combines both - fetch existing or generate new
export function useAIReport(postId: string, isOwner: boolean) {
    const { data: existingReport, isLoading: isLoadingReport, error } = useGetReport(postId, isOwner);
    const generateMutation = useGenerateReport(postId);

    // existingReport is GetReportResponse.data = { report: AIReport }
    // generateMutation.data is GenerateReportResponse.data = { report: AIReport, cached: boolean }
    const report = existingReport?.report || generateMutation.data?.report;
    const isCached = existingReport?.report !== undefined || generateMutation.data?.cached === true;

    return {
        report,
        isCached,
        isLoading: isLoadingReport,
        isGenerating: generateMutation.isPending,
        error: error as Error | null,
        generateReport: generateMutation.mutateAsync,
        hasReport: !!report,
    };
}
