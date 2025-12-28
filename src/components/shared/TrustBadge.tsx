import { ShieldCheck, AlertTriangle, XOctagon, Clock, RefreshCw, ChevronDown, Scan, Brain, Activity, Target, FileText, X } from "lucide-react";
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
    faceDetection?: { detected: boolean; confidence: number };
    audioAnalysis?: { detected: boolean; confidence: number };
    temporalConsistency?: number;
    compressionArtifacts?: number;
    // Enhanced v5 analysis fields
    facesDetected?: number;
    avgFaceScore?: number;
    avgFftScore?: number;
    avgEyeScore?: number;
    fftBoost?: number;
    eyeBoost?: number;
    temporalBoost?: number;
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
    onGenerateReport?: () => void;
    isGeneratingReport?: boolean;
}

export function TrustBadge({
    level,
    className,
    score,
    analysisDetails,
    isRefreshing = false,
    compact = false,
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

    // Calculate display score from analysis details if available
    // If no data available, derive from the trust level as a fallback
    const getDefaultRealPercent = (lvl: string): number => {
        switch (lvl.toLowerCase()) {
            case 'authentic': return 95;
            case 'suspicious': return 60;
            case 'likely_fake': return 30;
            case 'fake': return 15;
            case 'pending':
            case 'analyzing':
            default: return 50;
        }
    };

    // Check if we're in a pending/analyzing state with no real data
    const isPendingState = ['pending', 'analyzing'].includes(level.toLowerCase()) && !analysisDetails;

    const fakePercent = analysisDetails?.fakeScore !== undefined
        ? Math.round(analysisDetails.fakeScore * 100)
        : (score !== undefined ? (100 - score) : (100 - getDefaultRealPercent(level)));
    const realPercent = 100 - fakePercent;

    // Derive the ACTUAL level from SCORE FIRST to ensure accuracy
    // This ensures 66% authentic shows as VERIFIED, not SUSPICIOUS
    // More lenient thresholds based on real-world testing:
    // - Under 35% fake = VERIFIED (authentic)
    // - 35-50% fake = SUSPICIOUS (needs review)
    // - 50-65% fake = LIKELY FAKE (high risk)
    // - 65%+ fake = DEEPFAKE (confirmed)
    let rawLevel: string;
    if (isPendingState) {
        rawLevel = level.toLowerCase();
    } else if (analysisDetails?.fakeScore !== undefined) {
        // fakeScore is 0-1 (0.34 = 34% fake, 66% authentic)
        const fakePct = analysisDetails.fakeScore;
        if (fakePct < 0.35) rawLevel = 'authentic';          // 65%+ authentic = VERIFIED
        else if (fakePct < 0.50) rawLevel = 'suspicious';    // 50-65% authentic = SUSPICIOUS
        else if (fakePct < 0.65) rawLevel = 'likely_fake';   // 35-50% authentic = LIKELY FAKE
        else rawLevel = 'fake';                               // <35% authentic = DEEPFAKE
    } else if (analysisDetails?.classification) {
        rawLevel = analysisDetails.classification.toLowerCase();
    } else {
        rawLevel = typeof level === 'string' ? level.toLowerCase() : level;
    }


    const derivedLevel = rawLevel as TrustLevel;

    const displayConfig = config[derivedLevel as keyof typeof config] || current;

    // For pending/analyzing, show "--" instead of misleading percentages
    const displayRealPercent = isPendingState ? '--' : `${realPercent}%`;
    const displayFakePercent = isPendingState ? '--' : `${fakePercent}%`;

    // For risky levels, show the risk/fake percentage; for safe levels, show authenticity
    const isRiskyLevel = ['fake', 'likely_fake', 'suspicious'].includes(derivedLevel);
    const badgeDisplayPercent = isPendingState ? '--' : (isRiskyLevel ? `${fakePercent}%` : `${realPercent}%`);
    const badgeProgressValue = isRiskyLevel ? fakePercent : realPercent;

    if (compact) {
        return (
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-black/60 backdrop-blur-xl shadow-lg",
                    displayConfig.borderColor,
                    className
                )}
            >
                <div className={cn("w-2 h-2 rounded-full", displayConfig.signalColor)} />
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", displayConfig.textColor)}>
                    {displayConfig.label}
                </span>
                <div className="w-px h-3 bg-white/10" />
                <span className="text-[10px] font-mono font-bold text-white/80">
                    {badgeDisplayPercent}
                </span>
            </motion.div>
        );
    }

    return (
        <div className="relative group/trust">
            <motion.div
                onClick={() => setShowDetails(!showDetails)}
                className={cn(
                    "inline-flex items-center gap-2 sm:gap-3 p-1 sm:p-1.5 pr-2.5 sm:pr-4 rounded-xl sm:rounded-2xl border bg-slate-950/80 backdrop-blur-2xl transition-all duration-500 hover:bg-slate-900/80 hover:scale-[1.02] active:scale-95 cursor-pointer group/badge",
                    displayConfig.borderColor,
                    "shadow-xl",
                    className
                )}
            >
                {/* Icon Circle */}
                <div className="relative flex-shrink-0">
                    <div className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center border border-white/10 bg-white/5 transition-all duration-500",
                        displayConfig.textColor
                    )}>
                        {(derivedLevel === 'analyzing' || isRefreshing) ? (
                            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                            <displayConfig.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                    </div>
                    {/* Status Dot */}
                    <div className={cn(
                        "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950",
                        displayConfig.signalColor,
                        (derivedLevel === 'fake' || derivedLevel === 'likely_fake') && "animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]",
                        (derivedLevel === 'pending' || derivedLevel === 'analyzing') && "animate-ping opacity-75 shadow-[0_0_8px_rgba(59,130,246,0.5)] bg-blue-500"
                    )} />
                </div>

                {/* HUD Data Tags on the Badge itself */}
                {!compact && (derivedLevel === 'pending' || derivedLevel === 'analyzing') && (
                    <div className="hidden sm:flex absolute -top-2 left-12 gap-1.5 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-blue-500/20 text-blue-400 text-[7px] font-black px-1.5 py-0.5 rounded-sm border border-blue-500/30 backdrop-blur-md uppercase tracking-widest whitespace-nowrap"
                        >
                            [ Processing ]
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="bg-slate-500/10 text-slate-400 text-[7px] font-black px-1.5 py-0.5 rounded-sm border border-slate-500/20 backdrop-blur-md uppercase tracking-widest whitespace-nowrap"
                        >
                            {Math.floor(Math.random() * 20 + 80)}% LOAD
                        </motion.div>
                    </div>
                )}

                {!compact && (derivedLevel === 'suspicious' || derivedLevel === 'fake' || derivedLevel === 'likely_fake') && (
                    <div className="hidden sm:flex absolute -top-2 left-12 gap-1.5 pointer-events-none">
                        {analysisDetails?.faceDetection?.detected && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/20 text-red-400 text-[7px] font-black px-1.5 py-0.5 rounded-sm border border-red-500/30 backdrop-blur-md uppercase tracking-widest whitespace-nowrap"
                            >
                                [ Face Detected ]
                            </motion.div>
                        )}
                        {analysisDetails?.audioAnalysis?.detected && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-orange-500/20 text-orange-400 text-[7px] font-black px-1.5 py-0.5 rounded-sm border border-orange-500/30 backdrop-blur-md uppercase tracking-widest whitespace-nowrap"
                            >
                                [ Synth Audio ]
                            </motion.div>
                        )}
                        {(analysisDetails?.temporalConsistency !== undefined && analysisDetails.temporalConsistency < 0.3) && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-amber-500/20 text-amber-400 text-[7px] font-black px-1.5 py-0.5 rounded-sm border border-amber-500/30 backdrop-blur-md uppercase tracking-widest whitespace-nowrap"
                            >
                                [ Temporal Error ]
                            </motion.div>
                        )}
                    </div>
                )}

                {/* Info Layout */}
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className={cn("text-[10px] sm:text-sm font-bold tracking-tight uppercase leading-none", displayConfig.textColor)}>
                                {displayConfig.label}
                            </span>
                            <div className="h-2.5 sm:h-3 w-px bg-white/10" />
                            <span className="text-[9px] sm:text-xs font-mono font-medium text-white/60 leading-none">
                                {badgeDisplayPercent}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                            <div className="w-16 sm:w-24 h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className={cn("h-full rounded-full", displayConfig.signalColor)}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${badgeProgressValue}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-white/5 group-hover/badge:bg-white/10 transition-colors">
                        <ChevronDown className={cn(
                            "w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 transition-transform duration-300",
                            showDetails && "rotate-180"
                        )} />
                    </div>
                </div>
            </motion.div>

            {/* Details Panel - ULTIMATE COMPACT VERSION */}
            <AnimatePresence>
                {showDetails && (
                    <>
                        {/* Mobile Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDetails(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] sm:hidden"
                        />

                        {/* Panel Container */}
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={{
                                hidden: { opacity: 0, y: 15, scale: 0.95, filter: "blur(8px)" },
                                visible: {
                                    opacity: 1, y: 0, scale: 1, filter: "blur(0px)",
                                    transition: {
                                        type: "spring", damping: 30, stiffness: 400,
                                        staggerChildren: 0.04, delayChildren: 0.05
                                    }
                                }
                            }}
                            className="fixed sm:absolute left-2 right-2 bottom-24 sm:top-full sm:bottom-auto sm:inset-x-auto sm:left-0 sm:mt-1 z-[9999] sm:w-[220px] origin-bottom sm:origin-top-left sm:px-0 pb-safe sm:pb-0 sm:max-h-none flex flex-col"
                        >
                            {/* Main Panel */}
                            <motion.div
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: { opacity: 1 }
                                }}
                                className="bg-[#030712]/95 border border-white/10 rounded-2xl sm:rounded-xl shadow-[0_0_50px_-12px_rgba(0,0,0,1)] overflow-hidden flex flex-col"
                            >

                                {/* Header - Slimmer */}
                                <motion.div
                                    variants={{
                                        hidden: { opacity: 0, y: -5 },
                                        visible: { opacity: 1, y: 0 }
                                    }}
                                    className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/5 bg-white/[0.03]"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <motion.div
                                            animate={{ rotate: [0, 10, -10, 0] }}
                                            transition={{ duration: 4, repeat: Infinity }}
                                        >
                                            <Brain className="w-3 h-3 text-sky-400" />
                                        </motion.div>
                                        <span className="text-[8px] font-black uppercase tracking-wider text-white/80">AI Audit System</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[7px] font-mono text-slate-500 bg-white/5 px-1 rounded">V8.2</span>
                                        <button
                                            onClick={() => setShowDetails(false)}
                                            className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/15 transition-colors group"
                                        >
                                            <X className="w-2.5 h-2.5 text-white/40 group-hover:text-white" />
                                        </button>
                                    </div>
                                </motion.div>

                                {/* Content - COMPACT HUD VERSION */}
                                <div className="p-2 space-y-2">

                                    {/* Gauges - Smaller & Tighter */}
                                    <motion.div
                                        variants={{
                                            hidden: { opacity: 0, scale: 0.9 },
                                            visible: { opacity: 1, scale: 1 }
                                        }}
                                        className="grid grid-cols-2 gap-1.5"
                                    >
                                        {[
                                            { label: "AUTHENTIC", icon: Activity, val: displayRealPercent, color: "#10b981", bg: "emerald", p: realPercent },
                                            { label: "RISK", icon: Target, val: displayFakePercent, color: "#ef4444", bg: "red", p: fakePercent }
                                        ].map((gauge, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "border rounded-lg p-1.5 text-center relative overflow-hidden transition-colors",
                                                    gauge.bg === "emerald" ? "bg-emerald-500/[0.07] border-emerald-500/20" : "bg-red-500/[0.07] border-red-500/20"
                                                )}
                                            >
                                                <div className={cn(
                                                    "text-[7px] font-black uppercase mb-1 flex items-center justify-center gap-1 tracking-tight",
                                                    gauge.bg === "emerald" ? "text-emerald-400/80" : "text-red-400/80"
                                                )}>
                                                    <gauge.icon className="w-2 h-2" /> {gauge.label}
                                                </div>
                                                <div className="relative w-8 h-8 mx-auto">
                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                        <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="4.5" className="text-white/[0.05]" />
                                                        <motion.circle
                                                            cx="18" cy="18" r="15" fill="none" stroke={gauge.color} strokeWidth="5" strokeLinecap="round"
                                                            strokeDasharray={`${isPendingState ? 0 : gauge.p * 0.94} 94`}
                                                            initial={{ strokeDasharray: "0 94" }}
                                                            animate={{ strokeDasharray: `${isPendingState ? 0 : gauge.p * 0.94} 94` }}
                                                            transition={{ duration: 1.5, ease: "circOut", delay: 0.3 }}
                                                        />
                                                    </svg>
                                                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white tabular-nums">
                                                        {gauge.val}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>

                                    {/* Metrics - GRID BASED FOR MOBILE NO-SCROLL */}
                                    <motion.div
                                        variants={{
                                            hidden: { opacity: 0 },
                                            visible: {
                                                opacity: 1,
                                                transition: { staggerChildren: 0.03 }
                                            }
                                        }}
                                        className="grid grid-cols-2 gap-x-3 gap-y-1.5 px-0.5"
                                    >
                                        {[
                                            analysisDetails?.facesDetected !== undefined && analysisDetails.facesDetected > 0
                                                ? { label: "Faces Analyzed", val: analysisDetails.facesDetected.toString(), color: "text-purple-400", hint: "Number of faces scanned" }
                                                : null,
                                            analysisDetails?.avgFaceScore !== undefined && analysisDetails.avgFaceScore > 0
                                                ? { label: "Face Manip.", val: `${Math.round(analysisDetails.avgFaceScore * 100)}%`, color: analysisDetails.avgFaceScore > 0.5 ? "text-rose-400" : "text-emerald-400", hint: "Face manipulation risk" }
                                                : null,
                                            analysisDetails?.avgFftScore !== undefined && analysisDetails.avgFftScore > 0.01
                                                ? { label: "Frequency", val: `${Math.round(analysisDetails.avgFftScore * 100)}%`, color: analysisDetails.avgFftScore > 0.5 ? "text-rose-400" : "text-emerald-400", hint: "FFT artifact detection" }
                                                : null,
                                            analysisDetails?.avgEyeScore !== undefined && analysisDetails.avgEyeScore > 0.01
                                                ? { label: "Eye Analysis", val: `${Math.round(analysisDetails.avgEyeScore * 100)}%`, color: analysisDetails.avgEyeScore > 0.5 ? "text-rose-400" : "text-emerald-400", hint: "Eye region anomalies" }
                                                : null,
                                            analysisDetails?.temporalBoost !== undefined && analysisDetails.temporalBoost !== 0
                                                ? { label: "Temporal", val: `${analysisDetails.temporalBoost > 0 ? '+' : ''}${Math.round(analysisDetails.temporalBoost * 100)}%`, color: "text-amber-400", hint: "Frame consistency" }
                                                : null,
                                            analysisDetails?.framesAnalyzed !== undefined && analysisDetails.framesAnalyzed > 0
                                                ? { label: "Frames", val: analysisDetails.framesAnalyzed.toString(), color: "text-sky-400", hint: "Video frames analyzed" }
                                                : null,
                                            analysisDetails?.processingTime !== undefined && analysisDetails.processingTime > 0
                                                ? { label: "Time", val: `${(analysisDetails.processingTime / 1000).toFixed(1)}s`, color: "text-white/70", hint: "Processing duration" }
                                                : null
                                        ].filter((m): m is { label: string; val: string; color: string; hint: string } => m !== null).map((metric, i) => (
                                            <motion.div
                                                key={i}
                                                variants={{
                                                    hidden: { opacity: 0, x: -5 },
                                                    visible: { opacity: 1, x: 0 }
                                                }}
                                                className="flex justify-between items-center text-[8px] py-0.5 border-b border-white/[0.03]"
                                                title={metric.hint}
                                            >
                                                <span className="text-slate-500 font-bold uppercase tracking-tighter truncate mr-1">{metric.label}</span>
                                                <span className={cn("font-black tabular-nums text-[9px]", metric.color)}>
                                                    {metric.val}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </motion.div>

                                    {/* Verdict - Based on Actual Trust Level */}
                                    <motion.div
                                        variants={{
                                            hidden: { opacity: 0, y: 5 },
                                            visible: { opacity: 1, y: 0 }
                                        }}
                                        className={cn(
                                            "py-1 px-2 rounded-lg text-center border relative overflow-hidden",
                                            derivedLevel === 'authentic' ? "bg-emerald-500/10 border-emerald-500/20" :
                                                derivedLevel === 'suspicious' ? "bg-amber-500/10 border-amber-500/20" :
                                                    "bg-red-500/10 border-red-500/20"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-[8px] font-black uppercase tracking-widest relative z-10",
                                            derivedLevel === 'authentic' ? "text-emerald-400" :
                                                derivedLevel === 'suspicious' ? "text-amber-400" :
                                                    "text-red-400"
                                        )}>
                                            {derivedLevel === 'authentic' ? "✓ VALIDATED AS REAL" :
                                                derivedLevel === 'suspicious' ? "⚠ NEEDS REVIEW" :
                                                    "⚠ MANIPULATED"}
                                        </span>
                                    </motion.div>
                                </div>

                                {/* Button - Ultra Slim */}
                                {onGenerateReport && (
                                    <motion.div
                                        variants={{
                                            hidden: { opacity: 0, y: 10 },
                                            visible: { opacity: 1, y: 0 }
                                        }}
                                        className="p-2 border-t border-white/5 bg-slate-900/95"
                                    >
                                        <motion.button
                                            whileHover={{ scale: 1.02, backgroundColor: "rgba(99, 102, 241, 0.2)" }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onGenerateReport();
                                            }}
                                            disabled={isGeneratingReport || isPendingState}
                                            className="w-full py-1.5 px-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-500/20"
                                        >
                                            {isGeneratingReport ? (
                                                <RefreshCw className="w-3 h-3 animate-spin text-white" />
                                            ) : (
                                                <FileText className="w-3 h-3 text-white" />
                                            )}
                                            <span className="text-[9px] font-black uppercase tracking-wider text-white">
                                                {isGeneratingReport ? "Working..." : "View Report"}
                                            </span>
                                        </motion.button>
                                    </motion.div>
                                )}
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}







// Add these to your tailwind.config.js for perfect HUD vibes if not present
// keyframes: { 'spin-slow': { from: { rotate: '0deg' }, to: { rotate: '360deg' } } }
// animation: { 'spin-slow': 'spin-slow 8s linear infinity' }
