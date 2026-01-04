import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useUpdateProfile } from "@/api/hooks";
import { Check, X, Loader2, AtSign, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { m, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

interface UsernameSetupModalProps {
    open: boolean;
    onComplete: () => void;
}

export function UsernameSetupModal({ open, onComplete }: UsernameSetupModalProps) {
    const { user } = useAuth();
    const [username, setUsername] = useState("");
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    const debouncedUsername = useDebounce(username, 500);
    const updateProfile = useUpdateProfile();

    // Validate username format
    const isValidFormat = /^[a-z0-9_]{3,20}$/.test(username);
    const formatError = username.length > 0 && !isValidFormat
        ? username.length < 3
            ? "At least 3 characters"
            : username.length > 20
                ? "Max 20 characters"
                : "Only lowercase letters, numbers, underscores"
        : null;

    // Check availability when username changes
    useEffect(() => {
        if (!debouncedUsername || !isValidFormat) {
            setIsAvailable(null);
            return;
        }

        const checkAvailability = async () => {
            setIsChecking(true);
            try {
                // Search for users with exact handle match
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/users?search=${debouncedUsername}&limit=5`
                );
                const data = await response.json();
                const users = data.data?.users || [];

                // Check if any OTHER user has this exact handle (exclude current user)
                const taken = users.some((u: any) =>
                    u.handle?.toLowerCase() === debouncedUsername.toLowerCase() &&
                    u._id !== user?.id // Exclude current user
                );
                setIsAvailable(!taken);
            } catch (error) {
                console.error("Failed to check username availability:", error);
                setIsAvailable(null);
            } finally {
                setIsChecking(false);
            }
        };

        checkAvailability();
    }, [debouncedUsername, isValidFormat, user?.id]);

    const handleSubmit = async () => {
        if (!isAvailable || !isValidFormat) return;

        try {
            await updateProfile.mutateAsync({ handle: username });
            // Store the custom handle to prevent modal from reopening
            localStorage.setItem('customHandleSet', username);
            toast.success("Username set successfully!");
            setIsDismissed(true);
            onComplete();
        } catch (error: any) {
            toast.error(error.message || "Failed to set username");
        }
    };

    const handleClose = () => {
        // User clicked X or escaped - dismiss the modal
        localStorage.setItem('usernameSetupDismissed', 'true');
        setIsDismissed(true);
        onComplete();
    };

    // Pre-populate with suggested username from email
    useEffect(() => {
        if (open && !username) {
            const emailPrefix = user?.email?.split('@')[0] || '';
            const suggested = emailPrefix.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15);
            if (suggested && suggested.length >= 3) {
                setUsername(suggested);
            }
        }
    }, [open, user?.email]);

    // Don't show if locally dismissed
    const shouldShow = open && !isDismissed;

    return (
        <Dialog
            open={shouldShow}
            onOpenChange={(val) => {
                if (!val) {
                    handleClose();
                }
            }}
        >
            <DialogContent
                className="sm:max-w-md bg-[#0f172a]/95 backdrop-blur-3xl border-white/10 shadow-2xl rounded-3xl p-0 overflow-hidden"
                onInteractOutside={(e) => e.preventDefault()}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

                <DialogHeader className="p-6 pb-2 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
                        <AtSign className="w-7 h-7 text-white" />
                    </div>
                    <DialogTitle className="text-center font-heading font-black text-2xl text-white italic uppercase tracking-tight">
                        Choose Your Handle
                    </DialogTitle>
                    <DialogDescription className="text-center text-slate-400 text-sm">
                        Your unique identifier on TrueVibe. Others will find you with @{username || 'handle'}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 pt-4 space-y-6 relative z-10">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Username
                        </Label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">@</span>
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                placeholder="your_username"
                                className="pl-9 pr-12 h-14 bg-white/5 border-white/10 rounded-2xl text-white text-lg font-semibold focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                maxLength={20}
                                autoFocus
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <AnimatePresence mode="wait">
                                    {isChecking ? (
                                        <m.div
                                            key="checking"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                        >
                                            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                        </m.div>
                                    ) : isAvailable === true ? (
                                        <m.div
                                            key="available"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                        >
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                <Check className="w-4 h-4 text-emerald-500" />
                                            </div>
                                        </m.div>
                                    ) : isAvailable === false ? (
                                        <m.div
                                            key="taken"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                        >
                                            <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center">
                                                <X className="w-4 h-4 text-rose-500" />
                                            </div>
                                        </m.div>
                                    ) : null}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Status message */}
                        <AnimatePresence mode="wait">
                            {formatError ? (
                                <m.p
                                    key="format-error"
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="text-xs text-rose-400 font-medium"
                                >
                                    {formatError}
                                </m.p>
                            ) : isAvailable === true ? (
                                <m.p
                                    key="available"
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="text-xs text-emerald-400 font-medium flex items-center gap-1"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    This handle is available!
                                </m.p>
                            ) : isAvailable === false ? (
                                <m.p
                                    key="taken"
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="text-xs text-rose-400 font-medium"
                                >
                                    This handle is already taken
                                </m.p>
                            ) : null}
                        </AnimatePresence>
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={!isAvailable || !isValidFormat || updateProfile.isPending}
                        className={cn(
                            "w-full h-14 rounded-2xl text-white font-black uppercase tracking-widest text-sm transition-all relative overflow-hidden",
                            isAvailable && isValidFormat
                                ? "bg-gradient-to-r from-primary via-primary to-secondary hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
                                : "bg-white/10 text-slate-500 cursor-not-allowed"
                        )}
                    >
                        {updateProfile.isPending ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Setting up...
                            </div>
                        ) : (
                            "Continue"
                        )}
                    </Button>

                    <p className="text-[10px] text-slate-500 text-center">
                        You can change your handle later in settings
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
