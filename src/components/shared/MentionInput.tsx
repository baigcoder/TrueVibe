import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useDebounce } from '@/hooks/useDebounce';

interface MentionUser {
    id: string;
    userId: string;
    name: string;
    handle: string;
    avatar?: string;
}

interface MentionInputProps {
    value: string;
    onChange: (value: string, mentions: string[]) => void;
    placeholder?: string;
    maxLength?: number;
    className?: string;
    rows?: number;
    autoFocus?: boolean;
}

export function MentionInput({
    value,
    onChange,
    placeholder = "What's on your mind?",
    maxLength = 5000,
    className = '',
    rows = 3,
    autoFocus = false,
}: MentionInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStart, setMentionStart] = useState(-1);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentions, setMentions] = useState<string[]>([]);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    const debouncedQuery = useDebounce(mentionQuery, 300);

    // Fetch mention suggestions
    const { data: suggestions = [], isLoading } = useQuery({
        queryKey: ['mentionSuggestions', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery || debouncedQuery.length < 1) return [];
            const response = await api.get(`/users?q=${encodeURIComponent(debouncedQuery)}&limit=5`) as { data: { data: { users: MentionUser[] } } };
            return response.data.data.users;
        },
        enabled: debouncedQuery.length >= 1,
    });

    // Handle text input
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart;

        // Check if we're typing a mention
        const textBeforeCursor = newValue.substring(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

        if (mentionMatch) {
            const [fullMatch, query] = mentionMatch;
            setMentionQuery(query);
            setMentionStart(cursorPos - fullMatch.length);
            setShowSuggestions(true);
            setSelectedIndex(0);
        } else {
            setShowSuggestions(false);
            setMentionQuery('');
            setMentionStart(-1);
        }

        onChange(newValue, mentions);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % suggestions.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
                break;
            case 'Enter':
                if (showSuggestions) {
                    e.preventDefault();
                    selectMention(suggestions[selectedIndex]);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                break;
            case 'Tab':
                if (showSuggestions) {
                    e.preventDefault();
                    selectMention(suggestions[selectedIndex]);
                }
                break;
        }
    };

    // Select a mention
    const selectMention = useCallback((user: MentionUser) => {
        if (!textareaRef.current || mentionStart === -1) return;

        const beforeMention = value.substring(0, mentionStart);
        const afterMention = value.substring(textareaRef.current.selectionStart);
        const mentionText = `@${user.handle} `;

        const newValue = beforeMention + mentionText + afterMention;
        const newMentions = [...new Set([...mentions, user.userId])];

        setMentions(newMentions);
        onChange(newValue, newMentions);
        setShowSuggestions(false);
        setMentionQuery('');
        setMentionStart(-1);

        // Focus and set cursor position
        setTimeout(() => {
            if (textareaRef.current) {
                const newPos = mentionStart + mentionText.length;
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    }, [value, mentionStart, mentions, onChange]);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(e.target as Node) &&
                textareaRef.current &&
                !textareaRef.current.contains(e.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                maxLength={maxLength}
                rows={rows}
                autoFocus={autoFocus}
                className={`w-full resize-none bg-transparent text-white placeholder:text-neutral-500 focus:outline-none ${className}`}
            />

            {/* Mention Suggestions Dropdown */}
            {showSuggestions && (
                <div
                    ref={suggestionsRef}
                    className="absolute left-0 right-0 mt-1 py-2 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto"
                >
                    {isLoading ? (
                        <div className="px-4 py-3 text-sm text-neutral-400 text-center">
                            <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
                        </div>
                    ) : suggestions.length > 0 ? (
                        suggestions.map((user, index) => (
                            <button
                                key={user.userId}
                                onClick={() => selectMention(user)}
                                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${index === selectedIndex
                                    ? 'bg-purple-500/20'
                                    : 'hover:bg-neutral-800'
                                    }`}
                            >
                                {user.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-white truncate">{user.name}</p>
                                    <p className="text-sm text-neutral-400 truncate">@{user.handle}</p>
                                </div>
                            </button>
                        ))
                    ) : mentionQuery.length >= 1 ? (
                        <div className="px-4 py-3 text-sm text-neutral-400 text-center">
                            No users found
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

// Helper to parse mentions from text
export function parseMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = text.matchAll(mentionRegex);
    return Array.from(matches, m => m[1]);
}

// Helper to render text with clickable mentions
export function renderTextWithMentions(
    text: string,
    onMentionClick?: (handle: string) => void
): React.ReactNode {
    const parts: React.ReactNode[] = [];
    const regex = /@(\w+)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        // Add text before mention
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        // Add mention as clickable element
        const handle = match[1];
        parts.push(
            <button
                key={match.index}
                onClick={() => onMentionClick?.(handle)}
                className="text-purple-400 hover:text-purple-300 hover:underline transition-colors"
            >
                @{handle}
            </button>
        );

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts;
}
