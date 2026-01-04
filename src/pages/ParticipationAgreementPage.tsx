import { m } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Shield, Users, AlertTriangle, Scale, Zap } from "lucide-react";

const BackgroundAtmosphere = () => {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.15]" />
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

const sections = [
    {
        icon: FileText,
        title: "ACCEPTANCE_OF_TERMS",
        content: `By accessing and using TrueVibe ("the Platform"), you acknowledge that you have read, understood, and agree to be bound by these terms. If you do not agree with any part of these terms, you must not use the Platform.

Your continued use of the Platform constitutes acceptance of any modifications to these terms. We reserve the right to update these terms at any time, with changes taking effect immediately upon posting.`
    },
    {
        icon: Users,
        title: "USER_RESPONSIBILITIES",
        content: `As a user of TrueVibe, you agree to:

• Provide accurate and complete information during registration
• Maintain the security of your account credentials
• Use the Platform in compliance with all applicable laws
• Respect the intellectual property rights of others
• Not engage in harassment, spam, or malicious activities
• Not attempt to circumvent security measures or exploit vulnerabilities
• Report any bugs or security issues to our team immediately`
    },
    {
        icon: Shield,
        title: "CONTENT_GUIDELINES",
        content: `Users are solely responsible for content they post on TrueVibe. Prohibited content includes:

• Illegal content or content promoting illegal activities
• Hate speech, discrimination, or harassment
• Explicit or adult content without proper age-gating
• Misinformation or deliberately false claims
• Spam, scams, or fraudulent schemes
• Content that infringes on intellectual property rights

We reserve the right to remove any content that violates these guidelines without prior notice.`
    },
    {
        icon: AlertTriangle,
        title: "LIABILITY_LIMITATIONS",
        content: `TrueVibe is provided "as is" without warranties of any kind. We do not guarantee:

• Uninterrupted or error-free service
• Accuracy or reliability of user-generated content
• Security against all potential threats
• Compatibility with all devices or networks

To the maximum extent permitted by law, TrueVibe shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform.`
    },
    {
        icon: Scale,
        title: "DISPUTE_RESOLUTION",
        content: `Any disputes arising from these terms or your use of TrueVibe shall be resolved through:

1. Good faith negotiation between the parties
2. Mediation by a mutually agreed mediator
3. Binding arbitration under applicable arbitration rules
4. Legal proceedings in the jurisdiction of TrueVibe's headquarters

You agree to waive any right to participate in class action lawsuits against TrueVibe.`
    },
    {
        icon: Zap,
        title: "TERMINATION_PROTOCOL",
        content: `We may suspend or terminate your access to TrueVibe at any time for:

• Violation of these terms or community guidelines
• Suspected fraudulent or illegal activity
• Extended periods of inactivity
• At our sole discretion with or without cause

Upon termination, your right to use the Platform ceases immediately. Provisions that by their nature should survive termination shall remain in effect.`
    }
];

export default function ParticipationAgreementPage() {
    return (
        <div className="min-h-screen bg-[#030712] text-slate-300 selection:bg-primary/30 selection:text-white overflow-x-hidden font-sans relative">
            <BackgroundAtmosphere />

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-[100] px-4 sm:px-6 py-4 bg-[#030712]/90 backdrop-blur-xl">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
                        <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">RETURN_HOME</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">LEGAL_DOC_v2.1</span>
                    </div>
                </div>
            </header>

            <main className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 max-w-5xl mx-auto relative z-10">
                {/* Hero */}
                <div className="mb-20 text-center">
                    <m.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-[9px] font-bold uppercase tracking-[0.5em] mb-8"
                    >
                        <FileText className="w-3 h-3" />
                        TERMS_OF_SERVICE
                    </m.div>

                    <h1 className="font-heading text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white italic uppercase tracking-tighter mb-4 sm:mb-6 leading-none">
                        PARTICIPATION_<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">AGREEMENT</span>
                    </h1>

                    <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.4em] mb-4">
                        LAST UPDATED: DECEMBER 2025
                    </p>
                </div>

                {/* Sections */}
                <div className="space-y-8">
                    {sections.map((section, idx) => (
                        <m.div
                            key={section.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-all"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-primary">
                                    <section.icon className="w-5 h-5" />
                                </div>
                                <h2 className="font-heading text-xl font-black text-white italic uppercase tracking-tight">
                                    {section.title}
                                </h2>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-line">
                                {section.content}
                            </p>
                        </m.div>
                    ))}
                </div>

                {/* Footer Links */}
                <div className="mt-20 pt-12 border-t border-white/5 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-4">
                        SEE ALSO
                    </p>
                    <Link
                        to="/privacy"
                        className="text-xs font-black text-primary hover:text-white uppercase tracking-[0.3em] transition-colors"
                    >
                        PRIVACY_PROTOCOL →
                    </Link>
                </div>
            </main>
        </div>
    );
}
