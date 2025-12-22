import { ShieldCheck, AlertTriangle, XOctagon, Clock, RefreshCw, ChevronDown, Scan, Brain, Activity, Target, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

type TrustLevel = 'authentic' | 'suspicious' | 'fake' | 'likely_fake' | 'analyzing' | 'pending';

interface AnalysisDetails {
    fakeScore?: number;
    realScore?: number;
    framesAnalyzed?: number;
    processingTime?: number;
    mediaType?: 'image' | 'video';
    classification?: string;
}

interface TrustBadgeProps {
    level: TrustLevel | string;
    className?: string;
    showLabel?: boolean;
    score?: number;
    analysisDetails?: AnalysisDetails;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    compact?: boolean;
    isOwner?: boolean;
    onGenerateReport?: () => void;
    isGeneratingReport?: boolean;
}

export function TrustBadge({
    level,
    className,
    score = 94,
    analysisDetails,
    isRefreshing = false,
    compact = false,
    isOwner = false,
    onGenerateReport,
    isGeneratingReport = false
}: TrustBadgeProps) {
    const [showDetails, setShowDetails] = useState(false);

    const config = {
        authentic: {
            icon: ShieldCheck,
            label: "VERIFIED",
            color: "#10b981",
            textColor: "text-emerald-400",
            borderColor: "border-emerald-500/30",
            glow: "shadow-[0_0_15px_rgba(16,185,129,0.1)]",
            signalColor: "bg-emerald-500",
            path: "M10 20l-6-6 1.4-1.4L10 17.2 18.6 8.6l1.4 1.4z"
        },
        suspicious: {
            icon: AlertTriangle,
            label: "SUSPICIOUS",
            color: "#f59e0b",
            textColor: "text-amber-400",
            borderColor: "border-amber-500/30",
            glow: "shadow-[0_0_15px_rgba(245,158,11,0.1)]",
            signalColor: "bg-amber-500",
            path: "M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2z m1 14h-2v2h2v-2z m0-6h-2v4h2v-4z"
        },
        fake: {
            icon: XOctagon,
            label: "DEEPFAKE",
            color: "#ef4444",
            textColor: "text-red-400",
            borderColor: "border-red-500/30",
            glow: "shadow-[0_0_15px_rgba(239,68,68,0.1)]",
            signalColor: "bg-red-500",
            path: "M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27L15.73 3zM12 17.3c-.72 0-1.3-.58-1.3-1.3 0-.72.58-1.3 1.3-1.3.72 0 1.3.58 1.3 1.3 0 .72-.58 1.3-1.3 1.3zm1-4.3h-2V6.7h2V13z"
        },
        likely_fake: {
            icon: XOctagon,
            label: "HIGH RISK",
            color: "#f97316",
            textColor: "text-orange-400",
            borderColor: "border-orange-500/30",
            glow: "shadow-[0_0_15px_rgba(249,115,22,0.1)]",
            signalColor: "bg-orange-500",
            path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
        },
        analyzing: {
            icon: Scan,
            label: "SCANNING",
            color: "#3b82f6",
            textColor: "text-blue-400",
            borderColor: "border-blue-500/30",
            glow: "",
            signalColor: "bg-blue-500",
            path: "M1 1v6h2V3h4V1H1zm22 0h-6v2h4v4h2V1zM1 23h6v-2H3v-4H1v6zm22 0v-6h-2v4h-4v2h6z"
        },
        pending: {
            icon: Clock,
            label: "QUEUE",
            color: "#64748b",
            textColor: "text-slate-400",
            borderColor: "border-slate-500/30",
            glow: "",
            signalColor: "bg-slate-500",
            path: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
        }
    };

    const current = config[level as keyof typeof config] || config.pending;

    // Calculate display score
    const fakePercent = analysisDetails?.fakeScore !== undefined
        ? Math.round(analysisDetails.fakeScore * 100)
        : (100 - score);
    const realPercent = 100 - fakePercent;

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                    "inline-flex items-center gap-2 px-2 py-0.5 rounded-full border bg-black/40 backdrop-blur-md",
                    current.borderColor,
                    className
                )}
            >
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", current.signalColor)} />
                <span className={cn("text-[8px] font-black uppercase tracking-wider", current.textColor)}>
                    {current.label} • {realPercent}%
                </span>
            </motion.div>
        );
    }

    return (
        <div className="relative group/trust">
            <motion.div
                onClick={() => setShowDetails(!showDetails)}
                className={cn(
                    "inline-flex items-center gap-3 p-1 pr-4 rounded-full border bg-slate-900/40 backdrop-blur-2xl transition-all duration-500 hover:bg-slate-900/60 hover:scale-[1.02] active:scale-95 cursor-pointer group/badge",
                    current.borderColor,
                    "shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-primary/5",
                    className
                )}
            >
                {/* HUD Icon Circle */}
                <div className="relative flex-shrink-0">
                    <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center border border-white/10 bg-white/5 transition-transform duration-500 group-hover/badge:rotate-[360deg]",
                        current.textColor
                    )}>
                        {(level === 'analyzing' || isRefreshing) ? (
                            <RefreshCw className="w-4 h-4 animate-spin-slow" />
                        ) : (
                            <current.icon className="w-5 h-5 shadow-sm" />
                        )}
                    </div>
                    {/* Signal Status Dot with Ping Animation */}
                    <div className={cn(
                        "absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950",
                        current.signalColor,
                        "shadow-[0_0_8px_currentColor]"
                    )}>
                        <div className={cn("absolute inset-0 rounded-full animate-ping opacity-50", current.signalColor)} />
                    </div>
                </div>

                {/* Technical Info Layout */}
                <div className="flex items-center gap-5">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className={cn("text-xs font-black italic tracking-tight uppercase leading-none", current.textColor)}>
                                {current.label}
                            </span>
                            <div className="h-2 w-[1px] bg-white/10" />
                            <span className="text-[9px] font-mono font-bold text-slate-500 leading-none tracking-widest opacity-80">
                                PROB:0.{realPercent < 10 ? `0${realPercent}` : realPercent}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 px-0.5">
                            <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden relative">
                                <motion.div
                                    className={cn("h-full relative z-10", current.signalColor)}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${realPercent}%` }}
                                    transition={{ duration: 1.5, ease: "circOut" }}
                                />
                                {/* Progress background glow */}
                                <div className={cn("absolute inset-0 opacity-20 blur-[2px]", current.signalColor)} />
                            </div>
                            <span className={cn("text-[10px] font-mono font-bold leading-none tracking-tighter", realPercent > 80 ? "text-emerald-400" : realPercent > 50 ? "text-amber-400" : "text-red-400")}>
                                {realPercent}%
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/5 group-hover/badge:bg-white/10 transition-colors">
                        <ChevronDown className={cn(
                            "w-3.5 h-3.5 text-slate-500 transition-transform duration-500 ease-in-out",
                            showDetails && "rotate-180"
                        )} />
                    </div>
                </div>
            </motion.div>

            {/* Futuristic Details HUD */}
            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-0 mt-2 z-[100] w-64 origin-top-left"
                    >
                        <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl relative overflow-hidden">
                            {/* Scanning line animation */}
                            <motion.div
                                className="absolute top-0 left-0 right-0 h-[1px] bg-sky-500/50 z-10"
                                animate={{ top: ["0%", "100%", "0%"] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            />

                            {/* HUD Header */}
                            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                                <div className="flex items-center gap-2">
                                    <Brain className="w-3.5 h-3.5 text-sky-400" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white">AI Vibe Audit</span>
                                </div>
                                <span className="text-[8px] font-mono text-slate-500">SYS_V5.0</span>
                            </div>

                            {/* Data Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Activity className="w-2.5 h-2.5 text-emerald-400" />
                                        <span className="text-[7px] font-bold text-slate-500 uppercase">Authenticity</span>
                                    </div>
                                    <div className="text-sm font-mono font-black text-emerald-400">{realPercent}%</div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Target className="w-2.5 h-2.5 text-red-400" />
                                        <span className="text-[7px] font-bold text-slate-500 uppercase">Manipulation</span>
                                    </div>
                                    <div className="text-sm font-mono font-black text-red-400">{fakePercent}%</div>
                                </div>
                            </div>

                            {/* Extended Metrics */}
                            <div className="space-y-2.5">
                                {analysisDetails?.framesAnalyzed && (
                                    <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-tighter">
                                        <span className="text-slate-500">Frames Processed</span>
                                        <span className="text-white font-bold">{analysisDetails.framesAnalyzed}</span>
                                    </div>
                                )}
                                {analysisDetails?.processingTime && (
                                    <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-tighter">
                                        <span className="text-slate-500">Analysis Time</span>
                                        <span className="text-white font-bold">{(analysisDetails.processingTime / 1000).toFixed(2)}s</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-tighter">
                                    <span className="text-slate-500">Methodology</span>
                                    <span className="text-sky-400 font-bold">ResNet-LSTM Hybrid</span>
                                </div>
                            </div>

                            {/* Final Verdict HUD */}
                            <div className={cn(
                                "mt-4 p-2 rounded-xl border text-center relative overflow-hidden",
                                realPercent > 80 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
                            )}>
                                <span className={cn(
                                    "text-[9px] font-black uppercase tracking-[0.1em]",
                                    realPercent > 80 ? "text-emerald-400" : "text-red-400"
                                )}>
                                    {realPercent > 80 ? "✓ VALIDATED AS REAL" : "⚠ MANIPULATION DETECTED"}
                                </span>
                            </div>

                            {/* Generate Report Button - Owner Only */}
                            {isOwner && onGenerateReport && level !== 'analyzing' && level !== 'pending' && (
                                <motion.button
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onGenerateReport();
                                    }}
                                    disabled={isGeneratingReport}
                                    className="mt-4 w-full relative group/btn overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-80 group-hover/btn:opacity-100 transition-opacity" />
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] group-hover/btn:animate-[shimmer_2s_infinite]" />

                                    <div className="relative flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/20">
                                        {isGeneratingReport ? (
                                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                                        ) : (
                                            <div className="relative">
                                                <FileText className="w-4 h-4 text-white" />
                                                <motion.div
                                                    className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full border border-violet-600"
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                />
                                            </div>
                                        )}
                                        <span className="text-[11px] font-black tracking-[0.1em] uppercase text-white">
                                            {isGeneratingReport ? "Decoding Neural Core..." : "Access Analysis Report"}
                                        </span>
                                        <Sparkles className="w-3.5 h-3.5 text-white/80 group-hover/btn:rotate-12 transition-transform" />
                                    </div>
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Add these to your tailwind.config.js for perfect HUD vibes if not present
// keyframes: { 'spin-slow': { from: { rotate: '0deg' }, to: { rotate: '360deg' } } }
// animation: { 'spin-slow': 'spin-slow 8s linear infinity' }
