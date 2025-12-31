import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
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
        <m.div
            variants={{
                hidden: { opacity: 0, y: 10, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1 }
            }}
            className={cn(
                "bg-slate-800/40 border rounded-xl sm:rounded-2xl overflow-hidden transition-all backdrop-blur-sm",
                item.detected ? "border-red-500/20" : "border-slate-700/30",
                "h-full shadow-lg hover:shadow-xl transition-shadow duration-300"
            )}
        >
            <button
                onClick={onToggle}
                className="w-full h-full p-4 sm:p-5 hover:bg-white/5 transition-colors text-left flex flex-col justify-between gap-4"
            >
                {/* Top Section: Icon and Label */}
                <div className="flex items-start gap-4">
                    <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg border",
                        item.detected ? "bg-red-500/10 border-red-500/20" : "bg-slate-700/30 border-white/5"
                    )}>
                        <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", item.detected ? "text-red-400" : "text-slate-400")} />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                        <span className="block text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 mb-0.5">
                            Metric Diagnostic
                        </span>
                        <span className="block text-xs sm:text-sm font-black uppercase tracking-tight text-white leading-tight break-words">
                            {item.category.replace(" Analysis", "").replace(" Detection", "")}
                        </span>
                    </div>
                </div>

                {/* Bottom Section: Score and Chevron */}
                <div className="flex items-end justify-between pl-[3.5rem] sm:pl-[4rem]">
                    {score !== null && (
                        <div className="flex items-baseline gap-1.5">
                            <span className={cn("text-2xl sm:text-3xl font-black italic tracking-tighter leading-none", getScoreColor(score))}>
                                {score}%
                            </span>
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
                                Prob
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 pb-1">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest hidden sm:inline">Explanation</span>
                        <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform duration-300", isExpanded && "rotate-180")} />
                    </div>
                </div>
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <m.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-black/20"
                    >
                        <div className="p-4 space-y-2">
                            <p className="text-[11px] sm:text-[13px] text-slate-400 leading-relaxed font-bold border-l-2 border-violet-500 pl-3">
                                {item.explanation}
                            </p>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </m.div>
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
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/90 backdrop-blur-2xl"
                    onClick={onClose}
                />

                {/* Modal - Centered with max-height */}
                <m.div
                    layout
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 30, stiffness: 500 }}
                    className="relative w-full max-w-sm max-h-[85vh] bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header - Fixed */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-910 rounded-t-2xl flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 flex items-center justify-center">
                                <Brain className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-[11px] font-black italic uppercase tracking-tight text-white leading-tight">AI Authenticity</h2>
                                <div className="flex items-center gap-1 text-blue-400">
                                    <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-[8px] font-black tracking-widest uppercase">{report ? report.modelUsed : "GROQ"}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/10"
                        >
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                        {(isLoading || isGenerating) && (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <m.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    <RefreshCw className="w-12 h-12 text-violet-500" />
                                </m.div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Syncing...</p>
                            </div>
                        )}

                        {error && !isLoading && !isGenerating && (
                            <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
                                <XOctagon className="w-14 h-14 text-rose-500/50" />
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
                            <div className="space-y-6">
                                {/* Compact Verdict Card */}
                                <div className={cn(
                                    "p-5 sm:p-7 rounded-[2rem] border bg-gradient-to-br relative overflow-hidden group/v shadow-2xl",
                                    verdictInfo?.bgGradient,
                                    verdictInfo?.borderColor
                                )}>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className={cn("px-2.5 py-1 rounded-lg bg-black/40 border text-[9px] sm:text-[10px] font-black italic tracking-widest whitespace-nowrap", verdictInfo?.color, verdictInfo?.borderColor)}>
                                                    {verdictInfo?.label}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-3xl sm:text-4xl font-black text-white leading-none tracking-tighter">
                                                    {confidence}%
                                                </span>
                                                <span className="text-[9px] sm:text-[11px] text-white/40 font-bold uppercase tracking-widest">Confidence</span>
                                            </div>
                                        </div>

                                        <p className="text-xs sm:text-[15px] text-white/90 leading-relaxed font-bold mb-6">
                                            {report.report.summary}
                                        </p>

                                        {/* Simplified Confidence Bar */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[9px] sm:text-[11px] text-white/40 font-black uppercase tracking-widest px-0.5">
                                                <span>Scan Reliability</span>
                                                <span className="text-white/60">
                                                    {confidence >= 80 ? 'Optimal' : confidence >= 60 ? 'Stable' : 'Uncertain'}
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-black/30 overflow-hidden p-[1px]">
                                                <m.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${confidence}%` }}
                                                    className={cn(
                                                        "h-full rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)]",
                                                        report.report.verdict === 'authentic' ? "bg-emerald-400" :
                                                            report.report.verdict === 'suspicious' ? "bg-amber-400" : "bg-red-400"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics - Redesigned Section */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3 px-1">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-800" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 whitespace-nowrap">Audit Metrics</h3>
                                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-800" />
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

                                {/* Expert Tips & Diagnostics */}
                                <div className="space-y-4">
                                    {/* Expert Security Tips */}
                                    <div className="bg-violet-600/5 border border-violet-500/10 rounded-2xl p-5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-1.5 rounded-lg bg-violet-500/10">
                                                <Sparkles className="w-4 h-4 text-violet-400" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-400/80">Expert Security Tips</span>
                                        </div>
                                        <div className="space-y-3">
                                            {(report.report.recommendations || []).slice(0, 3).map((rec, i) => (
                                                <div key={i} className="flex items-start gap-4 p-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                                    <div className="w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <span className="text-[10px] font-black text-violet-400">{i + 1}</span>
                                                    </div>
                                                    <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed font-medium">
                                                        {rec}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Diagnostics */}
                                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-md">
                                        <button
                                            onClick={() => setShowTechnical(!showTechnical)}
                                            className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Zap className="w-4 h-4 text-amber-400" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Core Diagnostics</span>
                                            </div>
                                            <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform duration-300", showTechnical && "rotate-180")} />
                                        </button>
                                        <AnimatePresence>
                                            {showTechnical && (
                                                <m.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden bg-black/40"
                                                >
                                                    <div className="p-4 grid grid-cols-1 gap-2">
                                                        {(report.report.technicalDetails || []).map((detail, i) => (
                                                            <div key={i} className="flex justify-between items-center bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                                                                <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{detail.metric}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
                                                                    <span className="text-[10px] font-mono text-emerald-400 font-black">{detail.value}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </m.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </m.div>
            </div>
        </AnimatePresence>
    );
}
