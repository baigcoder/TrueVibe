import { m } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Lock, Eye, Database, Share2, Cookie, Mail, Shield } from "lucide-react";

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
                <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-secondary/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/10 blur-[120px] rounded-full" />
            </m.div>
        </div>
    );
};

const sections = [
    {
        icon: Database,
        title: "DATA_COLLECTION",
        content: `TrueVibe collects the following types of information:

• Account Information: Email, username, profile data
• Content Data: Posts, comments, media you upload
• Usage Data: Interactions, preferences, activity logs
• Device Data: IP address, browser type, operating system
• Location Data: General location based on IP (if permitted)

We collect data to provide, improve, and personalize your experience on the Platform.`
    },
    {
        icon: Eye,
        title: "DATA_USAGE",
        content: `Your data is used for the following purposes:

• Providing and maintaining the Platform services
• Personalizing your feed and recommendations
• Analyzing usage patterns to improve features
• Communicating important updates and notifications
• Detecting and preventing fraud or abuse
• Complying with legal obligations

We do not sell your personal data to third parties.`
    },
    {
        icon: Share2,
        title: "DATA_SHARING",
        content: `We may share your data with:

• Service Providers: Cloud hosting, analytics, payment processors
• Legal Authorities: When required by law or court order
• Business Partners: With your explicit consent only
• During Mergers: In the event of acquisition or merger

All third-party recipients are bound by data protection agreements and must handle your data in accordance with this policy.`
    },
    {
        icon: Lock,
        title: "DATA_SECURITY",
        content: `We implement industry-standard security measures:

• End-to-end encryption for sensitive communications
• Regular security audits and penetration testing
• Secure data centers with access controls
• Employee training on data protection
• Incident response procedures

While we strive to protect your data, no method of transmission over the internet is 100% secure.`
    },
    {
        icon: Cookie,
        title: "COOKIES_AND_TRACKING",
        content: `TrueVibe uses cookies and similar technologies:

• Essential Cookies: Required for Platform functionality
• Analytics Cookies: Help us understand usage patterns
• Preference Cookies: Remember your settings
• Marketing Cookies: Personalize advertisements (optional)

You can manage cookie preferences in your browser settings. Disabling certain cookies may affect Platform functionality.`
    },
    {
        icon: Shield,
        title: "YOUR_RIGHTS",
        content: `Depending on your jurisdiction, you may have the right to:

• Access: Request a copy of your personal data
• Rectification: Correct inaccurate information
• Erasure: Delete your data ("right to be forgotten")
• Portability: Export your data in a standard format
• Objection: Opt out of certain data processing
• Restriction: Limit how we use your data

To exercise these rights, contact us at privacy@truevibe.com`
    },
    {
        icon: Mail,
        title: "CONTACT_INFORMATION",
        content: `For privacy-related inquiries:

Email: privacy@truevibe.com
Data Protection Officer: dpo@truevibe.com

We will respond to your request within 30 days. For EU residents, you have the right to lodge a complaint with your local data protection authority.`
    }
];

export default function PrivacyProtocolPage() {
    return (
        <div className="min-h-screen bg-[#030712] text-slate-300 selection:bg-secondary/30 selection:text-white overflow-x-hidden font-sans relative">
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
                        <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">PRIVACY_DOC_v3.0</span>
                    </div>
                </div>
            </header>

            <main className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 max-w-5xl mx-auto relative z-10">
                {/* Hero */}
                <div className="mb-20 text-center">
                    <m.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-secondary/5 border border-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-[0.5em] mb-8"
                    >
                        <Lock className="w-3 h-3" />
                        PRIVACY_POLICY
                    </m.div>

                    <h1 className="font-heading text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white italic uppercase tracking-tighter mb-4 sm:mb-6 leading-none">
                        PRIVACY_<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary via-accent to-primary">PROTOCOL</span>
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
                                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-secondary">
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
                        to="/terms"
                        className="text-xs font-black text-secondary hover:text-white uppercase tracking-[0.3em] transition-colors"
                    >
                        PARTICIPATION_AGREEMENT →
                    </Link>
                </div>
            </main>
        </div>
    );
}
