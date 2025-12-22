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
    Brain,
    Cpu,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Activity,
    Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIReport, DetectionItem, TechnicalDetail } from "@/hooks/useAIReport";

interface AIReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    report: AIReport | null;
    isLoading: boolean;
    isGenerating: boolean;
    onGenerate: () => void;
    error?: Error | null;
}

const verdictConfig = {
    authentic: {
        icon: ShieldCheck,
        label: "AUTHENTIC",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
        description: "This content appears to be genuine and unmanipulated."
    },
    suspicious: {
        icon: AlertTriangle,
        label: "SUSPICIOUS",
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
        description: "This content shows some signs that may warrant further verification."
    },
    fake: {
        icon: XOctagon,
        label: "MANIPULATED",
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
        description: "This content shows significant signs of AI manipulation or alteration."
    }
};

const severityColors = {
    low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    high: "text-red-400 bg-red-500/10 border-red-500/20"
};

function DetectionCard({ item }: { item: DetectionItem }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <motion.div
            layout
            className={cn(
                "border rounded-xl p-3 backdrop-blur-sm transition-all",
                item.detected ? severityColors[item.severity] : "border-slate-700/50 bg-slate-800/30"
            )}
        >
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2">
                    {item.detected ? (
                        <AlertCircle className="w-4 h-4" />
                    ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wide">
                        {item.category}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {item.score !== undefined && (
                        <span className="text-[10px] font-mono opacity-70">
                            {(item.score * 100).toFixed(0)}%
                        </span>
                    )}
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
            </div>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            {item.explanation}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function TechnicalDetailRow({ detail }: { detail: TechnicalDetail }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
            <div className="flex items-center gap-2">
                <Cpu className="w-3 h-3 text-slate-500" />
                <span className="text-xs text-slate-400">{detail.metric}</span>
            </div>
            <div className="text-right">
                <span className="text-xs font-mono font-bold text-white">{detail.value}</span>
                <p className="text-[10px] text-slate-500 max-w-[150px]">{detail.interpretation}</p>
            </div>
        </div>
    );
}

export function AIReportModal({
    isOpen,
    onClose,
    report,
    isLoading,
    isGenerating,
    onGenerate,
    error
}: AIReportModalProps) {
    const [showTechnical, setShowTechnical] = useState(false);

    if (!isOpen) return null;

    const verdictInfo = report ? verdictConfig[report.report.verdict] : null;

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
                    className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                    onClick={onClose}
                >
                    {/* Animated Scanline Effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none animate-[scanline_10s_linear_infinite]" />
                </div>

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 40 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 40 }}
                    className="relative w-full max-w-lg max-h-[85vh] overflow-hidden bg-slate-900/40 border border-white/10 rounded-[2rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
                >
                    {/* Corner Accents */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-violet-500/50 rounded-tl-[2rem] pointer-events-none" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-violet-500/50 rounded-tr-[2rem] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-violet-500/50 rounded-bl-[2rem] pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-violet-500/50 rounded-br-[2rem] pointer-events-none" />

                    {/* Header */}
                    <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/5 bg-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                                    <Brain className="w-6 h-6 text-white" />
                                </div>
                                <motion.div
                                    className="absolute -inset-1 rounded-2xl bg-violet-500/20 blur-sm"
                                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                            </div>
                            <div>
                                <h2 className="text-base font-black italic uppercase tracking-tight text-white flex items-center gap-2">
                                    Authenticity Index
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                </h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <Cpu className="w-3 h-3 text-violet-400" />
                                    {report ? `Neural Core: ${report.modelUsed.toUpperCase()}` : "Initializing Engine..."}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all group"
                        >
                            <X className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                        </button>
                    </div>

                    {/* Content Scroll Area */}
                    <div className="overflow-y-auto max-h-[calc(85vh-88px)] p-6 space-y-6 scrollbar-none">
                        {/* Loading State */}
                        {(isLoading || isGenerating) && (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-2 border-violet-500/30 flex items-center justify-center">
                                        <Brain className="w-8 h-8 text-violet-400 animate-pulse" />
                                    </div>
                                    <motion.div
                                        className="absolute inset-0 rounded-full border-2 border-t-violet-500"
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-white">Analyzing Content</p>
                                    <p className="text-xs text-slate-500">AI is generating your detailed report...</p>
                                </div>
                            </div>
                        )}

                        {/* Error State */}
                        {error && !isLoading && !isGenerating && (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                                    <XOctagon className="w-8 h-8 text-red-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-white">Report Not Available</p>
                                    <p className="text-xs text-slate-500 max-w-xs">
                                        {error.message || "Unable to generate report. Please try again."}
                                    </p>
                                </div>
                                <button
                                    onClick={onGenerate}
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Generate Report
                                </button>
                            </div>
                        )}

                        {/* No Report - Generate Prompt */}
                        {!report && !isLoading && !isGenerating && !error && (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center">
                                    <Brain className="w-8 h-8 text-violet-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-white">Generate AI Report</p>
                                    <p className="text-xs text-slate-500 max-w-xs">
                                        Get a detailed explanation of the AI analysis with recommendations.
                                    </p>
                                </div>
                                <button
                                    onClick={onGenerate}
                                    disabled={isGenerating}
                                    className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isGenerating ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-4 h-4" />
                                    )}
                                    Generate Full Report
                                </button>
                            </div>
                        )}

                        {/* Report Content */}
                        {report && !isLoading && !isGenerating && (
                            <>
                                {/* Verdict Card */}
                                <div className={cn(
                                    "relative p-6 rounded-[1.5rem] border overflow-hidden group",
                                    verdictInfo?.bgColor,
                                    verdictInfo?.borderColor
                                )}>
                                    {/* Animated Background Pulse */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent animate-[neuralPulse_4s_ease-in-out_infinite]" />

                                    {/* Glow Line Animation */}
                                    <div className="absolute top-0 h-[1px] w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[glowLine_3s_linear_infinite]" />

                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md border",
                                                    verdictInfo?.borderColor,
                                                    verdictInfo?.bgColor
                                                )}>
                                                    {verdictInfo && <verdictInfo.icon className={cn("w-7 h-7", verdictInfo.color)} />}
                                                </div>
                                                <div>
                                                    <span className={cn("text-xl font-black italic tracking-tight uppercase", verdictInfo?.color)}>
                                                        {verdictInfo?.label}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <div className="flex items-center gap-1 scale-75 origin-left">
                                                            <Activity className="w-3 h-3 text-slate-500" />
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confidence</span>
                                                        </div>
                                                        <span className="text-xs font-mono font-bold text-white">
                                                            {(report.report.confidence * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="h-12 w-[1px] bg-white/5" />
                                            <div className="text-right">
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Status</div>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <span className="text-xs font-mono text-emerald-400">ACTIVE</span>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute -left-3 top-0 w-0.5 h-full bg-gradient-to-b from-violet-500/50 to-transparent" />
                                            <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                                {report.report.summary}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Detection Breakdown */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 px-1">
                                        <div className="w-1 h-3 bg-violet-500 rounded-full" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                            Neural Breakdown
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {report.report.detectionBreakdown.map((item, i) => (
                                            <DetectionCard key={i} item={item} />
                                        ))}
                                    </div>
                                </div>

                                {/* Technical Details (Collapsible) */}
                                <div className="bg-slate-900/40 border border-white/5 rounded-[1.5rem] overflow-hidden backdrop-blur-sm group">
                                    <button
                                        onClick={() => setShowTechnical(!showTechnical)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center border border-white/5 group-hover:border-violet-500/30 transition-colors">
                                                <Zap className="w-4 h-4 text-violet-400" />
                                            </div>
                                            <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                                                Diagnostic Core Data
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{showTechnical ? 'Minimize' : 'Analyze'}</span>
                                            {showTechnical ? (
                                                <ChevronUp className="w-4 h-4 text-slate-500" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-slate-500" />
                                            )}
                                        </div>
                                    </button>
                                    <AnimatePresence>
                                        {showTechnical && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden bg-black/20"
                                            >
                                                <div className="p-4 pt-1 divide-y divide-white/5">
                                                    {report.report.technicalDetails.map((detail, i) => (
                                                        <TechnicalDetailRow key={i} detail={detail} />
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Recommendations */}
                                <div className="bg-slate-900/40 border border-white/5 rounded-[1.5rem] p-5 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Sparkles className="w-4 h-4 text-violet-400" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                            AI Countermeasures
                                        </h3>
                                    </div>
                                    <ul className="grid grid-cols-1 gap-3">
                                        {report.report.recommendations.map((rec, i) => (
                                            <motion.li
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group/rec"
                                            >
                                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-violet-500 group-hover/rec:scale-125 transition-transform" />
                                                <span className="text-xs text-slate-300 leading-relaxed font-medium">{rec}</span>
                                            </motion.li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Footer Info */}
                                <div className="text-center pt-2">
                                    <p className="text-[10px] text-slate-600 font-mono">
                                        Report generated on {new Date(report.generatedAt).toLocaleString()}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
