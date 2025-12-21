import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { Users, Sparkles, Globe, Layout, Cpu, Zap as ZapIcon, ShieldCheck, ArrowRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef } from "react";

const BackgroundAtmosphere = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            {/* Background Atmosphere - Synced with App Design */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.4]" />

            {/* Aurora Background Effects - Synced with Sidebar/Feed */}
            <motion.div
                animate={{
                    opacity: [0.1, 0.2, 0.1],
                    scale: [1, 1.05, 1],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0"
            >
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-secondary/15 blur-[150px] rounded-full" />
                <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-accent/10 blur-[100px] rounded-full" />
            </motion.div>
        </div>
    );
};

export default function LandingPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.98]);
    const blur = useTransform(scrollYProgress, [0, 0.2], [0, 8]);

    return (
        <div ref={containerRef} className="min-h-screen bg-[#030712] text-slate-300 selection:bg-primary/30 selection:text-white overflow-x-hidden font-sans mesh-bg noise-bg relative">
            <BackgroundAtmosphere />

            {/* Refined Header */}
            <header className="fixed top-0 left-0 right-0 z-[100] px-4 sm:px-6 py-4 md:py-6 bg-transparent backdrop-blur-md">
                <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
                        <div className="relative">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-glow-primary transition-all group-hover:rotate-6">
                                V
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-heading font-black text-base sm:text-lg text-white italic tracking-tighter leading-none">TRUEVIBE</span>
                            <div className="hidden sm:flex items-center gap-1.5 mt-1">
                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.4em]">SYSTEM_STABLE</span>
                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                            </div>
                        </div>
                    </Link>



                    <div className="flex items-center gap-2 sm:gap-4">
                        <Link to="/auth/login" className="hidden sm:block">
                            <Button variant="ghost" className="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 hover:text-white px-4">
                                DECODE
                            </Button>
                        </Link>
                        <Link to="/auth/signup">
                            <Button className="bg-white text-black hover:bg-slate-200 font-heading font-black italic rounded-lg px-4 sm:px-6 h-9 sm:h-10 shadow-xl transition-all active:scale-95 text-[9px] sm:text-[10px] tracking-wider sm:tracking-widest uppercase">
                                <span className="sm:hidden">START</span>
                                <span className="hidden sm:inline">INITIALIZE_SYNC</span>
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Refined Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 pt-24 overflow-hidden">
                <motion.div
                    style={{ opacity, scale, filter: `blur(${blur}px)` }}
                    className="max-w-5xl mx-auto text-center relative z-10 py-20"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-[9px] font-bold uppercase tracking-[0.4em] mb-8"
                    >
                        <ZapIcon className="w-3 h-3" />
                        AETHER_PROTOCOL_v4
                    </motion.div>

                    <h1 className="font-heading text-2xl xs:text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white italic uppercase tracking-tighter mb-6 sm:mb-8 leading-[0.9] drop-shadow-2xl px-2 sm:px-6 break-words">
                        CRAFTING <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent animate-gradient text-xl xs:text-2xl sm:text-5xl md:text-6xl lg:text-7xl">
                            SYNTHETIC_REALITY
                        </span>
                    </h1>

                    <p className="text-[10px] sm:text-xs md:text-sm text-slate-500 max-w-2xl mx-auto mb-12 font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] leading-relaxed opacity-80 px-4">
                        A decentralized framework for deep-neural social architecture. Synchronize your cognition with the mesh.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4 mb-24">
                        <Link to="/auth/signup" className="w-full sm:w-auto">
                            <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-xs rounded-xl bg-primary hover:bg-primary/90 text-white font-heading font-black italic tracking-[0.2em] shadow-glow-primary transition-all active:scale-95 flex items-center gap-4 border border-white/10 group">
                                JOIN_THE_MATRIX
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <Link to="/auth/login" className="w-full sm:w-auto">
                            <Button size="lg" variant="outline" className="h-14 px-10 text-xs rounded-xl border-white/10 bg-white/[0.02] backdrop-blur-xl text-white font-heading font-black italic tracking-[0.2em] hover:bg-white/5 transition-all w-full md:w-auto shadow-xl group">
                                EXPLORE_NODES
                                <Layout className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        </Link>
                    </div>

                    {/* Industrial Stats - Tighter */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4"
                    >
                        {[
                            { label: 'NODES_ACTIVE', value: '14,002', color: 'text-primary' },
                            { label: 'UPLINK_STABLE', value: '99.9%', color: 'text-secondary' },
                            { label: 'INTEL_FEEDS', value: '1.2M', color: 'text-accent' },
                            { label: 'TRUST_INDEX', value: '0.96', color: 'text-primary' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center backdrop-blur-3xl transition-all hover:bg-white/[0.04]">
                                <div className={cn("text-2xl md:text-3xl font-heading font-black italic mb-2", stat.color)}>{stat.value}</div>
                                <div className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </motion.div>
            </section>

            {/* Modular Features Section */}
            <section id="modules" className="py-20 sm:py-32 px-4 sm:px-6 relative">
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="mb-16 md:mb-24">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            className="text-secondary font-heading font-black italic uppercase text-[10px] tracking-[0.5em] mb-4 flex items-center gap-3"
                        >
                            <span className="text-white/10">[ 01 ]</span> // CORE_MODULES
                        </motion.div>
                        <h2 className="font-heading text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white italic uppercase tracking-tighter mb-6 leading-none">
                            NEURAL_ <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-accent">INFRASTRUCTURE</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={Layout}
                            title="Intelligence_Feed"
                            desc="Real-time cognitive stream verified by neural encryption layers."
                            tag="FEED_v2.1"
                        />
                        <FeatureCard
                            icon={Play}
                            title="Short_Synth"
                            desc="High-bandwidth visual transmission optimized for neural engagement."
                            tag="SYNTH_v0.8"
                            variant="primary"
                        />
                        <FeatureCard
                            icon={Users}
                            title="Neural_Voice"
                            desc="Low-latency biometric audio sync for secure thought exchange."
                            tag="VOICE_ALPHA"
                        />
                        <FeatureCard
                            className="md:col-span-2"
                            icon={Cpu}
                            title="Trust_Matrix_v2"
                            desc="A decentralized biometric trust score for every network entity, ensuring authentic interactions across the mesh."
                            tag="SECURITY_OPS"
                            visual={<div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent blur-3xl opacity-50" />}
                        />
                        <FeatureCard
                            icon={ShieldCheck}
                            title="Privacy_Core"
                            desc="Military-grade zero-knowledge encryption protocols."
                            tag="SECURE_V4"
                        />
                    </div>

                    <div className="mt-16 flex justify-center">
                        <Link to="/modules">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Button
                                    variant="outline"
                                    className="px-8 h-12 text-[10px] font-black uppercase tracking-[0.4em] bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-primary/50 text-slate-400 hover:text-white rounded-xl transition-all flex items-center gap-3 group"
                                >
                                    SEE_ALL_MODULES
                                    <Sparkles className="w-4 h-4 text-primary group-hover:rotate-45 transition-transform" />
                                </Button>
                            </motion.div>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Compact CTA Section */}
            <section className="py-20 sm:py-32 px-4 sm:px-6 relative overflow-hidden">
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-12 md:p-20 shadow-2xl relative overflow-hidden group"
                    >
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/20 transition-all duration-1000" />
                        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-secondary/5 blur-[100px] rounded-full group-hover:bg-secondary/10 transition-all duration-1000" />

                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-glow-primary">
                                <Globe className="w-8 h-8 text-white" />
                            </div>

                            <h2 className="font-heading text-2xl sm:text-4xl md:text-6xl font-black text-white italic uppercase tracking-tighter mb-6 leading-tight">
                                INITIALIZE_ <br className="sm:hidden" /><span className="text-secondary">UPLINK</span>
                            </h2>

                            <p className="text-[10px] md:text-xs text-slate-500 mb-10 max-w-md mx-auto font-bold uppercase tracking-[0.4em] leading-relaxed opacity-80">
                                JOIN THE ARCHITECTURE OF TRUTH. <br />
                                SYNCHRONIZE YOUR IDENTITY.
                            </p>

                            <Link to="/auth/signup">
                                <Button size="lg" className="h-12 sm:h-14 px-6 sm:px-10 text-[10px] sm:text-xs rounded-xl bg-white text-black font-heading font-black italic shadow-2xl hover:bg-slate-100 transition-all flex items-center gap-3 sm:gap-4 group">
                                    <span className="hidden sm:inline">ESTABLISH_CONNECTION</span>
                                    <span className="sm:hidden">CONNECT</span>
                                    <Sparkles className="w-4 h-4 text-primary group-hover:rotate-45 transition-transform" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Tighter Footer */}
            <footer className="py-20 px-6 border-t border-white/5 bg-black">
                <div className="max-w-6xl mx-auto">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-12 mb-16">
                        <div className="max-w-xs">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black text-lg">
                                    V
                                </div>
                                <span className="font-heading font-black text-xl italic uppercase tracking-tighter text-white">TRUEVIBE</span>
                            </div>
                            <p className="text-slate-600 text-[9px] font-bold uppercase tracking-[0.3em] leading-loose">
                                DECENTRALIZED COGNITIVE EXCHANGE. <br />
                                SYSTEM_VERSION//1.0.0
                            </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
                            <div>
                                <h4 className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mb-4">MODULES</h4>
                                <ul className="space-y-3">
                                    <li><Link to="/modules" className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-primary transition-colors">Feed</Link></li>
                                    <li><a href="#" className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-primary transition-colors">Synth</a></li>
                                    <li><a href="#" className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-primary transition-colors">Sync</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mb-4">POLICIES</h4>
                                <ul className="space-y-3">
                                    <li><Link to="/privacy" className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-primary transition-colors">Privacy</Link></li>
                                    <li><Link to="/terms" className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-primary transition-colors">Terms</Link></li>
                                    <li><a href="#" className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-primary transition-colors">Ethics</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mb-4">SOCIAL</h4>
                                <ul className="space-y-3">
                                    <li><a href="#" className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-primary transition-colors">Matrix</a></li>
                                    <li><a href="#" className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-primary transition-colors">Discord</a></li>
                                    <li><a href="#" className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-primary transition-colors">Relay</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-8 opacity-40 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-black uppercase tracking-[0.4em]">ALL_NODES_NOMINAL</span>
                            </div>
                        </div>
                        <div className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em]">
                            © TRUEVIBE_LABS_INDUSTRIES // 2025
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({
    icon: Icon,
    title,
    desc,
    tag,
    className,
    variant = "default",
    visual
}: {
    icon: any;
    title: string;
    desc: string;
    tag: string;
    className?: string;
    variant?: "default" | "primary";
    visual?: React.ReactNode;
}) {
    return (
        <motion.div
            whileHover={{ y: -5, scale: 1.01 }}
            className={cn(
                "group relative rounded-2xl p-8 flex flex-col justify-between overflow-hidden transition-all duration-500",
                variant === "primary"
                    ? "bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 shadow-glow-primary"
                    : "bg-white/[0.02] border border-white/5 hover:border-white/20",
                className
            )}
        >
            {visual}
            <div className="relative z-10 w-full mb-8">
                <div className="flex items-center justify-between mb-8">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-xl",
                        variant === "primary" ? "bg-white text-primary" : "bg-white/[0.05] text-primary"
                    )}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em]">{tag}</span>
                </div>
                <h3 className="font-heading text-lg sm:text-xl md:text-2xl font-black italic uppercase tracking-tighter mb-4 leading-tight text-white break-words hyphens-auto">
                    {title}
                </h3>
                <p className="font-bold uppercase tracking-[0.2em] text-[10px] leading-relaxed text-slate-500 max-w-xs">
                    {desc}
                </p>
            </div>
            <div className="relative z-10 h-0.5 w-8 bg-primary/20 group-hover:w-16 transition-all duration-500" />
        </motion.div>
    );
}

