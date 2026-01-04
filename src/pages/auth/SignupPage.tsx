import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { m } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Loader2, Mail, Lock, Eye, EyeOff, User, ShieldCheck, ArrowRight } from "lucide-react";
import { PasswordStrength, isPasswordStrong } from "@/components/shared/PasswordStrength";

const BackgroundAtmosphere = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.3]" />
            <m.div
                animate={{
                    opacity: [0.1, 0.2, 0.1],
                    scale: [1, 1.05, 1],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0"
            >
                <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/20 blur-[100px] rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/15 blur-[120px] rounded-full" />
            </m.div>
        </div>
    );
};

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsLoadingGoogleLoading] = useState(false);
    const { signUp } = useAuth();
    const navigate = useNavigate();

    const validateForm = (): string | null => {
        if (!name.trim()) return "NAME_REQUIRED";
        if (!email.trim()) return "EMAIL_REQUIRED";
        if (!password) return "PASSWORD_REQUIRED";
        if (!isPasswordStrong(password)) return "SECURITY_INSUFFICIENT";
        if (password !== confirmPassword) return "HASH_MISMATCH";
        if (!acceptedTerms) return "AGREEMENT_REQUIRED";
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);

        const { error: signUpError } = await signUp(email, password, name);

        if (signUpError) {
            let friendlyMessage = signUpError.message;
            if (signUpError.message.includes("already registered")) {
                friendlyMessage = "IDENTITY_EXISTS";
            } else if (signUpError.message.includes("invalid")) {
                friendlyMessage = "INVALID_LINK_FORMAT";
            }
            setError(friendlyMessage);
            setIsLoading(false);
        } else {
            setSuccess(true);
            setTimeout(() => navigate({ to: "/app/feed" }), 1500);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoadingGoogleLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/app/feed`,
                },
            });
            if (error) {
                setError(error.message);
            }
        } catch (err) {
            setError('GOOGLE_LINK_FAILED');
        } finally {
            setIsLoadingGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center py-8 px-4 sm:p-6 selection:bg-secondary/30 overflow-y-auto overflow-x-hidden bg-[#030712] mesh-bg noise-bg">
            <BackgroundAtmosphere />

            <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-[500px] relative z-10"
            >
                <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-huge overflow-hidden relative group">
                    {/* Decorative Background Glows */}
                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-secondary/5 blur-[80px] rounded-full group-hover:bg-secondary/10 transition-all duration-1000" />
                    <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary/5 blur-[80px] rounded-full group-hover:bg-primary/10 transition-all duration-1000" />

                    <div className="relative z-10">
                        {success ? (
                            <div className="text-center py-16">
                                <m.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-secondary/10 flex items-center justify-center border border-secondary/20 backdrop-blur-3xl shadow-glow-secondary"
                                >
                                    <ShieldCheck className="w-10 h-10 text-secondary" />
                                </m.div>
                                <h2 className="font-heading text-3xl font-black text-white italic uppercase tracking-tighter mb-2 leading-none">Welcome!</h2>
                                <p className="text-slate-600 text-[8px] font-black uppercase tracking-[0.4em]">ACCOUNT_CREATED</p>
                            </div>
                        ) : (
                            <>
                                {/* Logo & Header */}
                                <div className="text-center mb-6 sm:mb-8">
                                    <Link to="/" className="inline-flex items-center gap-2.5 mb-6 group/logo">
                                        <div className="w-11 h-11 bg-gradient-to-br from-secondary to-secondary/80 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all group-hover/logo:rotate-6 group-hover/logo:scale-105">
                                            V
                                        </div>
                                        <span className="font-heading font-black text-xl italic uppercase tracking-tighter text-white group-hover/logo:text-secondary transition-colors">TRUEVIBE</span>
                                    </Link>
                                    <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter mb-3 leading-none">Create Account</h2>
                                    <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.3em]">JOIN_TRUEVIBE</p>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleGoogleSignIn}
                                        disabled={isGoogleLoading}
                                        className="w-full h-13 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-white/25 text-white transition-all group/google"
                                    >
                                        <div className="flex items-center justify-center gap-3 relative z-10">
                                            {isGoogleLoading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <svg className="w-5 h-5 group-hover/google:scale-110 transition-transform" viewBox="0 0 24 24">
                                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                </svg>
                                            )}
                                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em]">Continue with Google</span>
                                        </div>
                                    </Button>

                                    <div className="flex items-center gap-4 px-2">
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em]">or use email</span>
                                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {error && (
                                        <m.div
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold text-center"
                                        >
                                            {error}
                                        </m.div>
                                    )}

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</Label>
                                            <div className="relative group/input">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/input:text-secondary transition-colors" />
                                                <Input
                                                    type="text"
                                                    placeholder="John Doe"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="h-12 pl-12 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder:text-slate-600 transition-all focus:border-secondary/50 focus:bg-white/[0.05] focus:ring-0 font-medium text-sm"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Email</Label>
                                            <div className="relative group/input">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/input:text-secondary transition-colors" />
                                                <Input
                                                    type="email"
                                                    placeholder="you@example.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="h-12 pl-12 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder:text-slate-600 transition-all focus:border-secondary/50 focus:bg-white/[0.05] focus:ring-0 font-medium text-sm"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Password</Label>
                                            <div className="relative group/input">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/input:text-secondary transition-colors" />
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Create a strong password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="h-12 pl-12 pr-12 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder:text-slate-600 transition-all focus:border-secondary/50 focus:bg-white/[0.05] focus:ring-0 font-medium text-sm"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <PasswordStrength password={password} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Confirm Password</Label>
                                            <div className="relative group/input">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/input:text-secondary transition-colors" />
                                                <Input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="Confirm your password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="h-12 pl-12 pr-12 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder:text-slate-600 transition-all focus:border-secondary/50 focus:bg-white/[0.05] focus:ring-0 font-medium text-sm"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Terms and Privacy */}
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/10">
                                        <Checkbox
                                            id="terms"
                                            checked={acceptedTerms}
                                            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                                            className="w-4 h-4 rounded-md border-white/20 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary mt-0.5"
                                        />
                                        <Label htmlFor="terms" className="text-[10px] font-medium text-slate-400 leading-relaxed cursor-pointer hover:text-slate-300 transition-colors">
                                            I accept the <a href="#" className="text-secondary hover:underline">Terms of Service</a> and <a href="#" className="text-secondary hover:underline">Privacy Policy</a>
                                        </Label>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-13 rounded-xl bg-gradient-to-r from-secondary to-secondary/90 hover:from-secondary/90 hover:to-secondary/80 text-white font-heading font-black italic uppercase tracking-wider text-sm shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all active:scale-[0.98] border border-white/10 relative overflow-hidden group/submit"
                                    >
                                        <div className="flex items-center justify-center gap-2 relative z-10">
                                            {isLoading ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    Create Account
                                                    <ArrowRight className="w-4 h-4 group-hover/submit:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </div>
                                    </Button>
                                </form>
                            </>
                        )}

                        {!success && (
                            <div className="mt-8 text-center">
                                <p className="text-slate-500 text-xs font-medium">
                                    Already have an account?{" "}
                                    <Link to="/auth/login" className="text-primary font-semibold hover:text-primary/80 transition-colors">Sign in</Link>
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Technical Info */}
                <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 opacity-40">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-secondary animate-pulse shadow-glow-secondary" />
                        <span className="text-[6px] sm:text-[7px] font-black text-slate-600 uppercase tracking-[0.2em] sm:tracking-[0.4em]">SECURE CONNECTION</span>
                    </div>
                    <span className="text-[6px] sm:text-[7px] font-black text-slate-700 uppercase tracking-[0.2em] sm:tracking-[0.4em]">STABLE_v1.0.42</span>
                </div>
            </m.div>
        </div>
    );
}

