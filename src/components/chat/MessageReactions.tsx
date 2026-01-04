import { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { SmilePlus } from 'lucide-react';

interface Reaction {
    emoji: string;
    users: string[];
}

interface MessageReactionsProps {
    reactions: Reaction[];
    messageId: string;
    currentUserId: string;
    onReact: (messageId: string, emoji: string) => void;
    onRemoveReaction: (messageId: string, emoji: string) => void;
}

const QUICK_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '💯', '🎉'];

export function MessageReactions({
    reactions,
    messageId,
    currentUserId,
    onReact,
    onRemoveReaction,
}: MessageReactionsProps) {
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Close picker on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
        };

        if (showPicker) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showPicker]);

    const handleEmojiClick = (emoji: string) => {
        onReact(messageId, emoji);
        setShowPicker(false);
    };

    const handleReactionClick = (reaction: Reaction) => {
        const hasReacted = reaction.users.includes(currentUserId);
        if (hasReacted) {
            onRemoveReaction(messageId, reaction.emoji);
        } else {
            onReact(messageId, reaction.emoji);
        }
    };

    // Merge reactions with same emoji
    const mergedReactions = reactions.reduce((acc, reaction) => {
        const existing = acc.find(r => r.emoji === reaction.emoji);
        if (existing) {
            existing.users = [...new Set([...existing.users, ...reaction.users])];
        } else {
            acc.push({ ...reaction });
        }
        return acc;
    }, [] as Reaction[]);

    return (
        <div className="flex flex-wrap items-center gap-1 mt-1">
            {/* Existing reactions */}
            {mergedReactions.map((reaction) => {
                const hasReacted = reaction.users.includes(currentUserId);
                return (
                    <m.button
                        key={reaction.emoji}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleReactionClick(reaction)}
                        className={`
                            flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                            transition-colors border
                            ${hasReacted
                                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                                : 'bg-neutral-800/50 border-neutral-700/50 text-neutral-300 hover:bg-neutral-700/50'
                            }
                        `}
                    >
                        <span className="text-sm">{reaction.emoji}</span>
                        <span className="font-medium">{reaction.users.length}</span>
                    </m.button>
                );
            })}

            {/* Add reaction button */}
            <div className="relative" ref={pickerRef}>
                <m.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPicker(!showPicker)}
                    className="p-1.5 rounded-full text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 transition-colors"
                >
                    <SmilePlus className="w-4 h-4" />
                </m.button>

                {/* Emoji picker */}
                <AnimatePresence>
                    {showPicker && (
                        <m.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            transition={{ type: 'spring', duration: 0.2 }}
                            className="absolute bottom-full left-0 mb-2 p-2 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl z-50"
                        >
                            <div className="flex items-center gap-1">
                                {QUICK_EMOJIS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        onClick={() => handleEmojiClick(emoji)}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800 rounded-lg transition-colors text-lg"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </m.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// Inline reaction display for message bubbles
export function ReactionDisplay({
    reactions,
    currentUserId,
}: {
    reactions: Reaction[];
    currentUserId: string;
}) {
    if (!reactions || reactions.length === 0) return null;

    // Group reactions by emoji
    const grouped = reactions.reduce((acc, reaction) => {
        const existing = acc.find(r => r.emoji === reaction.emoji);
        if (existing) {
            existing.count += reaction.users.length;
            existing.hasReacted = existing.hasReacted || reaction.users.includes(currentUserId);
        } else {
            acc.push({
                emoji: reaction.emoji,
                count: reaction.users.length,
                hasReacted: reaction.users.includes(currentUserId),
            });
        }
        return acc;
    }, [] as { emoji: string; count: number; hasReacted: boolean }[]);

    if (grouped.length === 0) return null;

    return (
        <div className="flex items-center gap-1 mt-1">
            {grouped.slice(0, 5).map((reaction) => (
                <div
                    key={reaction.emoji}
                    className={`
                        flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs
                        ${reaction.hasReacted
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-neutral-800/50 text-neutral-400'
                        }
                    `}
                >
                    <span>{reaction.emoji}</span>
                    {reaction.count > 1 && (
                        <span className="font-medium text-[10px]">{reaction.count}</span>
                    )}
                </div>
            ))}
            {grouped.length > 5 && (
                <span className="text-xs text-neutral-500">+{grouped.length - 5}</span>
            )}
        </div>
    );
}
