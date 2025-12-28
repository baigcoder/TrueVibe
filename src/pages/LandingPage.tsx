import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { Users, Sparkles, Globe, Layout, Zap as ZapIcon, ShieldCheck, ArrowRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState, useEffect } from "react";

// Matrix-style text reveal animation
const MatrixText = ({ text, className, delay = 0, scrambleSpeed = 50 }: { text: string; className?: string; delay?: number; scrambleSpeed?: number }) => {
    const [displayText, setDisplayText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_@#$%!?<>[]';

    useEffect(() => {
        const timeout = setTimeout(() => {
            let currentIndex = 0;
            const interval = setInterval(() => {
                if (currentIndex <= text.length) {
                    const revealed = text.substring(0, currentIndex);
                    const scrambleLength = Math.min(3, text.length - currentIndex);
                    let scrambled = '';
                    for (let i = 0; i < scrambleLength; i++) {
                        scrambled += chars[Math.floor(Math.random() * chars.length)];
                    }
                    setDisplayText(revealed + scrambled);
                    currentIndex++;
                } else {
                    setDisplayText(text);
                    setIsComplete(true);
                    clearInterval(interval);
                }
            }, scrambleSpeed);
            return () => clearInterval(interval);
        }, delay);
        return () => clearTimeout(timeout);
    }, [text, delay, scrambleSpeed]);

    return (
        <span className={cn(className, !isComplete && "opacity-80 font-mono")}>
            {displayText}
            {!isComplete && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }}>_</motion.span>}
        </span>
    );
};

