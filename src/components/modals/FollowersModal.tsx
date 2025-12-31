import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Loader2, UserPlus, UserMinus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useFollowers, useFollowing, useFollow, useUnfollow } from '@/api/hooks';
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

interface FollowersModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    type: 'followers' | 'following';
    currentUserId?: string;
}

interface UserItem {
    user?: {
        userId: string;
        name: string;
        handle: string;
        avatar?: string;
        trustScore?: number;
    };
    followedAt?: string;
}

export function FollowersModal({ isOpen, onClose, userId, type, currentUserId }: FollowersModalProps) {
    const navigate = useNavigate();
    const followMutation = useFollow();
    const unfollowMutation = useUnfollow();
    const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());

    const { data: followersData, isLoading: loadingFollowers, fetchNextPage: fetchMoreFollowers, hasNextPage: hasMoreFollowers } = useFollowers(userId);
    const { data: followingData, isLoading: loadingFollowing, fetchNextPage: fetchMoreFollowing, hasNextPage: hasMoreFollowing } = useFollowing(userId);

    const isLoading = type === 'followers' ? loadingFollowers : loadingFollowing;
    const data = type === 'followers' ? followersData : followingData;
    const fetchNextPage = type === 'followers' ? fetchMoreFollowers : fetchMoreFollowing;
    const hasNextPage = type === 'followers' ? hasMoreFollowers : hasMoreFollowing;

    const users: UserItem[] = (data?.pages as Array<{ data?: { followers?: UserItem[]; following?: UserItem[] } }> || []).flatMap((page) =>
        type === 'followers' ? page?.data?.followers || [] : page?.data?.following || []
    );

    const total = (data?.pages as Array<{ data?: { total?: number } }> || [])[0]?.data?.total || 0;

    const handleFollowToggle = async (targetUserId: string) => {
        if (followingUsers.has(targetUserId)) {
            await unfollowMutation.mutateAsync(targetUserId);
            setFollowingUsers(prev => {
                const next = new Set(prev);
                next.delete(targetUserId);
                return next;
            });
        } else {
            await followMutation.mutateAsync(targetUserId);
            setFollowingUsers(prev => new Set(prev).add(targetUserId));
        }
    };

    const handleUserClick = (targetUserId: string) => {
        onClose();
        navigate({ to: `/app/profile/${targetUserId}` });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <m.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#0d1117] border border-white/10 rounded-3xl w-full max-w-md max-h-[70vh] overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-white/10">
                        <h2 className="text-lg font-bold text-white capitalize">
                            {type} <span className="text-slate-500 font-normal">({total})</span>
                        </h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="rounded-xl hover:bg-white/10"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto max-h-[calc(70vh-80px)] p-3">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-slate-500">
                                    {type === 'followers' ? 'No followers yet' : 'Not following anyone'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {users.map((item, index) => (
                                    <m.div
                                        key={item.user?.userId || index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors group"
                                    >
                                        <Avatar
                                            className="w-12 h-12 border-2 border-white/10 rounded-xl cursor-pointer group-hover:border-primary/50 transition-colors"
                                            onClick={() => item.user?.userId && handleUserClick(item.user.userId)}
                                        >
                                            <AvatarImage src={item.user?.avatar} className="object-cover" />
                                            <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                                {item.user?.name?.[0]?.toUpperCase() || '?'}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={() => item.user?.userId && handleUserClick(item.user.userId)}
                                        >
                                            <p className="font-semibold text-white truncate group-hover:text-primary transition-colors">
                                                {item.user?.name}
                                            </p>
                                            <p className="text-sm text-slate-500 truncate">
                                                @{item.user?.handle}
                                            </p>
                                        </div>

                                        {/* Follow/Unfollow button - only show for other users */}
                                        {item.user?.userId && item.user.userId !== currentUserId && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleFollowToggle(item.user!.userId)}
                                                disabled={followMutation.isPending || unfollowMutation.isPending}
                                                className={cn(
                                                    "rounded-xl h-9 px-4 text-xs font-semibold transition-all",
                                                    followingUsers.has(item.user.userId)
                                                        ? "bg-white/10 border-white/20 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
                                                        : "bg-primary border-primary text-white hover:bg-primary/80"
                                                )}
                                            >
                                                {followMutation.isPending || unfollowMutation.isPending ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : followingUsers.has(item.user.userId) ? (
                                                    <>
                                                        <UserMinus className="w-3.5 h-3.5 mr-1" />
                                                        Following
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                                                        Follow
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </m.div>
                                ))}

                                {/* Load More */}
                                {hasNextPage && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => fetchNextPage()}
                                        className="w-full mt-4 text-primary hover:text-primary/80"
                                    >
                                        Load More
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </m.div>
            </m.div>
        </AnimatePresence>
    );
}
