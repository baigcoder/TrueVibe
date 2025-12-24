import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    ShieldCheck,
    AlertTriangle,
    XOctagon,
    ChevronDown,
    ChevronUp,
    Loader2,
    RefreshCw,
    Brain,
    Cpu,
    Sparkles,
    Zap,
    FileDown,
    Mail,
    Eye,
    Waves,
    Palette,
    Focus,
    Fingerprint
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIReport, DetectionItem, TechnicalDetail } from "@/hooks/useAIReport";
import { useDownloadPDFReport, useEmailReport } from "@/hooks/useDownloadReport";

interface AIReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: AIReport | null;
    isLoading: boolean;
    isGenerating: boolean;
    onGenerate: () => void;
    error?: Error | null;
    postId?: string;
}

const verdictConfig = {
    authentic: {
        icon: ShieldCheck,
        label: "VERIFIED AUTHENTIC",
        color: "text-emerald-400",
        bgGradient: "from-emerald-500/20 to-emerald-600/10",
        borderColor: "border-emerald-500/40",
        glowColor: "shadow-emerald-500/20"
    },
    suspicious: {
        icon: AlertTriangle,
        label: "SUSPICIOUS",
        color: "text-amber-400",
        bgGradient: "from-amber-500/20 to-amber-600/10",
        borderColor: "border-amber-500/40",
        glowColor: "shadow-amber-500/20"
    },
    fake: {
        icon: XOctagon,
        label: "MANIPULATED",
        color: "text-red-400",
        bgGradient: "from-red-500/20 to-red-600/10",
        borderColor: "border-red-500/40",
        glowColor: "shadow-red-500/20"
    }
};

// Category icons mapping
const categoryIcons: Record<string, React.ElementType> = {
    "Face Manipulation Detection": Fingerprint,
    "FFT Frequency Analysis": Waves,
    "Color Consistency Analysis": Palette,
    "Eye Region Analysis": Eye,
    "Noise Pattern Analysis": Focus,
};

function MetricCard({ item }: { item: DetectionItem }) {
    const [expanded, setExpanded] = useState(false);
    const Icon = categoryIcons[item.category] || Brain;
    const score = item.score !== undefined ? Math.round(item.score * 100) : null;

    const getScoreColor = (s: number) => {
        if (s >= 70) return "text-red-400";
        if (s >= 40) return "text-amber-400";
        return "text-emerald-400";
    };

    return (
        <motion.div
            layout
            className={cn(
                "bg-slate-800/50 border rounded-xl overflow-hidden transition-all",
                item.detected ? "border-red-500/30" : "border-slate-700/50"
            )}
        >
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        item.detected ? "bg-red-500/20" : "bg-slate-700/50"
                    )}>
                        <Icon className={cn("w-4 h-4", item.detected ? "text-red-400" : "text-slate-400")} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-white/90">
                        {item.category.replace(" Analysis", "").replace(" Detection", "")}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {score !== null && (
                        <span className={cn("text-sm font-black", getScoreColor(score))}>
                            {score}%
                        </span>
                    )}
                    {expanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                </div>
            </button>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3 pt-1">
                            <p className="text-xs text-slate-400 leading-relaxed">
                                {item.explanation}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}


