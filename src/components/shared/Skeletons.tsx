import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-lg bg-white/5",
                className
            )}
        />
    );
}

// ============ Post Skeleton ============
export function PostSkeleton() {
    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Image placeholder */}
            <Skeleton className="h-48 w-full rounded-xl" />

            {/* Actions */}
            <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
            </div>
        </div>
    );
}

// ============ Profile Skeleton ============
export function ProfileSkeleton() {
    return (
        <div className="space-y-6">
            {/* Banner */}
            <Skeleton className="h-48 w-full rounded-2xl" />

            {/* Avatar & Info */}
            <div className="px-4 -mt-16 relative z-10">
                <Skeleton className="w-24 h-24 rounded-full border-4 border-[#0a0a0f]" />
                <div className="mt-4 space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full max-w-md" />
                </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 px-4">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
            </div>
        </div>
    );
}

// ============ Chat Skeleton ============
export function ChatSkeleton() {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-10" />
        </div>
    );
}

// ============ Message Skeleton ============
export function MessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
    return (
        <div className={cn("flex gap-2 mb-4", isOwn && "flex-row-reverse")}>
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className={cn("space-y-2", isOwn ? "items-end" : "items-start")}>
                <Skeleton className={cn("h-10 rounded-2xl", isOwn ? "w-32" : "w-48")} />
            </div>
        </div>
    );
}

// ============ Notification Skeleton ============
export function NotificationSkeleton() {
    return (
        <div className="flex items-start gap-3 p-4 border-b border-white/5">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-20" />
            </div>
        </div>
    );
}

// ============ User Card Skeleton ============
export function UserCardSkeleton() {
    return (
        <div className="flex items-center gap-3 p-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
    );
}

// ============ Story Skeleton ============
export function StorySkeleton() {
    return (
        <div className="flex flex-col items-center gap-2">
            <Skeleton className="w-16 h-16 rounded-full" />
            <Skeleton className="h-3 w-14" />
        </div>
    );
}

// ============ Short Skeleton ============
export function ShortSkeleton() {
    return (
        <Skeleton className="h-[70vh] w-full max-w-sm rounded-2xl" />
    );
}

// ============ Feed Skeleton (Multiple Posts) ============
export function FeedSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <PostSkeleton key={i} />
            ))}
        </div>
    );
}

// ============ Server Sidebar Skeleton ============
export function ServerSidebarSkeleton() {
    return (
        <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-12 h-12 rounded-2xl" />
            ))}
        </div>
    );
}

// ============ Channel List Skeleton ============
export function ChannelListSkeleton() {
    return (
        <div className="space-y-1 p-2">
            <Skeleton className="h-6 w-24 mb-3" />
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
        </div>
    );
}

// ============ Analytics Card Skeleton ============
export function AnalyticsCardSkeleton() {
    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
        </div>
    );
}

// ============ Settings Section Skeleton ============
export function SettingsSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="w-12 h-6 rounded-full" />
                </div>
            ))}
        </div>
    );
}
