import { useState } from 'react';
import { m } from 'framer-motion';
import { Shield, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrustScoreBreakdown } from './TrustScoreBreakdown';

interface UserTrustBadgeProps {
    score: number;
    showLabel?: boolean;
    compact?: boolean;
    interactive?: boolean;
    className?: string;
}

const getLevel = (score: number) => {
    if (score >= 80) return { level: 'excellent', color: 'emerald', icon: TrendingUp };
    if (score >= 60) return { level: 'good', color: 'green', icon: TrendingUp };
    if (score >= 40) return { level: 'average', color: 'amber', icon: Minus };
    if (score >= 20) return { level: 'low', color: 'orange', icon: TrendingDown };
    return { level: 'risky', color: 'red', icon: TrendingDown };
};

export function UserTrustBadge({
    score,
    showLabel = true,
    compact = false,
    interactive = true,
    className
}: UserTrustBadgeProps) {
    const [showBreakdown, setShowBreakdown] = useState(false);
    const { level, color } = getLevel(score);

    if (compact) {
        return (
            <>
                <m.button
                    whileHover={interactive ? { scale: 1.05 } : undefined}
                    whileTap={interactive ? { scale: 0.95 } : undefined}
                    onClick={() => interactive && setShowBreakdown(true)}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold transition-all",
                        color === 'emerald' && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                        color === 'green' && "bg-green-500/20 text-green-400 border border-green-500/30",
                        color === 'amber' && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
                        color === 'orange' && "bg-orange-500/20 text-orange-400 border border-orange-500/30",
                        color === 'red' && "bg-red-500/20 text-red-400 border border-red-500/30",
                        interactive && "cursor-pointer hover:opacity-80",
                        className
                    )}
                >
                    <Shield className="w-3 h-3" />
                    <span>{score}</span>
                </m.button>
                {interactive && (
                    <TrustScoreBreakdown isOpen={showBreakdown} onClose={() => setShowBreakdown(false)} />
                )}
            </>
        );
    }

    return (
        <>
            <m.button
                whileHover={interactive ? { scale: 1.02 } : undefined}
                whileTap={interactive ? { scale: 0.98 } : undefined}
                onClick={() => interactive && setShowBreakdown(true)}
                className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border bg-slate-900/50 transition-all",
                    color === 'emerald' && "border-emerald-500/30",
                    color === 'green' && "border-green-500/30",
                    color === 'amber' && "border-amber-500/30",
                    color === 'orange' && "border-orange-500/30",
                    color === 'red' && "border-red-500/30",
                    interactive && "cursor-pointer hover:bg-slate-900/80",
                    className
                )}
            >
                <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    color === 'emerald' && "bg-emerald-500/20",
                    color === 'green' && "bg-green-500/20",
                    color === 'amber' && "bg-amber-500/20",
                    color === 'orange' && "bg-orange-500/20",
                    color === 'red' && "bg-red-500/20",
                )}>
                    <Shield className={cn(
                        "w-5 h-5",
                        color === 'emerald' && "text-emerald-400",
                        color === 'green' && "text-green-400",
                        color === 'amber' && "text-amber-400",
                        color === 'orange' && "text-orange-400",
                        color === 'red' && "text-red-400",
                    )} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-lg">{score}</span>
                        <span className="text-slate-500 text-xs">/100</span>
                    </div>
                    {showLabel && (
                        <p className={cn(
                            "text-xs font-medium capitalize",
                            color === 'emerald' && "text-emerald-400",
                            color === 'green' && "text-green-400",
                            color === 'amber' && "text-amber-400",
                            color === 'orange' && "text-orange-400",
                            color === 'red' && "text-red-400",
                        )}>
                            {level} Trust
                        </p>
                    )}
                </div>
                {interactive && (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
            </m.button>
            {interactive && (
                <TrustScoreBreakdown isOpen={showBreakdown} onClose={() => setShowBreakdown(false)} />
            )}
        </>
    );
}