const BackgroundAtmosphere = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            {/* Background Atmosphere - High Fidelity Grid */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.05]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(129,140,248,0.05),transparent_50%)]" />

            {/* Aurora Background Effects */}
            <motion.div
                animate={{
                    opacity: [0.05, 0.15, 0.05],
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, 0]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-x-0 top-0 h-screen"
            >
                <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-primary/20 blur-[130px] rounded-full" />
                <div className="absolute bottom-1/4 -right-20 w-[700px] h-[700px] bg-secondary/15 blur-[160px] rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-accent/10 blur-[110px] rounded-full" />
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

    const opacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);
    const yHero = useTransform(scrollYProgress, [0, 0.15], [0, -50]);

    return (
        <div ref={containerRef} className="min-h-screen bg-[#020617] text-slate-300 selection:bg-primary/30 selection:text-white overflow-x-hidden font-sans relative">
            <BackgroundAtmosphere />

            {/* Refined Header */}
            <header className="fixed top-0 left-0 right-0 z-[100] px-3 sm:px-8 py-4 sm:py-6 bg-black/50 backdrop-blur-xl sm:bg-transparent">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
                        <div className="relative">
                            <motion.div
                                whileHover={{ rotate: 180 }}
                                className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg sm:rounded-xl flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-[0_0_20px_rgba(129,140,248,0.4)] transition-all"
                            >
                                V
                            </motion.div>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-heading font-black text-base sm:text-xl text-white italic tracking-tighter leading-none">TRUEVIBE</span>
                            <div className="hidden xs:flex items-center gap-1.5 mt-1">
                                <span className="text-[6px] sm:text-[7px] font-black text-slate-500 uppercase tracking-[0.3em] sm:tracking-[0.4em]">PROTOCOL_ACTIVE</span>
                                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                            </div>
                        </div>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-8">
                        {['Features', 'Security', 'Modules', 'Mission'].map((item) => (
                            <a key={item} href={`#${item.toLowerCase()}`} className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-colors relative group">
                                {item}
                                <span className="absolute -bottom-1 left-0 w-0 h-px bg-primary transition-all group-hover:w-full" />
                            </a>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <Link to="/auth/login" className="hidden sm:block">
                            <Button variant="ghost" className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-white hover:bg-white/5 px-6">
                                DECODE
                            </Button>
                        </Link>
                        <Link to="/auth/signup">
                            <Button className="bg-primary hover:bg-primary/90 text-white font-heading font-black italic rounded-lg sm:rounded-xl px-4 sm:px-8 h-9 sm:h-12 shadow-[0_0_25px_rgba(129,140,248,0.3)] transition-all active:scale-95 text-[8px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase border border-white/10 group">
                                <span className="hidden sm:inline">SYNC_IDENTITY</span>
                                <span className="sm:hidden">JOIN</span>
                                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Ultimate Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-32 pb-20 overflow-hidden">
                <motion.div
                    style={{ opacity, scale, y: yHero }}
                    className="max-w-6xl mx-auto text-center relative z-10"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-xl text-primary text-[7px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.5em] mb-8 sm:mb-12 shadow-2xl max-w-[90vw] overflow-hidden"
                    >
                        <span className="relative flex h-2 w-2 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="truncate"><MatrixText text="AUTHENTICITY_SYNC:ESTABLISHED" delay={500} /></span>
                    </motion.div>

                    <h1 className="font-heading text-3xl xs:text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white italic uppercase tracking-tighter mb-6 sm:mb-8 leading-[0.85] drop-shadow-[0_0_50px_rgba(255,255,255,0.1)] px-2">
                        <MatrixText text="UNCOVER" delay={800} /> <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-rose-400 animate-gradient-xy">
                            <MatrixText text="THE_REAL" delay={1200} />
                        </span>
                    </h1>

                    <p className="text-[10px] sm:text-xs md:text-sm lg:text-[15px] text-slate-500 max-w-2xl mx-auto mb-16 font-bold uppercase tracking-[0.3em] leading-relaxed opacity-90 px-6 sm:px-0">
                        The world's first AI-augmented social ecosystem. <br className="hidden md:block" />
                        Detect synthesis. Verify vision. Synchronize your vibe.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 px-4 mb-16 sm:mb-32 w-full max-w-lg sm:max-w-none mx-auto">
                        <Link to="/auth/signup" className="w-full sm:w-auto">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button size="lg" className="w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-12 text-[10px] sm:text-[11px] rounded-xl sm:rounded-2xl bg-white text-black hover:bg-slate-100 font-heading font-black italic tracking-[0.15em] sm:tracking-[0.25em] transition-all flex items-center justify-center gap-3 sm:gap-4 group shadow-[0_20px_40px_rgba(255,255,255,0.1)]">
                                    <span className="hidden sm:inline">INITIALIZE_UPLINK</span>
                                    <span className="sm:hidden">GET STARTED</span>
                                    <ZapIcon className="w-4 h-4 text-primary animate-pulse" />
                                </Button>
                            </motion.div>
                        </Link>
                        <Link to="/modules" className="w-full sm:w-auto">
                            <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-12 text-[10px] sm:text-[11px] rounded-xl sm:rounded-2xl border-white/10 bg-white/[0.02] backdrop-blur-3xl text-white font-heading font-black italic tracking-[0.15em] sm:tracking-[0.25em] hover:bg-white/5 transition-all shadow-xl group flex items-center justify-center">
                                <span className="hidden sm:inline">EXPLORE_ARCHITECTURE</span>
                                <span className="sm:hidden">EXPLORE</span>
                                <Layout className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity ml-2 sm:ml-3" />
                            </Button>
                        </Link>
                    </div>

                    {/* Industrial Scroll Indicator */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2, duration: 1 }}
                        className="flex flex-col items-center gap-4 opacity-40"
                    >
                        <div className="w-px h-16 bg-gradient-to-b from-primary to-transparent" />
                        <span className="text-[7px] font-black uppercase tracking-[0.5em] text-slate-500">SCROLL_TO_DECODE</span>
                    </motion.div>
                </motion.div>
            </section>

            {/* AI Deepfake Detection Showcase */}
            <section id="security" className="py-32 sm:py-48 px-4 sm:px-8 relative overflow-hidden bg-[#020617]">
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-20">
                        <div className="flex-1 text-left">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="text-primary font-heading font-black italic uppercase text-[10px] tracking-[0.5em] mb-6 flex items-center gap-3"
                            >
                                <span className="text-white/10">[ 01 ]</span> // NEURAL_SECURITY
                            </motion.div>
                            <h2 className="font-heading text-4xl sm:text-6xl md:text-7xl font-black text-white italic uppercase tracking-tighter mb-8 leading-[0.9]">
                                VERIFY <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">REALITY</span>
                            </h2>
                            <p className="font-bold uppercase tracking-[0.2em] text-[11px] leading-relaxed text-slate-500 max-w-lg mb-12">
                                Our proprietary Aether Engine scans every pixel for synthetic anomalies. From temporal inconsistency to FFT frequency shifts, we decode the truth behind the lens.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { label: 'FFT_ANALYSIS', value: '99.8%' },
                                    { label: 'TEMPORAL_STABILITY', value: 'PRO_v4' },
                                    { label: 'FACIAL_BIOMETRICS', value: 'SECURE' },
                                    { label: 'NEURAL_HASHING', value: 'ACTIVE' }
                                ].map((item) => (
                                    <div key={item.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-3xl group hover:border-primary/30 transition-all">
                                        <div className="text-[7px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2">{item.label}</div>
                                        <div className="text-sm font-black text-white italic tracking-tighter group-hover:text-primary transition-colors">{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 w-full lg:w-auto">
                            <div className="relative aspect-square max-w-lg mx-auto">
                                {/* Synthetic Scan Visualization */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/10 overflow-hidden group shadow-2xl"
                                >
                                    <div className="absolute inset-0 bg-grid-pattern opacity-10" />

                                    {/* Scanning Beam */}
                                    <motion.div
                                        animate={{ y: ['0%', '1000%'], opacity: [0, 1, 0] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_30px_rgba(129,140,248,1)] z-20"
                                    />

                                    {/* Mock Image Content */}
                                    <div className="absolute inset-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/5 flex items-center justify-center">
                                        <div className="relative text-center p-8">
                                            <ShieldCheck className="w-20 h-20 text-primary mx-auto mb-6 animate-pulse" />
                                            <div className="text-[9px] font-black text-primary uppercase tracking-[0.8em] mb-2">SCANNING_ARTIFACTS</div>
                                            <div className="flex gap-1 justify-center">
                                                {[...Array(20)].map((_, i) => (
                                                    <motion.div
                                                        key={i}
                                                        animate={{ height: [4, 12, 4] }}
                                                        transition={{ duration: 1, delay: i * 0.05, repeat: Infinity }}
                                                        className="w-0.5 bg-primary/40 rounded-full"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Overlay Technical Data */}
                                    <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end">
                                        <div className="text-left">
                                            <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">DETECTION_LEVEL</div>
                                            <div className="text-xl font-black text-white uppercase italic tracking-tighter">ULTRA_PRECISE</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[24px] font-black text-primary italic leading-none">99.9%</div>
                                            <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest">CONFIDENCE_SCORE</div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Decorative Floating Circles */}
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 blur-3xl rounded-full" />
                                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/5 blur-3xl rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Premium Feed & Shorts Showcase */}
            <section id="modules" className="py-32 sm:py-48 px-4 sm:px-8 relative overflow-hidden bg-[#020617]">
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="text-center mb-24">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            className="text-secondary font-heading font-black italic uppercase text-[10px] tracking-[0.5em] mb-6 flex items-center justify-center gap-3"
                        >
                            <span className="text-white/10">[ 02 ]</span> // CONTENT_MESH
                        </motion.div>
                        <h2 className="font-heading text-4xl sm:text-6xl md:text-7xl font-black text-white italic uppercase tracking-tighter mb-8 leading-[0.9]">
                            IMMERSIVE_ <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-accent">EXPRESSION</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={Layout}
                            title="Intelligence_Feed"
                            desc="A multi-layered cognitive stream with integrated AI analysis and premium glassmorphism."
                            tag="FEED_v2"
                        />
                        <FeatureCard
                            icon={Play}
                            title="Short_Synth"
                            desc="Zero-clipping, high-frequency visual transmissions optimized for modern attention spans."
                            tag="SHORT_v1"
                            variant="primary"
                        />
                        <FeatureCard
                            icon={Users}
                            title="Vibe_Matching"
                            desc="Real-time biometric similarity analysis to sync you with the perfect circle."
                            tag="SYNC_v3"
                        />
                    </div>
                </div>
            </section>

            {/* Mission & CTA Section */}
            <section id="mission" className="py-32 sm:py-48 px-4 sm:px-8 relative overflow-hidden bg-[#020617]">
                <div className="max-w-4xl mx-auto relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 sm:p-20 shadow-2xl relative overflow-hidden group"
                    >
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 blur-[100px] rounded-full group-hover:bg-primary/20 transition-all duration-1000" />
                        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-secondary/10 blur-[100px] rounded-full group-hover:bg-secondary/20 transition-all duration-1000" />

                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-10 shadow-[0_0_30px_rgba(129,140,248,0.4)]">
                                <Globe className="w-10 h-10 text-white" />
                            </div>

                            <h2 className="font-heading text-4xl sm:text-6xl font-black text-white italic uppercase tracking-tighter mb-8 leading-tight">
                                JOIN_THE_ <br /><span className="text-secondary">NETWORK</span>
                            </h2>

                            <p className="text-[11px] md:text-sm text-slate-500 mb-12 max-w-md mx-auto font-bold uppercase tracking-[0.4em] leading-relaxed opacity-90">
                                ESTABLISH YOUR IDENTITY IN THE DECENTRALIZED MESH. <br />
                                VERIFIED. SECURE. AUTHENTIC.
                            </p>

                            <Link to="/auth/signup" className="block w-full sm:w-auto">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button size="lg" className="w-full sm:w-auto h-12 sm:h-16 px-6 sm:px-12 text-[9px] sm:text-[11px] rounded-xl sm:rounded-2xl bg-white text-black font-heading font-black italic shadow-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2 sm:gap-4 group">
                                        <span className="sm:hidden">JOIN_NOW</span>
                                        <span className="hidden sm:inline">ESTABLISH_CONNECTION</span>
                                        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary group-hover:rotate-45 transition-transform" />
                                    </Button>
                                </motion.div>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Industrial Footer */}
            <footer className="py-16 sm:py-32 px-4 sm:px-8 border-t border-white/5 bg-[#010413]">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-10 sm:gap-20 mb-12 sm:mb-20">
                        <div className="max-w-xs">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-glow-primary">
                                    V
                                </div>
                                <span className="font-heading font-black text-2xl italic uppercase tracking-tighter text-white">TRUEVIBE</span>
                            </div>
                            <p className="text-slate-600 text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.3em] leading-loose">
                                DECENTRALIZED COGNITIVE EXCHANGE. <br />
                                SECURED_BY_AETHER_v4 // 2025
                            </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-16 md:gap-24">
                            <div>
                                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6">MODULES</h4>
                                <ul className="space-y-4">
                                    {['Feed', 'Synth', 'Sync', 'Nodes'].map(item => (
                                        <li key={item}><Link to="/modules" className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-primary transition-colors">{item}</Link></li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6">SECURITY</h4>
                                <ul className="space-y-4">
                                    {['Privacy', 'Ethics', 'Audit', 'Terms'].map(item => (
                                        <li key={item}><Link to="/privacy" className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-primary transition-colors">{item}</Link></li>
                                    ))}
                                </ul>
                            </div>
                            <div className="hidden sm:block">
                                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6">CONNECT</h4>
                                <ul className="space-y-4">
                                    {['Matrix', 'Discord', 'Relay', 'Uplink'].map(item => (
                                        <li key={item}><a href="#" className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] hover:text-primary transition-colors">{item}</a></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 sm:pt-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-8">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.5em] text-slate-400">NODES_NOMINAL_v4.2.1</span>
                            </div>
                        </div>
                        <div className="text-[7px] sm:text-[9px] font-black text-slate-700 uppercase tracking-[0.15em] sm:tracking-[0.5em] text-center break-words">
                            © TRUEVIBE_LABS // ALL_RIGHTS_ENCRYPTED
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
                <h3 className="font-heading text-base sm:text-xl md:text-2xl font-black italic uppercase tracking-tighter mb-4 leading-tight text-white break-all sm:break-words">
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

