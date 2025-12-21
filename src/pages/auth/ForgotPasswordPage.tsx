import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email.trim()) {
            setError("Please enter your email address");
            return;
        }

        setIsLoading(true);

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });

            if (resetError) {
                setError(resetError.message);
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex items-center justify-center p-4 overflow-hidden selection:bg-primary/30">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md relative z-10"
            >
                <div className="glass-premium bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
                    {/* Interior Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-primary/20 transition-all duration-700" />

                    {success ? (
                        <div className="text-center py-4 relative z-10">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                                className="w-20 h-20 mx-auto mb-8 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/10"
                            >
                                <CheckCircle className="w-10 h-10 text-emerald-500" />
                            </motion.div>
                            <h2 className="font-heading text-3xl font-extrabold mb-4 text-white uppercase italic tracking-tighter drop-shadow-glow">Transmission Sent</h2>
                            <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                                Link dispatched to <br /><span className="text-white font-bold italic">@{email.split('@')[0]}</span>
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => setSuccess(false)}
                                className="h-12 px-8 rounded-xl bg-white/[0.03] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all font-bold uppercase tracking-widest text-[10px]"
                            >
                                Resend Protocol
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-10 relative z-10">
                                <Link to="/" className="inline-flex items-center gap-3 mb-8 group/logo">
                                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-glow-primary group-hover/logo:rotate-12 transition-transform duration-500">
                                        V
                                    </div>
                                    <span className="font-heading font-black text-2xl text-white italic tracking-[-0.05em] uppercase">TRUEVIBE</span>
                                </Link>
                                <h2 className="font-heading text-4xl font-extrabold mb-2 text-white uppercase italic tracking-tighter drop-shadow-glow">Pass_Recovery</h2>
                                <p className="text-slate-500 font-medium tracking-wide">
                                    Initialize password reset sequence.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest text-center"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Email Node</Label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 transition-colors group-focus-within:text-primary" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="NODE@DOMAIN.COM"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-12 h-14 bg-white/[0.03] border-white/10 text-white rounded-2xl transition-all duration-300 focus:border-primary/50 focus:ring-primary/20 placeholder:text-slate-700 font-bold text-sm glass-premium"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white font-heading font-extrabold uppercase italic tracking-tighter text-lg hover:from-primary/90 hover:to-primary hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 border border-primary/20"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Dispatching...</span>
                                        </div>
                                    ) : (
                                        "Broadcast Reset"
                                    )}
                                </Button>
                            </form>
                        </>
                    )}
                </div>

                <Link
                    to="/auth/login"
                    className="flex items-center justify-center gap-2 text-slate-500 hover:text-white mt-8 transition-all duration-300 font-black uppercase tracking-[0.2em] text-[10px] group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Back to Portal
                </Link>
            </motion.div>
        </div>
    );
}
