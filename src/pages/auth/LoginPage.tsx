import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const BackgroundAtmosphere = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.3]" />
            <motion.div
                animate={{
                    opacity: [0.1, 0.2, 0.1],
                    scale: [1, 1.05, 1],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0"
            >
                <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/20 blur-[100px] rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/15 blur-[120px] rounded-full" />
            </motion.div>
        </div>
    );
};

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const { error: signInError } = await signIn(email, password);

        if (signInError) {
            setError(signInError.message);
            setIsLoading(false);
        } else {
            navigate({ to: "/app/feed" });
        }
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
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
            setError('Failed to sign in with Google');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 selection:bg-primary/30 overflow-x-hidden bg-[#030712] mesh-bg noise-bg">
            <BackgroundAtmosphere />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="w-full max-w-[420px] relative z-10"
            >
                <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 shadow-huge overflow-hidden relative group">
                    {/* Decorative Background Glows */}
                    <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/5 blur-[80px] rounded-full group-hover:bg-primary/10 transition-all duration-1000" />
                    <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-secondary/5 blur-[80px] rounded-full group-hover:bg-secondary/10 transition-all duration-1000" />

                    <div className="relative z-10">
                        {/* Logo & Header */}
                        <div className="text-center mb-10">
                            <Link to="/" className="inline-flex items-center gap-2.5 mb-6 group/logo">
                                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-glow-primary transition-all group-hover/logo:rotate-6">
                                    V
                                </div>
                                <span className="font-heading font-black text-xl italic uppercase tracking-tighter text-white group-hover/logo:text-primary transition-colors">TRUEVIBE</span>
                            </Link>
                            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter mb-2 leading-none">Access_Nodes</h2>
                            <p className="text-slate-600 text-[8px] font-black uppercase tracking-[0.4em]">SYNCING_IDENTITY_PROTOCOL</p>
                        </div>

                        {/* Google Sign In */}
                        <div className="space-y-4 mb-8">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleGoogleSignIn}
                                disabled={isGoogleLoading}
                                className="w-full h-12 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-white/5 hover:border-white/20 text-white transition-all group/google"
                            >
                                <div className="flex items-center justify-center gap-3 relative z-10">
                                    {isGoogleLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <svg className="w-4 h-4 group-hover/google:scale-110 transition-transform" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity="0.6" />
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity="0.4" />
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity="0.6" />
                                        </svg>
                                    )}
                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em]">CONTINUE_WITH_GOOGLE</span>
                                </div>
                            </Button>

                            <div className="flex items-center gap-3 px-1">
                                <div className="h-px flex-1 bg-white/5" />
                                <span className="text-[7px] font-black text-slate-700 uppercase tracking-[0.4em]">OR_USE_ACCESS_ID</span>
                                <div className="h-px flex-1 bg-white/5" />
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-bold uppercase tracking-widest text-center"
                                >
                                    ACCESS_DENIED: {error}
                                </motion.div>
                            )}

                            <div className="space-y-1.5">
                                <Label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">UPLINK_IDENTITY</Label>
                                <div className="relative group/input">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within/input:text-primary transition-colors" />
                                    <Input
                                        type="email"
                                        placeholder="USER@NETWORK"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-12 pl-12 bg-white/[0.02] border border-white/5 rounded-xl text-white placeholder:text-slate-800 focus:border-primary/40 focus:ring-0 font-bold text-xs"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">ENCRYPTION_HASH</Label>
                                <div className="relative group/input">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within/input:text-primary transition-colors" />
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-12 pl-12 pr-12 bg-white/[0.02] border border-white/5 rounded-xl text-white placeholder:text-slate-800 focus:border-primary/40 focus:ring-0 font-bold text-xs"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="remember"
                                        checked={rememberMe}
                                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                                        className="w-4 h-4 rounded-md border-white/10 data-[state=checked]:bg-primary"
                                    />
                                    <Label htmlFor="remember" className="text-[8px] font-black text-slate-600 uppercase tracking-widest cursor-pointer hover:text-slate-400">PERSISTENT</Label>
                                </div>
                                <Link to={"/auth/forgot-password" as any} className="text-[8px] font-black text-primary/60 uppercase tracking-widest hover:text-primary">RECOVERY</Link>
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-heading font-black italic uppercase tracking-wider text-sm shadow-glow-primary transition-all active:scale-95 border border-white/10 relative overflow-hidden group/submit"
                            >
                                <div className="flex items-center justify-center gap-2 relative z-10">
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            ESTABLISH_UPLINK
                                            <ArrowRight className="w-4 h-4 group-hover/submit:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </div>
                            </Button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-slate-700 text-[8px] font-black uppercase tracking-[0.2em]">
                                NO_IDENTITY?{" "}
                                <Link to="/auth/signup" className="text-secondary/70 hover:text-secondary font-black transition-colors underline-offset-4 hover:underline">INITIALIZE_UNIT</Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Technical Info */}
                <div className="mt-6 flex items-center justify-between px-6 opacity-40">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[7px] font-black text-slate-600 uppercase tracking-[0.4em]">SECURE_UPLINK_READY</span>
                    </div>
                    <span className="text-[7px] font-black text-slate-700 uppercase tracking-[0.4em]">STABLE_v1.0.42</span>
                </div>
            </motion.div>
        </div>
    );
}

