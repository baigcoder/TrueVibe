import { ShieldCheck, AlertTriangle, XOctagon, Clock, RefreshCw, ChevronDown, Scan, Brain, FileText, X, Mail, FileDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { m, AnimatePresence } from "framer-motion";
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
    onEmailReport?: () => void;
    isEmailing?: boolean;
    onDownloadReport?: () => void;
    isDownloading?: boolean;
}

export function TrustBadge({
    level,
    className,
    score,
    analysisDetails,
    isRefreshing = false,
    compact = false,
    onGenerateReport,
    isGeneratingReport = false,
    onEmailReport,
    isEmailing = false,
    onDownloadReport,
    isDownloading = false
}: TrustBadgeProps) {
    const [showDetails, setShowDetails] = useState(false);

    const config = {
        authentic: {
            icon: ShieldCheck,
            label: "Verified",
            color: "#10b981",
            textColor: "text-emerald-400",
            borderColor: "border-emerald-500/30",
            glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
            signalColor: "bg-emerald-500",
            path: "M10 20l-6-6 1.4-1.4L10 17.2 18.6 8.6l1.4 1.4z"
        },
        suspicious: {
            icon: AlertTriangle,
            label: "Caution",
            color: "#f59e0b",
            textColor: "text-amber-400",
            borderColor: "border-amber-500/30",
            glow: "shadow-[0_0_15px_rgba(245,158,11,0.15)]",
            signalColor: "bg-amber-500",
            path: "M12 5.99L19.53 19H4.47L12 5.99M12 2L1 21h22L12 2z m1 14h-2v2h2v-2z m0-6h-2v4h2v-4z"
        },
        fake: {
            icon: XOctagon,
            label: "Deepfake",
            color: "#ef4444",
            textColor: "text-red-400",
            borderColor: "border-red-500/30",
            glow: "shadow-[0_0_15px_rgba(239,68,68,0.15)]",
            signalColor: "bg-red-500",
            path: "M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27L15.73 3zM12 17.3c-.72 0-1.3-.58-1.3-1.3 0-.72.58-1.3 1.3-1.3.72 0 1.3.58 1.3 1.3 0 .72-.58 1.3-1.3 1.3zm1-4.3h-2V6.7h2V13z"
        },
        likely_fake: {
            icon: XOctagon,
            label: "High Risk",
            color: "#f97316",
            textColor: "text-orange-400",
            borderColor: "border-orange-500/30",
            glow: "shadow-[0_0_15px_rgba(249,115,22,0.15)]",
            signalColor: "bg-orange-500",
            path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
        },
        analyzing: {
            icon: Scan,
            label: "Scanning",
            color: "#3b82f6",
            textColor: "text-blue-400",
            borderColor: "border-blue-500/30",
            glow: "",
            signalColor: "bg-blue-500",
            path: "M1 1v6h2V3h4V1H1zm22 0h-6v2h4v4h2V1zM1 23h6v-2H3v-4H1v6zm22 0v-6h-2v4h-4v2h6z"
        },
        pending: {
            icon: Clock,
            label: "Pending",
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

    // Normalize fakeScore: API might return 0-1 OR 0-100
    // If fakeScore > 1, it's already a percentage; otherwise multiply by 100
    const rawFakeScore = analysisDetails?.fakeScore;
    const normalizedFakeScore = rawFakeScore !== undefined
        ? (rawFakeScore > 1 ? rawFakeScore : rawFakeScore * 100)
        : undefined;

    const fakePercent = normalizedFakeScore !== undefined
        ? Math.round(normalizedFakeScore)
        : (score !== undefined ? (100 - score) : (100 - getDefaultRealPercent(level)));
    const realPercent = 100 - fakePercent;

    // Derive the ACTUAL level from SCORE FIRST to ensure accuracy
    // This ensures 60%+ authentic shows as VERIFIED
    // Professional thresholds (using fakePercent 0-100):
    // - 40% or less fake (60%+ authentic) = VERIFIED (authentic)
    // - 40-55% fake (45-60% authentic) = REVIEW (needs review)
    // - 55-70% fake (30-45% authentic) = HIGH RISK (likely fake)
    // - 70%+ fake (under 30% authentic) = MANIPULATED (confirmed fake)
    let rawLevel: string;
    if (isPendingState) {
        rawLevel = level.toLowerCase();
    } else if (normalizedFakeScore !== undefined) {
        // Use already-normalized fakePercent (0-100 scale)
        if (fakePercent <= 40) rawLevel = 'authentic';          // 60%+ authentic = VERIFIED
        else if (fakePercent <= 55) rawLevel = 'suspicious';    // 45-60% authentic = REVIEW
        else if (fakePercent <= 70) rawLevel = 'likely_fake';   // 30-45% authentic = HIGH RISK
        else rawLevel = 'fake';                                  // <30% authentic = MANIPULATED
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
            <m.div
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
            </m.div>
        );
    }

    return (
        <div className="relative group/trust">
            <m.div
                onClick={() => setShowDetails(!showDetails)}
                initial={{ opacity: 0, scale: 0.9, x: -10 }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    x: 0,
                }}
                transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                    delay: 0.1
                }}
                className={cn(
                    "inline-flex items-center gap-2 sm:gap-4 p-1.5 sm:p-2 pr-3 sm:pr-5 rounded-xl sm:rounded-2xl border bg-slate-950/90 backdrop-blur-2xl transition-all duration-500 hover:bg-slate-900/90 hover:scale-[1.02] active:scale-95 cursor-pointer group/badge",
                    displayConfig.borderColor,
                    displayConfig.glow,
                    "shadow-xl hover:shadow-2xl",
                    className
                )}
            >
                {/* Icon Circle - Enhanced for desktop */}
                <div className="relative flex-shrink-0">
                    {/* Glow ring on desktop */}
                    <div className={cn(
                        "absolute inset-0 rounded-lg sm:rounded-xl opacity-0 sm:opacity-100 blur-md transition-opacity",
                        displayConfig.signalColor
                    )} style={{ opacity: 0.2 }} />
                    <div className={cn(
                        "relative w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center border border-white/10 bg-white/5 transition-all duration-500",
                        displayConfig.textColor
                    )}>
                        {(derivedLevel === 'analyzing' || isRefreshing) ? (
                            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                            <displayConfig.icon className="w-4.5 h-4.5 sm:w-6 sm:h-6" />
                        )}
                    </div>
                </div>

                {/* Info Layout - Enhanced for desktop */}
                <div className="flex items-center gap-3 sm:gap-5">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 sm:gap-2.5">
                            <span className={cn("text-[10px] sm:text-base font-black tracking-tight uppercase leading-none italic", displayConfig.textColor)}>
                                {displayConfig.label}
                            </span>
                            <div className="h-3 sm:h-4 w-px bg-white/10" />
                            <span className="text-[9px] sm:text-sm font-mono font-black text-white/70 leading-none">
                                {badgeDisplayPercent}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 sm:mt-2">
                            <div className="w-20 sm:w-32 h-1.5 sm:h-2 bg-white/5 rounded-full overflow-hidden">
                                <m.div
                                    className={cn("h-full rounded-full", displayConfig.signalColor)}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${badgeProgressValue}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    style={{ boxShadow: `0 0 8px ${displayConfig.color}` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/5 group-hover/badge:bg-white/10 transition-colors border border-white/5">
                        <ChevronDown className={cn(
                            "w-3 h-3 sm:w-4 sm:h-4 text-slate-400 transition-transform duration-300",
                            showDetails && "rotate-180"
                        )} />
                    </div>
                </div>
            </m.div>

            {/* Details Panel - CENTERED ON SCREEN */}
            <AnimatePresence>
                {showDetails && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-16 pb-24 sm:p-4 sm:py-8">
                        {/* Backdrop with Strong Blur */}
                        <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDetails(false)}
                            className="fixed inset-0 bg-black/90 backdrop-blur-2xl"
                        />

                        {/* Panel - Centered with better mobile handling */}
                        <m.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 30, stiffness: 600 }}
                            className="relative w-full max-w-[320px] sm:max-w-[420px] lg:max-w-[480px] max-h-[calc(100vh-160px)] sm:max-h-[75vh] bg-slate-950 border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Header - Fixed */}
                            <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3.5 border-b border-white/10 bg-slate-950 rounded-t-2xl flex-shrink-0">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                                        <Brain className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-400" />
                                    </div>
                                    <span className="text-[8px] sm:text-xs font-black uppercase tracking-[0.1em] text-white/90">AI Audit</span>
                                </div>
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/5 hover:bg-white/10 transition-all"
                                >
                                    <X className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
                                </button>
                            </div>

                            {/* Content - Scrollable */}
                            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5 space-y-3 sm:space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                <div className="flex flex-col items-center space-y-3 sm:space-y-4 pb-2">
                                    {/* Gauges Grid - Bigger on desktop */}
                                    <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full">
                                        {[
                                            { label: "AUTHENTIC", val: displayRealPercent, color: "#10b981", bg: "emerald", p: realPercent },
                                            { label: "RISK", val: displayFakePercent, color: "#ef4444", bg: "red", p: fakePercent }
                                        ].map((gauge, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "border rounded-xl sm:rounded-2xl p-2 sm:p-4 text-center flex flex-col items-center justify-center",
                                                    gauge.bg === "emerald" ? "bg-emerald-500/[0.03] border-emerald-500/20" : "bg-red-500/[0.03] border-red-500/20"
                                                )}
                                            >
                                                <div className={cn(
                                                    "text-[7px] sm:text-[10px] font-black uppercase mb-1.5 sm:mb-2 tracking-widest",
                                                    gauge.bg === "emerald" ? "text-emerald-400" : "text-red-400"
                                                )}>
                                                    {gauge.label}
                                                </div>
                                                <div className="relative w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16">
                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                        <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/[0.05]" />
                                                        <m.circle
                                                            cx="18" cy="18" r="16" fill="none" stroke={gauge.color} strokeWidth="4" strokeLinecap="round"
                                                            strokeDasharray={`${isPendingState ? 0 : gauge.p * 1.005} 100`}
                                                            initial={{ strokeDasharray: "0 100" }}
                                                            animate={{ strokeDasharray: `${isPendingState ? 0 : gauge.p * 1.005} 100` }}
                                                            transition={{ duration: 1.5, ease: "circOut" }}
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-[10px] sm:text-sm lg:text-base font-black text-white italic">
                                                            {gauge.val}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Metrics - Compact */}
                                    <div className="w-full space-y-1.5 sm:space-y-2.5 px-1">
                                        {(() => {
                                            // For confidence, show the dominant score (whichever is higher)
                                            // e.g., 65% authentic = 65% confidence in authentic result
                                            const realScore = analysisDetails?.realScore ?? (realPercent / 100);
                                            const fakeScore = analysisDetails?.fakeScore ?? (fakePercent / 100);
                                            const dominantScore = Math.max(realScore, fakeScore);
                                            const confidenceDisplay = analysisDetails?.realScore !== undefined || analysisDetails?.fakeScore !== undefined
                                                ? `${Math.round(dominantScore * 100)}%`
                                                : "N/A";

                                            return [
                                                { label: "Confidence", val: confidenceDisplay, color: "text-emerald-400" },
                                                { label: "Frames", val: analysisDetails?.framesAnalyzed?.toString() || "0", color: "text-sky-400" },
                                                { label: "Time", val: analysisDetails?.processingTime !== undefined ? `${(analysisDetails.processingTime / 1000).toFixed(1)}s` : "N/A", color: "text-slate-400" }
                                            ]
                                        })().map((m, i) => (
                                            <div key={i} className="flex justify-between items-center text-[8px] sm:text-[11px] uppercase font-black tracking-wide">
                                                <span className="text-slate-500">{m.label}</span>
                                                <span className={cn("font-mono", m.color)}>{m.val}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Status Verdict - Compact */}
                                    <div className={cn(
                                        "w-full py-2 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl text-center border font-black text-[9px] sm:text-xs tracking-[0.15em] italic bg-black/40",
                                        isPendingState ? "border-slate-500/20 text-slate-400" :
                                            derivedLevel === 'authentic' ? "border-emerald-500/20 text-emerald-400" :
                                                derivedLevel === 'suspicious' ? "border-amber-500/20 text-amber-400" :
                                                    derivedLevel === 'likely_fake' ? "border-orange-500/20 text-orange-400" :
                                                        "border-red-500/20 text-red-400"
                                    )}>
                                        {isPendingState ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                                ANALYZING...
                                            </span>
                                        ) : (
                                            derivedLevel === 'authentic' ? "✓ VERIFIED" :
                                                derivedLevel === 'suspicious' ? "⚠ CAUTION" :
                                                    derivedLevel === 'likely_fake' ? "⚠ HIGH RISK" :
                                                        "⛔ MANIPULATED"
                                        )}
                                    </div>

                                    {/* Action Buttons Row */}
                                    <div className="w-full flex gap-2 sm:gap-3">
                                        {/* Email Button */}
                                        {onEmailReport && (
                                            <m.button
                                                whileTap={{ scale: 0.98 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEmailReport();
                                                }}
                                                disabled={isEmailing || isPendingState}
                                                className="flex-1 py-2 px-3 bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                {isEmailing ? (
                                                    <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                                                ) : (
                                                    <Mail className="w-3 h-3 text-indigo-400" />
                                                )}
                                                <span className="text-[8px] font-black uppercase tracking-wide text-white">
                                                    Email
                                                </span>
                                            </m.button>
                                        )}
                                        {/* Download Button */}
                                        {onDownloadReport && (
                                            <m.button
                                                whileTap={{ scale: 0.98 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDownloadReport();
                                                }}
                                                disabled={isDownloading || isPendingState}
                                                className="flex-1 py-2 px-3 bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                {isDownloading ? (
                                                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                                                ) : (
                                                    <FileDown className="w-3 h-3 text-emerald-400" />
                                                )}
                                                <span className="text-[8px] font-black uppercase tracking-wide text-white">
                                                    Download
                                                </span>
                                            </m.button>
                                        )}
                                    </div>

                                    {/* View Report Button - Hidden when pending */}
                                    {onGenerateReport && !isPendingState && (
                                        <m.button
                                            whileTap={{ scale: 0.98 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onGenerateReport();
                                            }}
                                            disabled={isGeneratingReport}
                                            className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                                        >
                                            {isGeneratingReport ? (
                                                <RefreshCw className="w-3 h-3 animate-spin text-white" />
                                            ) : (
                                                <FileText className="w-3 h-3 text-white" />
                                            )}
                                            <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white">
                                                {isGeneratingReport ? "Loading..." : "View Report"}
                                            </span>
                                        </m.button>
                                    )}
                                </div>
                            </div>
                        </m.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}









// Add these to your tailwind.config.js for perfect HUD vibes if not present
// keyframes: { 'spin-slow': { from: { rotate: '0deg' }, to: { rotate: '360deg' } } }
// animation: { 'spin-slow': 'spin-slow 8s linear infinity' }
