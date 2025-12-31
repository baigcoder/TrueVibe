import { useState } from 'react';
import { m } from 'framer-motion';
import {
    Globe,
    Users,
    Lock,
    Eye,
    MessageSquare,
    Shield,
    Bell,
    Save,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

type ProfileVisibility = 'public' | 'followers' | 'private';
type MessagePermission = 'everyone' | 'followers' | 'none';

interface PrivacySettings {
    profileVisibility: ProfileVisibility;
    showTrustScore: boolean;
    allowMessages: MessagePermission;
}

const visibilityOptions: { value: ProfileVisibility; label: string; description: string; icon: typeof Globe }[] = [
    {
        value: 'public',
        label: 'Public',
        description: 'Anyone can see your profile and posts',
        icon: Globe,
    },
    {
        value: 'followers',
        label: 'Followers Only',
        description: 'Only approved followers can see your content',
        icon: Users,
    },
    {
        value: 'private',
        label: 'Private',
        description: 'Your profile is hidden from search and discovery',
        icon: Lock,
    },
];

const messageOptions: { value: MessagePermission; label: string; description: string }[] = [
    {
        value: 'everyone',
        label: 'Everyone',
        description: 'Anyone can send you messages',
    },
    {
        value: 'followers',
        label: 'Followers Only',
        description: 'Only people you follow back can message you',
    },
    {
        value: 'none',
        label: 'No One',
        description: 'Disable direct messages completely',
    },
];

export function PrivacyControlsSection() {
    const { profile } = useAuth();
    const queryClient = useQueryClient();

    // Access privacy from profile if available
    const currentPrivacy = (profile as any)?.privacy;

    const [settings, setSettings] = useState<PrivacySettings>({
        profileVisibility: currentPrivacy?.profileVisibility || 'public',
        showTrustScore: currentPrivacy?.showTrustScore ?? true,
        allowMessages: currentPrivacy?.allowMessages || 'everyone',
    });

    const [hasChanges, setHasChanges] = useState(false);

    // Update settings mutation
    const updateMutation = useMutation({
        mutationFn: async (privacy: PrivacySettings) => {
            await api.put('/users/settings', { privacy });
        },
        onSuccess: () => {
            toast.success('Privacy settings updated');
            setHasChanges(false);
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
        onError: (error) => {
            const err = error as { response?: { data?: { error?: { message?: string } } } };
            toast.error(err.response?.data?.error?.message || 'Failed to update settings');
        },
    });

    const handleChange = <K extends keyof PrivacySettings>(
        key: K,
        value: PrivacySettings[K]
    ) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = () => {
        updateMutation.mutate(settings);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-purple-500" />
                        Privacy Controls
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Control who can see your content and interact with you
                    </p>
                </div>

                {hasChanges && (
                    <m.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 rounded-xl text-sm font-medium text-white transition-colors"
                    >
                        {updateMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Changes
                    </m.button>
                )}
            </div>

            {/* Profile Visibility */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-white">
                    <Eye className="w-5 h-5 text-neutral-400" />
                    <h4 className="font-medium">Profile Visibility</h4>
                </div>

                <div className="grid gap-3">
                    {visibilityOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleChange('profileVisibility', option.value)}
                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${settings.profileVisibility === option.value
                                ? 'bg-purple-500/10 border-purple-500/50'
                                : 'bg-neutral-800/50 border-neutral-700/50 hover:border-neutral-600'
                                }`}
                        >
                            <div
                                className={`p-3 rounded-xl ${settings.profileVisibility === option.value
                                    ? 'bg-purple-500/20 text-purple-400'
                                    : 'bg-neutral-700/50 text-neutral-400'
                                    }`}
                            >
                                <option.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-white">{option.label}</p>
                                <p className="text-sm text-neutral-400">{option.description}</p>
                            </div>
                            {settings.profileVisibility === option.value && (
                                <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Message Permissions */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-white">
                    <MessageSquare className="w-5 h-5 text-neutral-400" />
                    <h4 className="font-medium">Who Can Message You</h4>
                </div>

                <div className="grid gap-3">
                    {messageOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => handleChange('allowMessages', option.value)}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${settings.allowMessages === option.value
                                ? 'bg-purple-500/10 border-purple-500/50'
                                : 'bg-neutral-800/50 border-neutral-700/50 hover:border-neutral-600'
                                }`}
                        >
                            <div>
                                <p className="font-medium text-white">{option.label}</p>
                                <p className="text-sm text-neutral-400">{option.description}</p>
                            </div>
                            {settings.allowMessages === option.value && (
                                <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Trust Score Visibility */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-white">
                    <Shield className="w-5 h-5 text-neutral-400" />
                    <h4 className="font-medium">Trust Score</h4>
                </div>

                <button
                    onClick={() => handleChange('showTrustScore', !settings.showTrustScore)}
                    className="flex items-center justify-between w-full p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50 hover:border-neutral-600 transition-all"
                >
                    <div>
                        <p className="font-medium text-white text-left">Show Trust Score on Profile</p>
                        <p className="text-sm text-neutral-400 text-left">
                            Let others see your authenticity score
                        </p>
                    </div>
                    <div
                        className={`w-12 h-7 rounded-full p-1 transition-colors ${settings.showTrustScore ? 'bg-purple-500' : 'bg-neutral-700'
                            }`}
                    >
                        <m.div
                            className="w-5 h-5 rounded-full bg-white shadow-sm"
                            animate={{ x: settings.showTrustScore ? 20 : 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                    </div>
                </button>
            </div>

            {/* Privacy Tips */}
            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Privacy Tips
                </h4>
                <ul className="text-sm text-neutral-400 space-y-1">
                    <li>• Private accounts require follow approval before others can see your posts</li>
                    <li>• Blocking someone hides your profile and all content from them</li>
                    <li>• You can still send messages to people even if they can't message you</li>
                </ul>
            </div>
        </div>
    );
}
