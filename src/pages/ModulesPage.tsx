import { m } from "framer-motion";
import {
    Layout, Play, Users, Cpu, ShieldCheck,
    Zap, Sparkles, MessageSquare,
    BarChart3, Network
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const modules = [
    {
        category: "INTELLIGENCE",
        items: [
            {
                icon: Layout,
                title: "Intelligence_Feed",
                tag: "FEED_V2.1",
                desc: "Advanced algorithmic curation that synchronizes with your cognitive patterns. Real-time data streaming with neural encryption.",
                details: [
                    "Neural Pattern Recognition",
                    "Zero-Latency Stream Sync",
                    "Encrypted Content Hash",
                    "Adaptive Clarity Filters"
                ],
                color: "text-primary",
                bg: "bg-primary/10"
            },
            {
                icon: Play,
                title: "Short_Synth",
                tag: "SYNTH_V0.8",
                desc: "High-bandwidth visual transmission optimized for neural engagement. Experience media beyond the visual spectrum.",
                details: [
                    "Visual Neural Uplinks",
                    "Dynamic Frame Synthesis",
                    "Aether Compression v4",
                    "Sub-Neural Overlay"
                ],
                color: "text-secondary",
                bg: "bg-secondary/10"
            },
            {
                icon: Users,
                title: "Neural_Voice",
                tag: "VOICE_ALPHA",
                desc: "Low-latency biometric audio sync. Communication so clear it feels like shared consciousness.",
                details: [
                    "Biometric Audio Hash",
                    "Conscious Stream Relay",
                    "Ambient Noise Extraction",
                    "Multi-Node Connectivity"
                ],
                color: "text-accent",
                bg: "bg-accent/10"
            }
        ]
    },
    {
        category: "PROTOCOL",
        items: [
            {
                icon: Cpu,
                title: "Trust_Matrix",
                tag: "SEC_OPS_V2",
                desc: "Decentralized biometric trust scoring. Every interaction is verified against the global neural mesh.",
                details: [
                    "Identity Proof-of-Work",
                    "Biometric Verification",
                    "Trust Node Consensus",
                    "Immutable Reputation"
                ],
                color: "text-primary",
                bg: "bg-primary/5"
            },
            {
                icon: ShieldCheck,
                title: "Privacy_Core",
                tag: "SECURE_V4",
                desc: "Military-grade zero-knowledge encryption. Your data remains yours, even from the system itself.",
                details: [
                    "ZK-Proof Architecture",
                    "Quantum-Safe Tunneling",
                    "Identity Masking Layers",
                    "Autonomous Data Decay"
                ],
                color: "text-secondary",
                bg: "bg-secondary/5"
            },
            {
                icon: MessageSquare,
                title: "Synapse_Chat",
                tag: "RELAY_V1.5",
                desc: "Real-time thought-to-text transmission. Instant messaging evolved for the post-digital era.",
                details: [
                    "Quantum Relay Logic",
                    "Packet-Level Encryption",
                    "Temporal Data Sync",
                    "Dynamic Node Routing"
                ],
                color: "text-accent",
                bg: "bg-accent/5"
            }
        ]
    },
    {
        category: "ECOSYSTEM",
        items: [
            {
                icon: BarChart3,
                title: "Neuro_Analytics",
                tag: "DATA_VIS_V3",
                desc: "Deep-layer data visualization. Understand the flow of information across the entire mesh.",
                details: [
                    "Hex-Grid Heatmaps",
                    "Neural Traffic Analysis",
                    "Sentiment Waveforms",
                    "Macro-Trend Prediction"
                ],
                color: "text-primary",
                bg: "bg-primary/5"
            },
            {
                icon: Network,
                title: "Global_Mesh",
                tag: "SYS_NET_V9",
                desc: "The backbone of TrueVibe. A global network of distributed nodes ensuring 100% uptime.",
                details: [
                    "Decentralized Peering",
                    "Auto-Healing Nodes",
                    "Load-Balancing Swarm",
                    "Global Sync Protocol"
                ],
                color: "text-secondary",
                bg: "bg-secondary/5"
            }
        ]
    }
];

const BackgroundAtmosphere = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.2]" />
            <m.div
                animate={{
                    opacity: [0.05, 0.1, 0.05],
                    scale: [1, 1.1, 1],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0"
            >
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary/10 blur-[120px] rounded-full" />
            </m.div>
        </div>
    );
};

