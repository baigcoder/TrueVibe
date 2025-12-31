import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { PasswordStrength, isPasswordStrong } from "@/components/shared/PasswordStrength";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isValidSession, setIsValidSession] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const navigate = useNavigate();

    // Check if user has a valid password reset session
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            // User will be logged in via the magic link token
            if (session) {
                setIsValidSession(true);
            }
            setIsCheckingSession(false);
        };
        checkSession();

        // Listen for auth changes (when user clicks the reset link)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsValidSession(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!isPasswordStrong(password)) {
            setError("Please choose a stronger password");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) {
                setError(updateError.message);
            } else {
                setSuccess(true);
                setTimeout(() => navigate({ to: "/app/feed" }), 2000);
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isCheckingSession) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    if (!isValidSession) {
        return (
            <div className="h-full flex items-center justify-center p-4">
                <m.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center relative z-10"
                >
                    <div className="glass-premium bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-12 backdrop-blur-3xl shadow-2xl">
                        <div className="w-20 h-20 mx-auto mb-8 rounded-[2rem] bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-lg shadow-rose-500/10">
                            <Lock className="w-10 h-10 text-rose-500" />
                        </div>
                        <h2 className="font-heading text-2xl sm:text-3xl font-extrabold mb-4 text-white uppercase italic tracking-tighter drop-shadow-glow">Access_Denied</h2>
                        <p className="text-slate-500 font-medium mb-8 sm:mb-10 max-w-xs leading-relaxed text-sm sm:text-base">
                            This security token is invalid or has expired. Request a new sequence.
                        </p>
                        <Link to={"/auth/forgot-password" as any}>
                            <Button className="h-12 sm:h-14 px-6 sm:px-8 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/90 text-white font-heading font-extrabold uppercase italic tracking-tighter text-base sm:text-lg transition-all shadow-xl shadow-primary/20">
                                Request New Link
                            </Button>
                        </Link>
                    </div>
                </m.div>
            </div>
        );
    }

    return (
        <div className="h-full flex items-center justify-center p-4 overflow-hidden selection:bg-primary/30">
            <m.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md relative z-10"
            >
                <div className="glass-premium bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                    {/* Interior Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-primary/20 transition-all duration-700" />

                    {success ? (
                        <div className="text-center py-4 relative z-10">
                            <m.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                                className="w-20 h-20 mx-auto mb-8 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/10"
                            >
                                <CheckCircle className="w-10 h-10 text-emerald-500" />
                            </m.div>
                            <h2 className="font-heading text-2xl sm:text-3xl font-extrabold mb-4 text-white uppercase italic tracking-tighter drop-shadow-glow">Vault_Updated</h2>
                            <p className="text-slate-400 font-medium mb-2 leading-relaxed">
                                Security parameters successfully redefined.
                            </p>
                            <p className="text-slate-600 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] animate-pulse">
                                Re-routing to central node...
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-6 sm:mb-10 relative z-10">
                                <Link to="/" className="inline-flex items-center gap-3 mb-8 group/logo">
                                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-glow-primary group-hover/logo:rotate-12 transition-transform duration-500">
                                        V
                                    </div>
                                    <span className="font-heading font-black text-2xl text-white italic tracking-[-0.05em] uppercase">TRUEVIBE</span>
                                </Link>
                                <h2 className="font-heading text-2xl sm:text-4xl font-extrabold mb-2 text-white uppercase italic tracking-tighter drop-shadow-glow">Update_Hash</h2>
                                <p className="text-slate-500 font-medium tracking-wide text-sm sm:text-base">
                                    Define your new cryptographic key.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                                {error && (
                                    <m.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest text-center"
                                    >
                                        {error}
                                    </m.div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-slate-500 ml-1">New Private Hash</Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-primary" />
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-12 pr-12 h-14 bg-white/[0.03] border-white/10 text-white rounded-2xl transition-all duration-300 focus:border-primary/50 focus:ring-primary/20 placeholder:text-slate-700 font-bold text-sm glass-premium"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <PasswordStrength password={password} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-slate-500 ml-1">Confirm Hash</Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-primary" />
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="pl-12 pr-12 h-14 bg-white/[0.03] border-white/10 text-white rounded-2xl transition-all duration-300 focus:border-primary/50 focus:ring-primary/20 placeholder:text-slate-700 font-bold text-sm glass-premium"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white font-heading font-extrabold uppercase italic tracking-tighter text-base sm:text-lg hover:from-primary/90 hover:to-primary hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 border border-primary/20"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Updating Cryptography...</span>
                                        </div>
                                    ) : (
                                        "Secure Key"
                                    )}
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </m.div>
        </div>
    );
}