export function AIReportModal({
    isOpen,
    onClose,
    report,
    isLoading,
    isGenerating,
    onGenerate,
    error,
    postId
}: AIReportModalProps) {
    const [showTechnical, setShowTechnical] = useState(false);
    const { downloadPDF, isDownloading } = useDownloadPDFReport();
    const { emailReport, isEmailing } = useEmailReport();

    const handleDownloadPDF = () => {
        if (!report || !postId) return;
        downloadPDF({
            postId,
            analysisResults: {
                fake_score: 1 - (report.report.confidence || 0.5),
                real_score: report.report.confidence || 0.5,
                processing_time_ms: 0,
                model_version: report.modelUsed || 'v7'
            },
            reportContent: {
                verdict: report.report.verdict,
                confidence: report.report.confidence,
                summary: report.report.summary,
                detectionBreakdown: report.report.detectionBreakdown,
                technicalDetails: report.report.technicalDetails,
                recommendations: report.report.recommendations
            }
        });
    };

    const handleEmailReport = () => {
        if (!report || !postId) return;
        emailReport({
            postId,
            analysisResults: {
                fake_score: 1 - (report.report.confidence || 0.5),
                real_score: report.report.confidence || 0.5,
                processing_time_ms: 0,
                model_version: report.modelUsed || 'v7'
            },
            reportContent: {
                verdict: report.report.verdict,
                confidence: report.report.confidence,
                summary: report.report.summary,
                detectionBreakdown: report.report.detectionBreakdown,
                technicalDetails: report.report.technicalDetails,
                recommendations: report.report.recommendations
            }
        });
    };

    if (!isOpen) return null;

    const verdictInfo = report ? verdictConfig[report.report.verdict] : null;
    const confidence = report ? Math.round(report.report.confidence * 100) : 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 15 }}
                    className="relative w-full max-w-sm max-h-[85vh] bg-slate-900 border border-slate-700/50 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header - Slimmer */}
                    <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <Brain className="w-4.5 h-4.5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-[13px] font-black italic uppercase tracking-tight text-white">AI Authenticity</h2>
                                <div className="flex items-center gap-1.5 opacity-60">
                                    <Cpu className="w-2.5 h-2.5 text-violet-400" />
                                    <span className="text-[9px] font-mono font-bold">{report ? report.modelUsed.toUpperCase() : "v7"}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors border border-white/5"
                        >
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>

                    {/* Content - Denser */}
                    <div className="overflow-y-auto p-3.5 space-y-3.5 scrollbar-hide">

                        {/* Loading / Error States - Keep same logic but adjust padding */}
                        {(isLoading || isGenerating) && (
                            <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Neural Syncing...</p>
                            </div>
                        )}

                        {error && !isLoading && !isGenerating && (
                            <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
                                <XOctagon className="w-8 h-8 text-rose-500" />
                                <p className="text-[11px] text-slate-400 font-medium">{error.message}</p>
                            </div>
                        )}

                        {/* No Report */}
                        {!report && !isLoading && !isGenerating && !error && (
                            <div className="flex flex-col items-center justify-center py-16 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-violet-400" />
                                </div>
                                <p className="text-sm text-slate-400">Generate a detailed AI report</p>
                                <button
                                    onClick={onGenerate}
                                    className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-medium rounded-xl transition-all"
                                >
                                    Generate Report
                                </button>
                            </div>
                        )}

                        {/* Report Content */}
                        {report && !isLoading && !isGenerating && (
                            <>
                                {/* Verdict Card - Slimmer */}
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={cn(
                                        "p-3 rounded-2xl border bg-gradient-to-br relative overflow-hidden group/v",
                                        verdictInfo?.bgGradient,
                                        verdictInfo?.borderColor
                                    )}
                                >
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/v:opacity-20 transition-opacity">
                                        {verdictInfo && <verdictInfo.icon className="w-12 h-12" />}
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className={cn("text-sm font-black italic uppercase tracking-tighter", verdictInfo?.color)}>
                                                {verdictInfo?.label}
                                            </span>
                                            <span className="text-xl font-black text-white tabular-nums tracking-tighter">
                                                {confidence}%
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-300/90 leading-normal font-medium max-w-[90%]">
                                            {report.report.summary}
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Analysis List - STAGGERED ANIMATION */}
                                <div className="space-y-2">
                                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 px-1 mb-1">
                                        Audit Metrics
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {report.report.detectionBreakdown.map((item, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 + (i * 0.05) }}
                                            >
                                                <MetricCard item={item} />
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Summary & Actions Grouped */}
                                <div className="space-y-3">
                                    {/* Tech Details - Slimmer */}
                                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden backdrop-blur-sm">
                                        <button
                                            onClick={() => setShowTechnical(!showTechnical)}
                                            className="w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Zap className="w-3 h-3 text-amber-400" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Core Diagnostics</span>
                                            </div>
                                            {showTechnical ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        </button>
                                        <AnimatePresence>
                                            {showTechnical && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: "auto" }}
                                                    exit={{ height: 0 }}
                                                    className="overflow-hidden border-t border-slate-800"
                                                >
                                                    <div className="p-2 space-y-1">
                                                        {report.report.technicalDetails.map((detail, i) => (
                                                            <div key={i} className="flex justify-between items-center px-1 py-0.5">
                                                                <span className="text-[9px] text-slate-500 uppercase">{detail.metric}</span>
                                                                <span className="text-[9px] font-mono text-white font-bold">{detail.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Recommendations - Slimmer */}
                                    <div className="bg-slate-800/20 border border-slate-800 rounded-xl p-3">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Sparkles className="w-3 h-3 text-violet-400" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Security Tips</span>
                                        </div>
                                        <ul className="space-y-1.5">
                                            {report.report.recommendations.slice(0, 3).map((rec, i) => (
                                                <li key={i} className="flex items-start gap-2 text-[10px] text-slate-400 leading-tight">
                                                    <div className="w-1 h-1 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                                                    {rec}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer - Stick to bottom */}
                    {report && postId && (
                        <div className="p-3.5 border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl space-y-3">
                            <div className="flex gap-2.5">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleEmailReport}
                                    disabled={isEmailing}
                                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-white/5"
                                >
                                    {isEmailing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3 text-indigo-400" />}
                                    Email
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleDownloadPDF}
                                    disabled={isDownloading}
                                    className="flex-[2] py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                                    Download PDF
                                </motion.button>
                            </div>
                            <p className="text-center text-[8px] text-slate-600 font-mono italic">
                                Timestamped • {new Date(report.generatedAt).toLocaleTimeString()}
                            </p>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