export default function ModulesPage() {
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="min-h-screen bg-[#030712] text-slate-300 selection:bg-primary/30 selection:text-white overflow-x-hidden font-sans relative pb-24">
            <BackgroundAtmosphere />

            {/* Main Header */}
            <header className="fixed top-0 left-0 right-0 z-[100] px-4 sm:px-6 py-4 bg-[#030712]/90 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary/30 to-secondary/30 border border-white/10 rounded-xl flex items-center justify-center text-white font-black text-base sm:text-lg">
                            V
                        </div>
                        <div className="flex flex-col">
                            <span className="font-heading font-black text-base sm:text-lg text-white tracking-tight leading-none">TRUEVIBE</span>
                            <div className="hidden sm:flex items-center gap-1.5 mt-0.5">
                                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.3em]">SYSTEM_STABLE</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                        </div>
                    </Link>

                    {/* Center Navigation - Desktop */}
                    <nav className="hidden md:flex items-center bg-white/[0.03] border border-white/5 rounded-full px-2 py-2">
                        {[
                            { label: 'MODULES', section: null },
                            { label: 'INTELLIGENCE', section: 'INTELLIGENCE' },
                            { label: 'PROTOCOL', section: 'PROTOCOL' },
                            { label: 'ECOSYSTEM', section: 'ECOSYSTEM' }
                        ].map((item) => (
                            <button
                                key={item.label}
                                onClick={() => item.section && scrollToSection(item.section)}
                                className="px-5 py-2 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.25em] transition-all rounded-full hover:bg-white/5"
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* Mobile Navigation */}
                    <nav className="flex md:hidden items-center gap-1">
                        {[
                            { label: 'INT', section: 'INTELLIGENCE' },
                            { label: 'PRO', section: 'PROTOCOL' },
                            { label: 'ECO', section: 'ECOSYSTEM' }
                        ].map((item) => (
                            <button
                                key={item.label}
                                onClick={() => scrollToSection(item.section)}
                                className="px-3 py-2 text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-[0.15em] transition-all rounded-lg hover:bg-white/5"
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* Right CTA - Desktop only */}
                    <Link
                        to="/auth/login"
                        className="hidden md:flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-[0.3em] transition-all"
                    >
                        DECODE
                    </Link>
                </div>
            </header>

            <main className="pt-28 sm:pt-40 px-4 sm:px-6 max-w-7xl mx-auto relative z-10">
                {/* Hero Header */}
                <div className="mb-16 sm:mb-24 text-center">
                    <m.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-full bg-secondary/5 border border-secondary/10 text-secondary text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.5em] mb-6 sm:mb-8"
                    >
                        <Zap className="w-3 h-3" />
                        SYSTEM_ARCHIVE_CORE_v4
                    </m.div>

                    <h1 className="font-heading text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-white italic uppercase tracking-tighter mb-6 sm:mb-8 leading-[0.9] px-2">
                        <span className="block">DETAILED_</span>
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent animate-gradient">MODULES_SPEC</span>
                    </h1>

                    <p className="text-[10px] sm:text-xs md:text-sm text-slate-500 max-w-2xl mx-auto font-bold uppercase tracking-[0.15em] sm:tracking-[0.3em] leading-relaxed opacity-80 px-4">
                        DEEP DIVE INTO THE NEURAL INFRASTRUCTURE. <br className="hidden sm:block" />
                        EXPLORE THE COMPONENTS OF THE TRUEVIBE MESH.
                    </p>
                </div>

                {/* Categories and Modules */}
                {modules.map((category) => (
                    <section key={category.category} id={category.category} className="mb-20 sm:mb-32 scroll-mt-24 sm:scroll-mt-32">
                        <div className="flex items-center gap-4 sm:gap-6 mb-8 sm:mb-12">
                            <h2 className="text-[10px] sm:text-sm font-black text-white/40 uppercase tracking-[0.5em] sm:tracking-[1em]">{category.category}</h2>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {category.items.map((module, idx) => (
                                <m.div
                                    key={module.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.05 }}
                                    whileHover={{ y: -5 }}
                                    className="group relative bg-white/[0.02] border border-white/5 rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 flex flex-col justify-between overflow-hidden hover:border-white/20 transition-all duration-500"
                                >
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between gap-3 mb-6 sm:mb-10">
                                            <div className={cn(
                                                "w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-xl flex-shrink-0",
                                                "bg-white/[0.05] text-white group-hover:bg-white group-hover:text-black"
                                            )}>
                                                <module.icon className="w-5 h-5 sm:w-7 sm:h-7" />
                                            </div>
                                            <div className="flex flex-col items-end min-w-0">
                                                <span className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] sm:tracking-[0.3em] truncate max-w-full">{module.tag}</span>
                                                <div className="w-10 sm:w-12 h-0.5 bg-primary/20 mt-2 group-hover:w-full transition-all duration-700" />
                                            </div>
                                        </div>

                                        <h3 className="font-heading text-base sm:text-xl md:text-2xl font-black italic uppercase tracking-tighter mb-3 sm:mb-4 text-white group-hover:text-primary transition-colors leading-tight">
                                            {module.title.replace(/_/g, ' ')}
                                        </h3>

                                        <p className="font-bold uppercase tracking-[0.1em] sm:tracking-[0.15em] text-[9px] sm:text-[10px] leading-relaxed text-slate-500 mb-6 sm:mb-8 border-l-2 border-white/10 pl-3 sm:pl-4">
                                            {module.desc}
                                        </p>

                                        <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-10">
                                            {module.details.map((detail, i) => (
                                                <div key={i} className="flex items-center gap-2 sm:gap-3 text-slate-400 group/item">
                                                    <div className="w-1 h-1 rounded-full bg-primary/40 group-hover/item:bg-primary transition-colors flex-shrink-0" />
                                                    <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wide sm:tracking-widest">{detail}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Button className="relative z-10 w-full bg-white/10 hover:bg-white/20 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] py-4 sm:py-6 rounded-lg sm:rounded-xl border border-white/10 text-slate-300 hover:text-white group-hover:border-primary/50 transition-all">
                                        ANALYZE PROTOCOL
                                        <Sparkles className="w-3 h-3 ml-2 sm:ml-3 text-primary" />
                                    </Button>

                                    {/* Decorative background glow */}
                                    <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/5 blur-[60px] rounded-full group-hover:bg-primary/10 transition-all duration-700" />
                                </m.div>
                            ))}
                        </div>
                    </section>
                ))}
            </main>



            {/* Matrix Decorative Footer */}
            <div className="max-w-7xl mx-auto px-6 mt-32 pb-60">
                <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 opacity-20">
                    <div className="flex items-center gap-6">
                        <div className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-500">SYSTEM//CORE//ARCHIVE</div>
                        <div className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-500">ENCRYPTION//ENABLED</div>
                    </div>
                    <div className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-500">© 2025 TRUEVIBE_LABS</div>
                </div>
            </div>
        </div>
    );
}
