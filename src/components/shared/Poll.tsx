import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Clock, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PollOption {
    text: string;
}

interface PollData {
    options: PollOption[];
    expiresIn: number; // hours
    allowMultiple: boolean;
}

interface PollCreatorProps {
    onPollChange: (poll: PollData | null) => void;
    poll: PollData | null;
}

const DURATION_OPTIONS = [
    { label: '1 hour', value: 1 },
    { label: '6 hours', value: 6 },
    { label: '24 hours', value: 24 },
    { label: '3 days', value: 72 },
    { label: '7 days', value: 168 },
];

export function PollCreator({ onPollChange, poll }: PollCreatorProps) {
    const [options, setOptions] = useState<string[]>(poll?.options.map(o => o.text) || ['', '']);
    const [expiresIn, setExpiresIn] = useState(poll?.expiresIn || 24);
    const [allowMultiple, setAllowMultiple] = useState(poll?.allowMultiple || false);
    const [showDuration, setShowDuration] = useState(false);

    const updatePoll = (newOptions: string[], duration = expiresIn, multiple = allowMultiple) => {
        const validOptions = newOptions.filter(o => o.trim());
        if (validOptions.length >= 2) {
            onPollChange({
                options: validOptions.map(text => ({ text })),
                expiresIn: duration,
                allowMultiple: multiple,
            });
        } else {
            onPollChange(null);
        }
    };

    const addOption = () => {
        if (options.length < 4) {
            const newOptions = [...options, ''];
            setOptions(newOptions);
        }
    };

    const removeOption = (index: number) => {
        if (options.length > 2) {
            const newOptions = options.filter((_, i) => i !== index);
            setOptions(newOptions);
            updatePoll(newOptions);
        }
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
        updatePoll(newOptions);
    };

    const handleDurationChange = (value: number) => {
        setExpiresIn(value);
        setShowDuration(false);
        updatePoll(options, value);
    };

    const toggleMultiple = () => {
        const newValue = !allowMultiple;
        setAllowMultiple(newValue);
        updatePoll(options, expiresIn, newValue);
    };

    const removePoll = () => {
        onPollChange(null);
    };

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-primary/30 rounded-2xl p-4 bg-primary/5 space-y-3"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-sm font-semibold">Create Poll</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-rose-400"
                    onClick={removePoll}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Options */}
            <div className="space-y-2">
                {options.map((option, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                    >
                        <div className="w-6 h-6 rounded-full border-2 border-primary/30 flex items-center justify-center text-xs text-primary font-bold">
                            {index + 1}
                        </div>
                        <Input
                            placeholder={`Option ${index + 1}`}
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            maxLength={100}
                            className="flex-1 h-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl"
                        />
                        {options.length > 2 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-rose-400"
                                onClick={() => removeOption(index)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Add Option */}
            {options.length < 4 && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10 rounded-xl"
                    onClick={addOption}
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Add option
                </Button>
            )}

            {/* Settings */}
            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                {/* Duration */}
                <div className="relative">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-xs"
                        onClick={() => setShowDuration(!showDuration)}
                    >
                        <Clock className="w-3.5 h-3.5 mr-1.5" />
                        {DURATION_OPTIONS.find(d => d.value === expiresIn)?.label}
                    </Button>
                    
                    <AnimatePresence>
                        {showDuration && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute bottom-full left-0 mb-2 bg-slate-900 border border-white/10 rounded-xl p-1 shadow-xl z-20"
                            >
                                {DURATION_OPTIONS.map((d) => (
                                    <button
                                        key={d.value}
                                        onClick={() => handleDurationChange(d.value)}
                                        className={cn(
                                            "w-full px-3 py-1.5 text-xs text-left rounded-lg transition-colors",
                                            expiresIn === d.value
                                                ? "bg-primary/20 text-primary"
                                                : "text-slate-300 hover:bg-white/5"
                                        )}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Multiple Choice Toggle */}
                <button
                    onClick={toggleMultiple}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-colors",
                        allowMultiple
                            ? "bg-primary/20 text-primary"
                            : "bg-white/5 text-slate-400 hover:text-white"
                    )}
                >
                    <div className={cn(
                        "w-3 h-3 rounded border transition-colors",
                        allowMultiple ? "bg-primary border-primary" : "border-slate-500"
                    )} />
                    Multiple choice
                </button>
            </div>
        </motion.div>
    );
}

// Poll Display Component for viewing polls in posts
interface PollDisplayProps {
    poll: {
        options: Array<{
            _id: string;
            text: string;
            votesCount: number;
        }>;
        totalVotes: number;
        expiresAt?: string;
        allowMultiple: boolean;
    };
    postId: string;
    hasVoted?: boolean;
    userVotes?: string[];
    onVote: (optionIndex: number) => void;
    isVoting?: boolean;
}

export function PollDisplay({ poll, hasVoted, userVotes = [], onVote, isVoting }: PollDisplayProps) {
    const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
    const showResults = hasVoted || isExpired;

    return (
        <div className="border border-white/10 rounded-2xl p-4 space-y-3 bg-white/[0.02]">
            {/* Options */}
            <div className="space-y-2">
                {poll.options.map((option, index) => {
                    const percentage = poll.totalVotes > 0
                        ? Math.round((option.votesCount / poll.totalVotes) * 100)
                        : 0;
                    const isUserVote = userVotes.includes(option._id);

                    return (
                        <button
                            key={option._id}
                            disabled={showResults || isVoting}
                            onClick={() => onVote(index)}
                            className={cn(
                                "w-full relative overflow-hidden rounded-xl transition-all",
                                showResults
                                    ? "cursor-default"
                                    : "hover:scale-[1.01] active:scale-[0.99]"
                            )}
                        >
                            {/* Background bar */}
                            {showResults && (
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className={cn(
                                        "absolute inset-y-0 left-0 rounded-xl",
                                        isUserVote
                                            ? "bg-primary/30"
                                            : "bg-white/10"
                                    )}
                                />
                            )}

                            <div className={cn(
                                "relative flex items-center justify-between px-4 py-3 rounded-xl border transition-colors",
                                showResults
                                    ? "border-transparent"
                                    : isVoting
                                        ? "border-white/10 bg-white/5"
                                        : "border-white/10 bg-white/5 hover:border-primary/50"
                            )}>
                                <div className="flex items-center gap-2">
                                    {!showResults && (
                                        <div className={cn(
                                            "w-4 h-4 rounded-full border-2 transition-colors",
                                            poll.allowMultiple ? "rounded" : "rounded-full",
                                            "border-slate-500"
                                        )} />
                                    )}
                                    <span className={cn(
                                        "text-sm font-medium",
                                        isUserVote ? "text-primary" : "text-white"
                                    )}>
                                        {option.text}
                                    </span>
                                    {isUserVote && (
                                        <span className="text-xs text-primary">✓</span>
                                    )}
                                </div>
                                {showResults && (
                                    <span className="text-sm font-bold text-slate-300">
                                        {percentage}%
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'}</span>
                {poll.expiresAt && (
                    <span>
                        {isExpired
                            ? 'Poll ended'
                            : `Ends ${new Date(poll.expiresAt).toLocaleDateString()}`
                        }
                    </span>
                )}
            </div>
        </div>
    );
}
