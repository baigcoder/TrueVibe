import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useUpdateProfile } from "@/api/hooks";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import {
    Loader2, Save, User, Bell, Lock, Palette, Shield,
    Camera, MapPin, Link as LinkIcon, ChevronRight, Smartphone,
    ShieldCheck, Eye, Monitor, KeyRound, Globe, Download,
    UserX, Trash2, LogOut, Check, Moon, Sun
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { api } from "@/api/client";

interface SettingsSection {
    id: string;
    label: string;
    icon: React.ElementType;
    description: string;
}

const settingsSections: SettingsSection[] = [
    { id: 'profile', label: 'Profile', icon: User, description: 'Manage your public presence' },
    { id: 'account', label: 'Account Security', icon: KeyRound, description: 'Passwords and authentication' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Control alert preferences' },
    { id: 'privacy', label: 'Privacy', icon: Lock, description: 'Secure your account data' },
    { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Customize your experience' },
    { id: 'trust', label: 'Trust Score', icon: Shield, description: 'Verify your authenticity' },
    { id: 'data', label: 'Data & Export', icon: Download, description: 'Download your data' },
];

export default function SettingsPage() {
    const { profile, signOut } = useAuth();
    const updateProfile = useUpdateProfile();
    const pushNotifications = usePushNotifications();
    const [activeSection, setActiveSection] = useState('profile');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        handle: '',
        bio: '',
        location: '',
        website: '',
    });

    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        mentions: true,
        follows: true,
        messages: true,
        trustAlerts: true,
    });

    const [privacy, setPrivacy] = useState({
        privateProfile: false,
        showActivity: true,
        allowMessages: true,
        showTrustScore: true,
    });

    const [appearance, setAppearance] = useState({
        theme: 'dark',
        reducedMotion: false,
        compactMode: false,
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name || '',
                handle: profile.handle || '',
                bio: profile.bio || '',
                location: profile.location || '',
                website: profile.website || '',
            });
            // Load saved settings from profile if available
            const profileSettings = (profile as any).settings;
            if (profileSettings) {
                setNotifications(prev => ({ ...prev, ...profileSettings.notifications }));
                setPrivacy(prev => ({ ...prev, ...profileSettings.privacy }));
                setAppearance(prev => ({ ...prev, ...profileSettings.appearance }));
            }
        }
    }, [profile]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSaveProfile = async () => {
        try {
            await updateProfile.mutateAsync(formData);
            toast.success('Profile updated successfully!');
        } catch {
            toast.error('Failed to update profile');
        }
    };

    const handleSaveSettings = async (type: 'notifications' | 'privacy' | 'appearance') => {
        try {
            const settings = { notifications, privacy, appearance };
            await api.patch('/profile/settings', { [type]: settings[type] });
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} settings saved!`);
        } catch {
            toast.error('Failed to save settings');
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const response = await api.patch('/profile/avatar', formData) as { success?: boolean };
            if (response.success) {
                toast.success('Avatar updated!');
            }
        } catch {
            toast.error('Failed to upload avatar');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (passwordData.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });
            if (error) throw error;
            toast.success('Password updated successfully!');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch {
            toast.error('Failed to update password');
        }
    };

    const handleExportData = async () => {
        toast.info('Preparing your data export...');
        try {
            const response = await api.get('/profile/export') as { data?: any };
            const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `truevibe-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            toast.success('Data exported successfully!');
        } catch {
            toast.error('Failed to export data');
        }
    };

    const handleDeleteAccount = async () => {
        const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.');
        if (!confirmed) return;

        const doubleConfirm = prompt('Type "DELETE" to confirm:');
        if (doubleConfirm !== 'DELETE') {
            toast.error('Account deletion cancelled');
            return;
        }

        try {
            await api.delete('/profile');
            await signOut();
            toast.success('Account deleted');
        } catch {
            toast.error('Failed to delete account');
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-24 lg:pb-8 relative z-10 px-4">
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
                {/* Sidebar Navigation */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-3"
                >
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 space-y-1 shadow-xl sticky top-4">
                        {settingsSections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group relative",
                                    activeSection === section.id
                                        ? "bg-primary text-white"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <section.icon className={cn("w-4 h-4", activeSection === section.id ? "text-white" : "text-slate-500")} />
                                <span className="font-medium text-sm">{section.label}</span>
                                <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", activeSection === section.id ? "rotate-90" : "opacity-30")} />
                            </button>
                        ))}

                        <div className="pt-3 mt-3 border-t border-white/10">
                            <button
                                onClick={() => signOut()}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="font-medium text-sm">Sign Out</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Content Area */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-9"
                >
                    <AnimatePresence mode="wait">
                        {/* Profile Section */}
                        {activeSection === 'profile' && (
                            <motion.div
                                key="profile"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                {/* Avatar */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                    <div className="flex items-center gap-6">
                                        <div className="relative">
                                            <Avatar className="w-20 h-20 border-2 border-white/10">
                                                <AvatarImage src={profile?.avatar} />
                                                <AvatarFallback className="bg-slate-900 text-white text-xl font-bold">
                                                    {profile?.name?.[0]?.toUpperCase() || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploadingAvatar}
                                                className="absolute -bottom-1 -right-1 p-2 rounded-lg bg-primary text-white shadow-lg hover:scale-105 transition-transform"
                                            >
                                                {uploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                                            </button>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleAvatarUpload}
                                                className="hidden"
                                            />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold">Profile Photo</h3>
                                            <p className="text-slate-500 text-xs mt-1">JPG, PNG or WEBP • Max 5MB</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Profile Form */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        <User className="w-4 h-4 text-primary" />
                                        Public Profile
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-500">Display Name</Label>
                                            <Input
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className="h-11 bg-white/5 border-white/10 rounded-xl text-white"
                                                placeholder="Your name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-500">Username</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">@</span>
                                                <Input
                                                    name="handle"
                                                    value={formData.handle}
                                                    onChange={handleInputChange}
                                                    className="h-11 bg-white/5 border-white/10 rounded-xl pl-8 text-white"
                                                    placeholder="username"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs text-slate-500">Bio</Label>
                                        <Textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleInputChange}
                                            className="bg-white/5 border-white/10 text-white min-h-[80px] rounded-xl resize-none"
                                            placeholder="Tell us about yourself..."
                                        />
                                        <p className={cn("text-xs text-right", formData.bio.length > 150 ? "text-rose-400" : "text-slate-500")}>
                                            {formData.bio.length}/160
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-500">Location</Label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <Input
                                                    name="location"
                                                    value={formData.location}
                                                    onChange={handleInputChange}
                                                    className="h-11 bg-white/5 border-white/10 rounded-xl pl-10 text-white"
                                                    placeholder="City, Country"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-500">Website</Label>
                                            <div className="relative">
                                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                <Input
                                                    name="website"
                                                    value={formData.website}
                                                    onChange={handleInputChange}
                                                    className="h-11 bg-white/5 border-white/10 rounded-xl pl-10 text-white"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <Button
                                            onClick={handleSaveProfile}
                                            disabled={updateProfile.isPending}
                                            className="h-10 px-6 rounded-xl"
                                        >
                                            {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                            Save Profile
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Account Security Section */}
                        {activeSection === 'account' && (
                            <motion.div
                                key="account"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        <KeyRound className="w-4 h-4 text-amber-500" />
                                        Change Password
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-500">New Password</Label>
                                            <Input
                                                type="password"
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                className="h-11 bg-white/5 border-white/10 rounded-xl text-white"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-slate-500">Confirm Password</Label>
                                            <Input
                                                type="password"
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                className="h-11 bg-white/5 border-white/10 rounded-xl text-white"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleChangePassword}
                                        variant="outline"
                                        className="h-10 border-white/10 text-white hover:bg-white/5"
                                    >
                                        Update Password
                                    </Button>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                        Two-Factor Authentication
                                    </h3>
                                    <p className="text-slate-500 text-sm">Add an extra layer of security to your account.</p>
                                    <Button variant="outline" className="h-10 border-white/10 text-white hover:bg-white/5" disabled>
                                        Enable 2FA (Coming Soon)
                                    </Button>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-blue-500" />
                                        Connected Accounts
                                    </h3>
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                                                <svg viewBox="0 0 24 24" className="w-5 h-5">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-white font-medium text-sm">Google</p>
                                                <p className="text-slate-500 text-xs">Connected</p>
                                            </div>
                                        </div>
                                        <Check className="w-5 h-5 text-emerald-500" />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Notifications Section */}
                        {activeSection === 'notifications' && (
                            <motion.div
                                key="notifications"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5"
                            >
                                <h3 className="text-white font-semibold flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-amber-500" />
                                    Notification Preferences
                                </h3>

                                {/* Push Notifications */}
                                <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Smartphone className="w-5 h-5 text-primary" />
                                            <div>
                                                <p className="text-white font-medium text-sm">Push Notifications</p>
                                                <p className="text-slate-500 text-xs">
                                                    {pushNotifications.isSupported
                                                        ? (pushNotifications.isEnabled ? 'Enabled' : 'Disabled')
                                                        : 'Not supported'}
                                                </p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={pushNotifications.isEnabled}
                                            disabled={!pushNotifications.isSupported || pushNotifications.isLoading}
                                            onCheckedChange={(checked) => checked ? pushNotifications.enablePushNotifications() : pushNotifications.disablePushNotifications()}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    {[
                                        { key: 'email', label: 'Email Notifications', desc: 'Receive email updates' },
                                        { key: 'mentions', label: 'Mentions', desc: 'When someone tags you' },
                                        { key: 'follows', label: 'New Followers', desc: 'When someone follows you' },
                                        { key: 'messages', label: 'Messages', desc: 'Direct message alerts' },
                                        { key: 'trustAlerts', label: 'Trust Alerts', desc: 'Deepfake detection notifications' },
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors">
                                            <div>
                                                <p className="text-white text-sm font-medium">{item.label}</p>
                                                <p className="text-slate-500 text-xs">{item.desc}</p>
                                            </div>
                                            <Switch
                                                checked={notifications[item.key as keyof typeof notifications]}
                                                onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, [item.key]: checked }))}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button onClick={() => handleSaveSettings('notifications')} className="h-10 px-6 rounded-xl">
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Notifications
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* Privacy Section */}
                        {activeSection === 'privacy' && (
                            <motion.div
                                key="privacy"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5"
                            >
                                <h3 className="text-white font-semibold flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-rose-500" />
                                    Privacy Settings
                                </h3>

                                <div className="space-y-1">
                                    {[
                                        { key: 'privateProfile', label: 'Private Profile', desc: 'Only approved followers can see your content', icon: Eye },
                                        { key: 'showActivity', label: 'Show Online Status', desc: 'Let others see when you are online', icon: Monitor },
                                        { key: 'allowMessages', label: 'Allow Messages', desc: 'Receive messages from non-followers', icon: Bell },
                                        { key: 'showTrustScore', label: 'Show Trust Score', desc: 'Display your trust score on your profile', icon: ShieldCheck },
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors">
                                            <div className="flex items-start gap-3">
                                                <item.icon className="w-4 h-4 text-slate-500 mt-0.5" />
                                                <div>
                                                    <p className="text-white text-sm font-medium">{item.label}</p>
                                                    <p className="text-slate-500 text-xs">{item.desc}</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={privacy[item.key as keyof typeof privacy]}
                                                onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, [item.key]: checked }))}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button onClick={() => handleSaveSettings('privacy')} className="h-10 px-6 rounded-xl">
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Privacy
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* Appearance Section */}
                        {activeSection === 'appearance' && (
                            <motion.div
                                key="appearance"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6"
                            >
                                <h3 className="text-white font-semibold flex items-center gap-2">
                                    <Palette className="w-4 h-4 text-emerald-500" />
                                    Appearance
                                </h3>

                                {/* Theme Selection */}
                                <div className="space-y-3">
                                    <Label className="text-xs text-slate-500">Theme</Label>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setAppearance(prev => ({ ...prev, theme: 'dark' }))}
                                            className={cn(
                                                "flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2",
                                                appearance.theme === 'dark' ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <Moon className={cn("w-6 h-6", appearance.theme === 'dark' ? "text-primary" : "text-slate-400")} />
                                            <span className="text-white text-sm font-medium">Dark</span>
                                        </button>
                                        <button
                                            onClick={() => setAppearance(prev => ({ ...prev, theme: 'light' }))}
                                            className={cn(
                                                "flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 opacity-50 cursor-not-allowed",
                                                "border-white/10"
                                            )}
                                            disabled
                                        >
                                            <Sun className="w-6 h-6 text-slate-400" />
                                            <span className="text-slate-400 text-sm font-medium">Light (Soon)</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Other Appearance Options */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors">
                                        <div>
                                            <p className="text-white text-sm font-medium">Reduced Motion</p>
                                            <p className="text-slate-500 text-xs">Minimize animations</p>
                                        </div>
                                        <Switch
                                            checked={appearance.reducedMotion}
                                            onCheckedChange={(checked) => setAppearance(prev => ({ ...prev, reducedMotion: checked }))}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors">
                                        <div>
                                            <p className="text-white text-sm font-medium">Compact Mode</p>
                                            <p className="text-slate-500 text-xs">Denser content layout</p>
                                        </div>
                                        <Switch
                                            checked={appearance.compactMode}
                                            onCheckedChange={(checked) => setAppearance(prev => ({ ...prev, compactMode: checked }))}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button onClick={() => handleSaveSettings('appearance')} className="h-10 px-6 rounded-xl">
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Appearance
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* Trust Score Section */}
                        {activeSection === 'trust' && (
                            <motion.div
                                key="trust"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6"
                            >
                                <h3 className="text-white font-semibold flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-indigo-500" />
                                    Trust Verification
                                </h3>

                                <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-primary/10 rounded-xl border border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                            <ShieldCheck className="w-8 h-8 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-xl">Trust Score: {profile?.trustScore || 82}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <p className="text-emerald-400 text-xs font-medium">Verified Account</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                        <h4 className="text-white font-medium text-sm mb-2">How it works</h4>
                                        <p className="text-slate-500 text-xs">Your trust score is based on account age, engagement quality, and verification status.</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                        <h4 className="text-white font-medium text-sm mb-2">Improve your score</h4>
                                        <p className="text-slate-500 text-xs">Complete your profile, engage authentically, and avoid flagged content.</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Data & Export Section */}
                        {activeSection === 'data' && (
                            <motion.div
                                key="data"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="space-y-6"
                            >
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        <Download className="w-4 h-4 text-blue-500" />
                                        Export Your Data
                                    </h3>
                                    <p className="text-slate-500 text-sm">Download a copy of your TrueVibe data including posts, messages, and profile information.</p>
                                    <Button onClick={handleExportData} variant="outline" className="h-10 border-white/10 text-white hover:bg-white/5">
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Data
                                    </Button>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                    <h3 className="text-white font-semibold flex items-center gap-2">
                                        <UserX className="w-4 h-4 text-rose-500" />
                                        Blocked Users
                                    </h3>
                                    <p className="text-slate-500 text-sm">Manage users you have blocked.</p>
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center">
                                        <p className="text-slate-400 text-sm">No blocked users</p>
                                    </div>
                                </div>

                                <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 space-y-4">
                                    <h3 className="text-rose-400 font-semibold flex items-center gap-2">
                                        <Trash2 className="w-4 h-4" />
                                        Delete Account
                                    </h3>
                                    <p className="text-slate-500 text-sm">Permanently delete your account and all associated data. This action cannot be undone.</p>
                                    <Button onClick={handleDeleteAccount} variant="destructive" className="h-10">
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Account
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}
