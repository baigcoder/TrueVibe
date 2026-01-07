import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface OnlineIndicatorProps {
    isOnline?: boolean;
    lastSeen?: Date | string;
    showLastSeen?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * Online status indicator - green dot for online, gray with last seen for offline
 */
export function OnlineIndicator({
    isOnline = false,
    lastSeen,
    showLastSeen = false,
    size = 'md',
    className
}: OnlineIndicatorProps) {
    const sizeClasses = {
        sm: 'w-2 h-2',
        md: 'w-2.5 h-2.5',
        lg: 'w-3 h-3',
    };

    const formatLastSeen = () => {
        if (!lastSeen) return 'Offline';
        try {
            const date = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
            return `Last seen ${formatDistanceToNow(date, { addSuffix: true })}`;
        } catch {
            return 'Offline';
        }
    };

    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <div
                className={cn(
                    "rounded-full ring-2 ring-black/50",
                    sizeClasses[size],
                    isOnline
                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                        : "bg-slate-500"
                )}
            />
            {showLastSeen && !isOnline && lastSeen && (
                <span className="text-[10px] text-slate-500 font-medium">
                    {formatLastSeen()}
                </span>
            )}
            {showLastSeen && isOnline && (
                <span className="text-[10px] text-emerald-500 font-medium">
                    Online now
                </span>
            )}
        </div>
    );
}

export default OnlineIndicator;
