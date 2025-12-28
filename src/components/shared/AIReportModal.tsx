import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    ShieldCheck,
    AlertTriangle,
    XOctagon,
    ChevronDown,
    Loader2,
    RefreshCw,
    Brain,
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
import type { AIReport, DetectionItem } from "@/hooks/useAIReport";
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
    contentType?: 'feed' | 'short' | 'story';  // Content type for PDF filename
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

function MetricCard({ item, isExpanded, onToggle }: { item: DetectionItem; isExpanded: boolean; onToggle: () => void }) {
    const Icon = categoryIcons[item.category] || Brain;
    const score = item.score !== undefined ? Math.round(item.score * 100) : null;

    const getScoreColor = (s: number) => {
        if (s >= 70) return "text-red-400";
        if (s >= 40) return "text-amber-400";
        return "text-emerald-400";
    };

    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 10, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1 }
            }}
            className={cn(
                "bg-slate-800/40 border rounded-xl sm:rounded-2xl overflow-hidden transition-all backdrop-blur-sm",
                item.detected ? "border-red-500/20" : "border-slate-700/30",
                "h-fit"
            )}
        >
            <button
                onClick={onToggle}
                className="w-full p-2.5 sm:p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center",
                        item.detected ? "bg-red-500/10" : "bg-slate-700/30"
                    )}>
                        <Icon className={cn("w-3.5 h-3.5 sm:w-5 sm:h-5", item.detected ? "text-red-400" : "text-slate-400")} />
                    </div>
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-tight text-white/80">
                        {item.category.replace(" Analysis", "").replace(" Detection", "")}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {score !== null && (
                        <span className={cn("text-xs sm:text-lg font-black italic", getScoreColor(score))}>
                            {score}%
                        </span>
                    )}
                    <ChevronDown className={cn("w-3 h-3 text-slate-500 transition-transform duration-300", isExpanded && "rotate-180")} />
                </div>
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-1">
                            <p className="text-[10px] sm:text-[13px] text-slate-400 leading-relaxed font-bold">
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
    onGenerate: _onGenerate,
    error,
    postId,
    contentType = 'feed'
}: AIReportModalProps) {
    const [showTechnical, setShowTechnical] = useState(false);
    const [expandedMetricIndex, setExpandedMetricIndex] = useState<number | null>(null);
    const { downloadPDF, isDownloading } = useDownloadPDFReport();
    const { emailReport, isEmailing } = useEmailReport();

    const handleDownloadPDF = () => {
        if (!report || !postId) return;
        downloadPDF({
            postId,
            contentType,
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={{
                        hidden: { scale: 0.95, opacity: 0, y: 20, filter: "blur(10px)" },
                        visible: {
                            scale: 1, opacity: 1, y: 0, filter: "blur(0px)",
                            transition: {
                                type: "spring", damping: 30, stiffness: 400,
                                staggerChildren: 0.05, delayChildren: 0.1
                            }
                        }
                    }}
                    className="relative w-full max-w-sm sm:max-w-md md:max-w-xl max-h-[90vh] bg-slate-950 border border-white/10 rounded-[2rem] sm:rounded-[3rem] shadow-[0_0_50px_-12px_rgba(0,0,0,1)] overflow-hidden flex flex-col"
                >
                    {/* Header - HUD style */}
                    <div className="flex items-center justify-between p-3 sm:p-5 border-b border-white/5 bg-white/[0.02] backdrop-blur-xl">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 group">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                >
                                    <Brain className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                                </motion.div>
                            </div>
                            <div>
                                <h2 className="text-[12px] sm:text-lg font-black italic uppercase tracking-tight text-white leading-tight">AI Authenticity</h2>
                                <div className="flex items-center gap-1 sm:gap-2 text-blue-400 capitalize">
                                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-[8px] sm:text-xs font-black tracking-widest uppercase">{report ? report.modelUsed : "V8.0 Engine"}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/10 active:scale-90"
                        >
                            <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 scrollbar-hide">

                        {(isLoading || isGenerating) && (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <RefreshCw className="w-10 h-10 text-violet-500 animate-spin" />
                                <p className="text-[11px] sm:text-sm font-black text-slate-400 uppercase tracking-widest">Neural Syncing...</p>
                            </div>
                        )}

                        {error && !isLoading && !isGenerating && (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                                <XOctagon className="w-10 h-10 text-rose-500" />
                                <p className="text-sm text-slate-400 font-bold">{error.message}</p>
                            </div>
                        )}

                        {report && !isLoading && !isGenerating && (
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: { transition: { staggerChildren: 0.05 } }
                                }}
                                className="space-y-4 sm:space-y-6"
                            >
                                {/* Verdict Card */}
                                <motion.div
                                    variants={{
                                        hidden: { opacity: 0, x: -20 },
                                        visible: { opacity: 1, x: 0 }
                                    }}
                                    className={cn(
                                        "p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border bg-gradient-to-br relative overflow-hidden group/v shadow-xl",
                                        verdictInfo?.bgGradient,
                                        verdictInfo?.borderColor
                                    )}
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                        {verdictInfo && <verdictInfo.icon className="w-24 h-24 sm:w-32 sm:h-32" />}
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-center mb-2 sm:mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full animate-pulse", verdictInfo?.color.replace("text-", "bg-"))} />
                                                <span className={cn("text-[10px] sm:text-sm font-black italic uppercase tracking-[0.2em]", verdictInfo?.color)}>
                                                    Verdict: {verdictInfo?.label}
                                                </span>
                                            </div>
                                            <span className="text-2xl sm:text-4xl font-black text-white tabular-nums tracking-tighter">
                                                {confidence}%
                                            </span>
                                        </div>

                                        {/* Confidence Meter */}
                                        <div className="mb-3 sm:mb-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[8px] sm:text-[10px] text-slate-500 uppercase font-black tracking-widest">Confidence Level</span>
                                                <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-bold">
                                                    {confidence >= 80 ? 'Very High' : confidence >= 60 ? 'High' : confidence >= 40 ? 'Moderate' : 'Low'}
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-slate-800/50 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${confidence}%` }}
                                                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                                                    className={cn(
                                                        "h-full rounded-full",
                                                        report.report.verdict === 'authentic'
                                                            ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                                            : report.report.verdict === 'suspicious'
                                                                ? "bg-gradient-to-r from-amber-500 to-amber-400"
                                                                : "bg-gradient-to-r from-red-500 to-red-400"
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        <p className="text-[11px] sm:text-[15px] text-white/80 leading-relaxed font-bold">
                                            {report.report.summary}
                                        </p>

                                        {/* What This Means */}
                                        <div className="mt-3 pt-3 border-t border-white/10">
                                            <p className="text-[9px] sm:text-[11px] text-slate-400 italic leading-relaxed">
                                                <span className="font-black text-slate-300 not-italic">What this means: </span>
                                                {report.report.verdict === 'authentic'
                                                    ? "Our AI analysis found no significant signs of manipulation. The content appears to be genuine and unaltered."
                                                    : report.report.verdict === 'suspicious'
                                                        ? "Some anomalies were detected that may indicate editing or manipulation. Review the detailed breakdown below."
                                                        : "Strong indicators of digital manipulation were found. This content has likely been artificially altered or generated."}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Analysis List */}
                                <div className="space-y-3 sm:space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <h3 className="text-[9px] sm:text-xs font-black uppercase tracking-[0.4em] text-slate-500">Audit Metrics breakdown</h3>
                                        <div className="w-12 sm:w-20 h-px bg-slate-800" />
                                    </div>
                                    <motion.div
                                        variants={{
                                            hidden: { opacity: 0 },
                                            visible: {
                                                opacity: 1,
                                                transition: { staggerChildren: 0.1 }
                                            }
                                        }}
                                        className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 items-start"
                                    >
                                        {report.report.detectionBreakdown.map((item, i) => (
                                            <MetricCard
                                                key={i}
                                                item={item}
                                                isExpanded={expandedMetricIndex === i}
                                                onToggle={() => setExpandedMetricIndex(expandedMetricIndex === i ? null : i)}
                                            />
                                        ))}
                                    </motion.div>
                                </div>

                                {/* Summary & Actions Grouped */}
                                <div className="space-y-3 sm:space-y-4">
                                    {/* Tech Details */}
                                    <div className="bg-slate-800/20 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
                                        <button
                                            onClick={() => setShowTechnical(!showTechnical)}
                                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Zap className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-400" />
                                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-slate-400">Core Diagnostics</span>
                                            </div>
                                            <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", showTechnical && "rotate-180")} />
                                        </button>
                                        <AnimatePresence>
                                            {showTechnical && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: "auto" }}
                                                    exit={{ height: 0 }}
                                                    className="overflow-hidden border-t border-white/5"
                                                >
                                                    <div className="p-3 sm:p-4 space-y-2">
                                                        {report.report.technicalDetails.map((detail, i) => (
                                                            <div key={i} className="flex justify-between items-center px-1">
                                                                <span className="text-[10px] sm:text-xs text-slate-500 uppercase font-black">{detail.metric}</span>
                                                                <span className="text-[10px] sm:text-xs font-mono text-white font-black">{detail.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Recommendations */}
                                    <div className="bg-violet-500/5 border border-violet-500/10 rounded-2xl p-4 sm:p-6">
                                        <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                            <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-violet-400" />
                                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-violet-400/70">Expert Security Tips</span>
                                        </div>
                                        <ul className="space-y-2 sm:space-y-3">
                                            {report.report.recommendations.slice(0, 3).map((rec, i) => (
                                                <li key={i} className="flex items-start gap-3 text-[11px] sm:text-sm text-slate-400 leading-relaxed font-bold">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                                                    {rec}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Footer */}
                    {report && postId && (
                        <div className="p-4 sm:p-6 border-t border-white/5 bg-slate-950/80 backdrop-blur-xl relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                            <div className="flex gap-3 sm:gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleEmailReport}
                                    disabled={isEmailing}
                                    className="flex-1 py-2 sm:py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/5"
                                >
                                    {isEmailing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 text-indigo-400" />}
                                    Email
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleDownloadPDF}
                                    disabled={isDownloading}
                                    className="flex-[1.5] py-2 sm:py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                                    PDF Report
                                </motion.button>
                            </div>
                            <div className="mt-3 flex items-center justify-center gap-2 opacity-30">
                                <div className="h-px flex-1 bg-slate-800" />
                                <p className="text-[8px] sm:text-[10px] text-slate-500 font-mono tracking-widest uppercase font-bold">
                                    Verified Secure · {new Date(report.generatedAt).toLocaleTimeString()}
                                </p>
                                <div className="h-px flex-1 bg-slate-800" />
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
