/**
 * UploadStatusIndicator - Shows background upload progress
 * 
 * Floating indicator that appears when uploads are in progress.
 * Shows count, progress, and allows viewing details.
 */

import { m, AnimatePresence } from 'framer-motion';
import { Upload, X, Check, AlertCircle, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useUploadQueue } from '@/context/UploadQueueContext';
import { cn } from '@/lib/utils';

export function UploadStatusIndicator() {
    const { tasks, retryUpload, cancelUpload, isUploading } = useUploadQueue();
    const [isExpanded, setIsExpanded] = useState(false);

    // Filter to show only active/recent tasks
    const activeTasks = tasks.filter(t =>
        t.status !== 'complete' || Date.now() - t.createdAt < 10000
    );

    if (activeTasks.length === 0) return null;

    const uploadingCount = tasks.filter(t => t.status === 'uploading').length;
    const failedCount = tasks.filter(t => t.status === 'failed').length;
    const queuedCount = tasks.filter(t => t.status === 'queued').length;

    // Calculate overall progress
    const totalProgress = activeTasks.length > 0
        ? activeTasks.reduce((sum, t) => sum + t.progress, 0) / activeTasks.length
        : 0;

    return (
        <AnimatePresence>
            <m.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[9999]"
            >
                {/* Collapsed view - just shows count and progress */}
                <m.div
                    layout
                    className={cn(
                        "bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden",
                        isExpanded ? "w-80" : "w-auto"
                    )}
                >
                    {/* Header - clickable to expand */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
                    >
                        {/* Upload icon with animation */}
                        <div className="relative">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                failedCount > 0
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-primary/20 text-primary"
                            )}>
                                {isUploading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : failedCount > 0 ? (
                                    <AlertCircle className="w-5 h-5" />
                                ) : (
                                    <Check className="w-5 h-5" />
                                )}
                            </div>
                            {/* Progress ring */}
                            {isUploading && (
                                <svg className="absolute inset-0 w-10 h-10 -rotate-90">
                                    <circle
                                        cx="20" cy="20" r="18"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="text-primary/30"
                                    />
                                    <circle
                                        cx="20" cy="20" r="18"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 18}`}
                                        strokeDashoffset={`${2 * Math.PI * 18 * (1 - totalProgress / 100)}`}
                                        className="text-primary transition-all duration-300"
                                    />
                                </svg>
                            )}
                        </div>

                        {/* Status text */}
                        <div className="flex-1 text-left">
                            <div className="text-sm font-bold text-white">
                                {failedCount > 0
                                    ? `${failedCount} upload${failedCount > 1 ? 's' : ''} failed`
                                    : isUploading
                                        ? `Uploading ${uploadingCount}${queuedCount > 0 ? `+${queuedCount}` : ''}...`
                                        : 'Uploads complete'
                                }
                            </div>
                            {isUploading && (
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                                    {Math.round(totalProgress)}% • Background upload
                                </div>
                            )}
                        </div>

                        {/* Expand/collapse indicator */}
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                        )}
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                        {isExpanded && (
                            <m.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-white/10 overflow-hidden"
                            >
                                <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
                                    {activeTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className="flex items-center gap-3 p-2 rounded-xl bg-white/5"
                                        >
                                            {/* Status icon */}
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                                task.status === 'complete' && "bg-emerald-500/20 text-emerald-400",
                                                task.status === 'uploading' && "bg-primary/20 text-primary",
                                                task.status === 'processing' && "bg-amber-500/20 text-amber-400",
                                                task.status === 'queued' && "bg-slate-500/20 text-slate-400",
                                                task.status === 'failed' && "bg-red-500/20 text-red-400",
                                            )}>
                                                {task.status === 'complete' && <Check className="w-4 h-4" />}
                                                {task.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
                                                {task.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
                                                {task.status === 'queued' && <Upload className="w-4 h-4" />}
                                                {task.status === 'failed' && <AlertCircle className="w-4 h-4" />}
                                            </div>

                                            {/* File info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium text-white truncate">
                                                    {task.file.name}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    {task.status === 'uploading' && `${task.progress}%`}
                                                    {task.status === 'processing' && 'Processing...'}
                                                    {task.status === 'queued' && 'Queued'}
                                                    {task.status === 'complete' && 'Done'}
                                                    {task.status === 'failed' && (task.error || 'Failed')}
                                                </div>

                                                {/* Progress bar for uploading */}
                                                {task.status === 'uploading' && (
                                                    <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary rounded-full transition-all duration-300"
                                                            style={{ width: `${task.progress}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            {task.status === 'failed' && (
                                                <button
                                                    onClick={() => retryUpload(task.id)}
                                                    className="px-2 py-1 text-[10px] font-bold uppercase bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                                                >
                                                    Retry
                                                </button>
                                            )}
                                            {(task.status === 'queued' || task.status === 'failed') && (
                                                <button
                                                    onClick={() => cancelUpload(task.id)}
                                                    className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </m.div>
                        )}
                    </AnimatePresence>
                </m.div>
            </m.div>
        </AnimatePresence>
    );
}

export default UploadStatusIndicator;
