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
                "bg-slate-900/40 border rounded-2xl overflow-hidden transition-all duration-300 backdrop-blur-md",
                item.detected ? "border-red-500/30 ring-1 ring-red-500/10" : "border-slate-700/40",
                "h-full group hover:bg-slate-800/60"
            )}
        >
            <button
                onClick={onToggle}
                className="w-full h-full p-4 sm:p-5 hover:bg-white/5 transition-colors text-left"
            >
                <div className="flex items-center gap-4">
                    {/* Icon - Constant Size */}
                    <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl border transition-all duration-300 group-hover:scale-110",
                        item.detected ? "bg-red-500/20 border-red-500/30 shadow-red-500/10" : "bg-slate-800 border-white/5"
                    )}>
                        <Icon className={cn("w-6 h-6", item.detected ? "text-red-400" : "text-slate-400")} />
                    </div>

                    {/* Label Area - Flex-1 with enough min-width */}
                    <div className="flex-1 min-w-0 pr-2">
                        <span className="block text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1 group-hover:text-slate-400 transition-colors">
                            Diagnosis
                        </span>
                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white/90 leading-tight break-words">
                            {item.category.replace(" Analysis", "").replace(" Detection", "")}
                        </h4>
                        {/* Short info always visible */}
                        <p className="text-[10px] sm:text-xs text-slate-400 mt-1.5 leading-snug line-clamp-2">
                            {item.category.includes("Face") && "Analyzes facial features for manipulation signs"}
                            {item.category.includes("FFT") && "Detects AI-generated texture patterns in frequency domain"}
                            {item.category.includes("Color") && "Checks color distribution consistency across the image"}
                            {item.category.includes("Eye") && "Examines eye region for deepfake artifacts"}
                            {item.category.includes("Noise") && "Analyzes noise patterns for synthetic content markers"}
                        </p>
                    </div>

                    {/* Score Area - Far Right, Fixed width to prevent overlap */}
                    <div className="flex flex-col items-end flex-shrink-0 min-w-[70px]">
                        {score !== null && (
                            <div className="flex items-baseline gap-1">
                                <span className={cn("text-2xl sm:text-3xl font-black italic tracking-tighter tabular-nums", getScoreColor(score))}>
                                    {score}%
                                </span>
                                <span className="text-[10px] font-black uppercase text-slate-500/60 tracking-widest leading-none">
                                    LVL
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                            <ChevronDown className={cn("w-3.5 h-3.5 text-slate-600 transition-transform duration-300 group-hover:text-slate-400", isExpanded && "rotate-180")} />
                        </div>
                    </div>
                </div>
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <m.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="bg-gradient-to-b from-slate-900/80 to-slate-950"
                    >
                        <div className="px-5 py-5 border-t border-violet-500/30 min-h-[80px]">
                            <div className="flex items-start gap-4">
                                <div className="w-1 min-h-[50px] bg-gradient-to-b from-violet-500 to-violet-600/50 rounded-full flex-shrink-0" />
                                <div className="flex-1">
                                    <span className="block text-[10px] font-black uppercase tracking-[0.15em] text-violet-400 mb-3">
                                        AI Explanation
                                    </span>
                                    <p className="text-sm sm:text-base text-white leading-relaxed font-medium">
                                        {(item.explanation && item.explanation.trim().length > 0)
                                            ? item.explanation
                                            : "No detailed explanation available for this metric. The analysis is based on pattern recognition and statistical modeling of the media content."}
                                    </p>
                                </div>
                            </div>
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
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop with Strong Blur */}
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/95 backdrop-blur-3xl"
                    onClick={onClose}
                />

                {/* Modal - Centered with max-height and responsive width */}
                <m.div
                    layout
                    initial={{ scale: 0.95, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 30 }}
                    transition={{ type: "spring", damping: 25, stiffness: 400 }}
                    className="relative w-full max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[90vh] bg-slate-950 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
                >
                    {/* Header - Premium Navigation Feel */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-910 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Brain className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xs sm:text-sm font-black italic uppercase tracking-wider text-white leading-tight">Authenticity Report</h2>
                                <div className="flex items-center gap-1.5 text-blue-400 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    <span className="text-[9px] font-black tracking-[0.2em] uppercase opacity-80">{report ? report.modelUsed : "Neural Engine v8"}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/10 group"
                        >
                            <X className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8 CustomScroll">
                        {(isLoading || isGenerating) && (
                            <div className="flex flex-col items-center justify-center py-24 space-y-6">
                                <div className="relative">
                                    <m.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                        className="w-16 h-16 border-2 border-dashed border-violet-500/30 rounded-full"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin-slow" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-black text-white uppercase tracking-[0.3em] mb-1">Processing Analysis</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Calibrating Neural Weights...</p>
                                </div>
                            </div>
                        )}

                        {error && !isLoading && !isGenerating && (
                            <div className="flex flex-col items-center justify-center py-16 space-y-6 text-center">
                                <div className="w-20 h-20 rounded-full bg-rose-500/5 border border-rose-500/10 flex items-center justify-center">
                                    <XOctagon className="w-10 h-10 text-rose-500/40" />
                                </div>
                                <div>
                                    <h3 className="text-white font-black uppercase tracking-wider mb-2">Analysis Failed</h3>
                                    <p className="text-sm text-slate-400 font-medium max-w-[280px] mx-auto italic">"{error.message}"</p>
                                </div>
                                <button
                                    onClick={_onGenerate}
                                    className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
                                >
                                    Retry Core Scan
                                </button>
                            </div>
                        )}

                        {report && !isLoading && !isGenerating && (
                            <div className="space-y-10">
                                {/* Verdict Card Section */}
                                <div className={cn(
                                    "p-6 sm:p-10 rounded-[2.5rem] border bg-gradient-to-br relative overflow-hidden shadow-2xl group/v",
                                    verdictInfo?.bgGradient,
                                    verdictInfo?.borderColor
                                )}>
                                    {/* Decorative background elements */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

                                    <div className="relative z-10">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl border bg-black/40",
                                                    verdictInfo?.borderColor
                                                )}>
                                                    {verdictInfo?.icon && <verdictInfo.icon className={cn("w-8 h-8", verdictInfo?.color)} />}
                                                </div>
                                                <div>
                                                    <div className={cn("inline-flex px-3 py-1 rounded-full bg-black/40 border text-[10px] font-black tracking-[0.2em] mb-2 uppercase", verdictInfo?.color, verdictInfo?.borderColor)}>
                                                        {verdictInfo?.label}
                                                    </div>
                                                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter leading-tight italic">
                                                        DeepScan Analysis Complete
                                                    </h3>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end bg-black/20 p-4 rounded-2xl border border-white/5">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-4xl sm:text-6xl font-black text-white leading-none tracking-tighter CustomNumber">
                                                        {confidence}%
                                                    </span>
                                                </div>
                                                <span className="text-[10px] sm:text-[11px] text-white/50 font-black uppercase tracking-[0.3em] mt-2">Authenticity Index</span>
                                            </div>
                                        </div>

                                        <p className="text-sm sm:text-lg text-white/80 leading-relaxed font-bold mb-8 max-w-2xl bg-black/10 p-4 rounded-xl border border-white/5 italic">
                                            "{report.report.summary}"
                                        </p>

                                        {/* Progress Bar with Tooltip Area */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-end px-1">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">Neural Confidence</span>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map((i) => (
                                                            <div key={i} className={cn(
                                                                "h-1 w-4 rounded-full",
                                                                confidence >= i * 20 ? "bg-white/40" : "bg-white/10"
                                                            )} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black text-white px-3 py-1 bg-black/30 rounded-full border border-white/10">
                                                    {confidence >= 80 ? 'HIGH' : confidence >= 60 ? 'MODERATE' : 'LOW'} RELIABILITY
                                                </span>
                                            </div>
                                            <div className="h-3 rounded-full bg-black/40 overflow-hidden p-1 border border-white/5">
                                                <m.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${confidence}%` }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                    className={cn(
                                                        "h-full rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)]",
                                                        report.report.verdict === 'authentic' ? "bg-emerald-400" :
                                                            report.report.verdict === 'suspicious' ? "bg-amber-400" : "bg-red-400"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Audit Metrics Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 px-2">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-slate-800" />
                                        <div className="flex items-center gap-3">
                                            <Sparkles className="w-4 h-4 text-violet-500" />
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 whitespace-nowrap">Diagnostic Breakdown</h3>
                                        </div>
                                        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-800 to-slate-800" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                                {/* Tools & Technical Section */}
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
                                    {/* Security Tips - Left Side */}
                                    <div className="lg:col-span-12 bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 backdrop-blur-xl">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                                                <Zap className="w-5 h-5 text-violet-400" />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-[0.2em] text-violet-400/90">Countermeasure Engine</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {(report.report.recommendations || []).slice(0, 3).map((rec, i) => (
                                                <div key={i} className="flex flex-col gap-4 p-5 rounded-2xl bg-slate-900/50 border border-white/[0.03] hover:border-violet-500/20 transition-all duration-300">
                                                    <div className="w-8 h-8 rounded-lg bg-violet-600/10 flex items-center justify-center border border-violet-500/20">
                                                        <span className="text-[11px] font-black text-violet-400">{i + 1}</span>
                                                    </div>
                                                    <p className="text-xs sm:text-[13px] text-slate-400 leading-relaxed font-bold">
                                                        {rec}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Technical Diagnostics - Collapsible but Premium */}
                                    <div className="lg:col-span-12 bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden">
                                        <button
                                            onClick={() => setShowTechnical(!showTechnical)}
                                            className="w-full px-8 py-5 flex items-center justify-between hover:bg-white/5 transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <RefreshingCw className="w-5 h-5 text-amber-500/50" />
                                                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white transition-colors">Core Signal Diagnostics</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-400">Expand Logs</span>
                                                <ChevronDown className={cn("w-5 h-5 text-slate-600 group-hover:text-white transition-transform duration-500", showTechnical && "rotate-180")} />
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {showTechnical && (
                                                <m.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden bg-black/60"
                                                >
                                                    <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        {(report.report.technicalDetails || []).map((detail, i) => (
                                                            <div key={i} className="flex justify-between items-center bg-white/[0.03] px-4 py-3 rounded-xl border border-white/5 hover:border-amber-500/20 transition-colors">
                                                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{detail.metric}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                                    <span className="text-[11px] font-mono text-amber-400 font-black tabular-nums">{detail.value}</span>
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

// Simple internal helper for refreshing spin
function RefreshingCw({ className }: { className?: string }) {
    return <RefreshCw className={cn(className, "animate-spin-slow")} />;
}
