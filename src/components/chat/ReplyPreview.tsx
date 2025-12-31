import { motion } from 'framer-motion';
import { X, Reply } from 'lucide-react';

interface ReplyPreviewProps {
    replyingTo: {
        _id: string;
        content: string;
        senderId: string;
        senderName?: string;
    };
    onCancel: () => void;
}

export function ReplyPreview({ replyingTo, onCancel }: ReplyPreviewProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-3 px-4 py-2 bg-neutral-800/80 border-t border-neutral-700/50"
        >
            {/* Reply indicator */}
            <div className="flex items-center gap-2 text-purple-400">
                <Reply className="w-4 h-4" />
            </div>

            {/* Reply content preview */}
            <div className="flex-1 min-w-0 border-l-2 border-purple-500 pl-3">
                <p className="text-sm font-medium text-purple-400">
                    {replyingTo.senderName || 'Someone'}
                </p>
                <p className="text-sm text-neutral-400 truncate max-w-[200px]">
                    {replyingTo.content || 'Media message'}
                </p>
            </div>

            {/* Cancel button */}
            <button
                onClick={onCancel}
                className="p-1.5 hover:bg-neutral-700 rounded-full transition-colors"
            >
                <X className="w-4 h-4 text-neutral-400" />
            </button>
        </motion.div>
    );
}

// Reply bubble shown in message
export function ReplyBubble({
    replyContent,
    replySenderName,
    onClick,
}: {
    replyContent: string;
    replySenderName?: string;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="flex items-start gap-2 p-2 mb-1 bg-neutral-700/30 rounded-lg border-l-2 border-purple-500/50 text-left hover:bg-neutral-700/50 transition-colors w-full"
        >
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-purple-400/80 truncate">
                    {replySenderName || 'Someone'}
                </p>
                <p className="text-xs text-neutral-400 truncate">
                    {replyContent || 'Media message'}
                </p>
            </div>
        </button>
    );
}
