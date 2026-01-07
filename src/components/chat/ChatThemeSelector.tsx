import { useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { Check, Palette, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChatTheme {
    id: string;
    name: string;
    background: string;
    messageBg: string;
    ownMessageBg: string;
    accent: string;
}

export const CHAT_THEMES: ChatTheme[] = [
    {
        id: 'default',
        name: 'Default',
        background: 'bg-[#030712]',
        messageBg: 'bg-white/5',
        ownMessageBg: 'bg-primary/10',
        accent: 'primary',
    },
    {
        id: 'midnight',
        name: 'Midnight',
        background: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900',
        messageBg: 'bg-indigo-900/30',
        ownMessageBg: 'bg-indigo-600/30',
        accent: 'indigo-500',
    },
    {
        id: 'aurora',
        name: 'Aurora',
        background: 'bg-gradient-to-br from-purple-950 via-pink-950 to-indigo-950',
        messageBg: 'bg-purple-900/30',
        ownMessageBg: 'bg-pink-600/30',
        accent: 'pink-500',
    },
    {
        id: 'ocean',
        name: 'Ocean',
        background: 'bg-gradient-to-br from-cyan-950 via-blue-950 to-slate-950',
        messageBg: 'bg-cyan-900/30',
        ownMessageBg: 'bg-cyan-600/30',
        accent: 'cyan-500',
    },
    {
        id: 'forest',
        name: 'Forest',
        background: 'bg-gradient-to-br from-emerald-950 via-green-950 to-slate-950',
        messageBg: 'bg-emerald-900/30',
        ownMessageBg: 'bg-emerald-600/30',
        accent: 'emerald-500',
    },
    {
        id: 'sunset',
        name: 'Sunset',
        background: 'bg-gradient-to-br from-orange-950 via-rose-950 to-slate-950',
        messageBg: 'bg-orange-900/30',
        ownMessageBg: 'bg-orange-600/30',
        accent: 'orange-500',
    },
    {
        id: 'lavender',
        name: 'Lavender',
        background: 'bg-gradient-to-br from-violet-950 via-fuchsia-950 to-slate-950',
        messageBg: 'bg-violet-900/30',
        ownMessageBg: 'bg-violet-600/30',
        accent: 'violet-500',
    },
    {
        id: 'minimal',
        name: 'Minimal',
        background: 'bg-zinc-950',
        messageBg: 'bg-zinc-900',
        ownMessageBg: 'bg-zinc-800',
        accent: 'zinc-400',
    },
];

interface ChatThemeSelectorProps {
    currentTheme: string;
    onSelect: (theme: ChatTheme) => void;
    onClose: () => void;
}

export function ChatThemeSelector({ currentTheme, onSelect, onClose }: ChatThemeSelectorProps) {
    const [selectedId, setSelectedId] = useState(currentTheme);

    const handleSelect = useCallback((theme: ChatTheme) => {
        setSelectedId(theme.id);
    }, []);

    const handleApply = useCallback(() => {
        const theme = CHAT_THEMES.find(t => t.id === selectedId);
        if (theme) {
            onSelect(theme);
        }
    }, [selectedId, onSelect]);

    return (
        <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-4 bottom-20 md:inset-auto md:right-8 md:bottom-24 md:w-80 p-4 rounded-2xl bg-[#1a1a1a] border border-white/10 shadow-2xl z-50"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    <span className="font-bold text-white">Chat Theme</span>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                    <X className="w-4 h-4 text-white" />
                </button>
            </div>

            {/* Theme Grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                {CHAT_THEMES.map((theme) => (
                    <button
                        key={theme.id}
                        onClick={() => handleSelect(theme)}
                        className={cn(
                            "relative w-full aspect-square rounded-xl overflow-hidden transition-all",
                            theme.background,
                            selectedId === theme.id && "ring-2 ring-primary ring-offset-2 ring-offset-[#1a1a1a]"
                        )}
                    >
                        {/* Mini preview */}
                        <div className="absolute inset-2 flex flex-col justify-end gap-1">
                            <div className={cn("h-2 w-3/4 rounded-full", theme.messageBg)} />
                            <div className={cn("h-2 w-1/2 rounded-full ml-auto", theme.ownMessageBg)} />
                        </div>

                        {selectedId === theme.id && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Check className="w-5 h-5 text-white" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Theme Name */}
            <div className="text-center mb-4">
                <span className="text-sm text-slate-400">
                    {CHAT_THEMES.find(t => t.id === selectedId)?.name}
                </span>
            </div>

            {/* Apply Button */}
            <Button onClick={handleApply} className="w-full bg-primary">
                <Sparkles className="w-4 h-4 mr-2" />
                Apply Theme
            </Button>
        </m.div>
    );
}

export default ChatThemeSelector;
