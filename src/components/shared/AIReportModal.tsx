import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    ShieldCheck,
    AlertTriangle,
    XOctagon,
    ChevronDown,
    RefreshCw,
    Brain,
    Sparkles,
    Zap,
    Eye,
    Waves,
    Palette,
    Focus,
    Fingerprint
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIReport, DetectionItem } from "@/hooks/useAIReport";

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
    postId: _postId,
    contentType: _contentType = 'feed'
}: AIReportModalProps) {
    const [showTechnical, setShowTechnical] = useState(false);
    const [expandedMetricIndex, setExpandedMetricIndex] = useState<number | null>(null);

    if (!isOpen) return null;

    const verdictInfo = report ? verdictConfig[report.report.verdict] : null;
    const confidence = report ? Math.round(report.report.confidence * 100) : 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-20">
                {/* Backdrop with Strong Blur */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/90 backdrop-blur-2xl"
                    onClick={onClose}
                />

                {/* Modal - Centered with max-height */}
                <motion.div
                    layout
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 30, stiffness: 500 }}
                    className="relative w-full max-w-sm max-h-[75vh] bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header - Fixed */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-950 rounded-t-2xl flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 flex items-center justify-center">
                                <Brain className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-[10px] font-black italic uppercase tracking-tight text-white leading-tight">AI Authenticity</h2>
                                <div className="flex items-center gap-1 text-blue-400">
                                    <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-[7px] font-black tracking-widest uppercase">{report ? report.modelUsed : "GROQ"}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/10"
                        >
                            <X className="w-3 h-3 text-slate-400" />
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                        {(isLoading || isGenerating) && (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    <RefreshCw className="w-10 h-10 text-violet-500" />
                                </motion.div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Neural Syncing...</p>
                            </div>
                        )}

                        {error && !isLoading && !isGenerating && (
                            <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
                                <XOctagon className="w-12 h-12 text-rose-500/50" />
                                <p className="text-sm text-slate-400 font-bold max-w-[200px]">{error.message}</p>
                                <button
                                    onClick={_onGenerate}
                                    className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-white"
                                >
                                    Retry Analysis
                                </button>
                            </div>
                        )}

                        {report && !isLoading && !isGenerating && (
                            <div className="space-y-5 sm:space-y-8">
                                {/* Compact Verdict Card */}
                                <div className={cn(
                                    "p-4 sm:p-6 rounded-[2rem] border bg-gradient-to-br relative overflow-hidden group/v shadow-2xl",
                                    verdictInfo?.bgGradient,
                                    verdictInfo?.borderColor
                                )}>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className={cn("px-2.5 py-1 rounded-lg bg-black/40 border text-[9px] sm:text-[10px] font-black italic tracking-widest", verdictInfo?.color, verdictInfo?.borderColor)}>
                                                    {verdictInfo?.label}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-2xl sm:text-4xl font-black text-white leading-none tracking-tighter">
                                                    {confidence}%
                                                </span>
                                                <span className="text-[8px] sm:text-[10px] text-white/40 font-bold uppercase tracking-widest">Real Score</span>
                                            </div>
                                        </div>

                                        <p className="text-xs sm:text-base text-white/90 leading-relaxed font-bold mb-4">
                                            {report.report.summary}
                                        </p>

                                        {/* Simplified Confidence Bar */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-[8px] sm:text-[10px] text-white/40 font-black uppercase tracking-widest px-0.5">
                                                <span>Confidence Level</span>
                                                <span className="text-white/60">
                                                    {confidence >= 80 ? 'Optimal' : confidence >= 60 ? 'Stable' : 'Uncertain'}
                                                </span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-black/30 overflow-hidden p-[1px]">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${confidence}%` }}
                                                    className={cn(
                                                        "h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]",
                                                        report.report.verdict === 'authentic' ? "bg-emerald-400" :
                                                            report.report.verdict === 'suspicious' ? "bg-amber-400" : "bg-red-400"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics - 3 Column Grid on Mobile */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-800" />
                                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 whitespace-nowrap">Audit Metrics</h3>
                                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-800" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(report.report.detectionBreakdown || []).map((item, i) => (
                                            <MetricCard
                                                key={i}
                                                item={item}
                                                isExpanded={expandedMetricIndex === i}
                                                onToggle={() => setExpandedMetricIndex(expandedMetricIndex === i ? null : i)}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Collapsible Tools */}
                                <div className="grid grid-cols-1 gap-4">
                                    {/* Diagnostics */}
                                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
                                        <button
                                            onClick={() => setShowTechnical(!showTechnical)}
                                            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/5 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Zap className="w-4 h-4 text-amber-400" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Core Diagnostics</span>
                                            </div>
                                            <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", showTechnical && "rotate-180")} />
                                        </button>
                                        <AnimatePresence>
                                            {showTechnical && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: "auto" }}
                                                    exit={{ height: 0 }}
                                                    className="overflow-hidden bg-black/20"
                                                >
                                                    <div className="p-4 space-y-2.5">
                                                        {(report.report.technicalDetails || []).map((detail, i) => (
                                                            <div key={i} className="flex justify-between items-center bg-white/[0.02] p-2 rounded-lg border border-white/5">
                                                                <span className="text-[9px] text-slate-500 uppercase font-black">{detail.metric}</span>
                                                                <span className="text-[10px] font-mono text-white font-black">{detail.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Expert Tips */}
                                    <div className="bg-violet-600/5 border border-violet-500/10 rounded-2xl p-4 sm:p-5">
                                        <div className="flex items-center gap-2.5 mb-3">
                                            <Sparkles className="w-4 h-4 text-violet-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-400/80">Expert Security Tips</span>
                                        </div>
                                        <div className="space-y-3">
                                            {(report.report.recommendations || []).slice(0, 3).map((rec, i) => (
                                                <div key={i} className="flex items-start gap-3">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                                                    <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                                                        {rec}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
}
