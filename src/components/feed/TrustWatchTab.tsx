import { motion } from "framer-motion";
import {
    Eye, ShieldAlert, AlertTriangle, CheckCircle,
    Info, Lightbulb, Flag, Shield,
    Fingerprint, Brain, Search
} from "lucide-react";
import { useFeed } from "@/api/hooks";
import { PostCard, type PostData } from "@/components/shared/PostCard";
import { cn } from "@/lib/utils";

// Tips for identifying fake content
const VERIFICATION_TIPS = [
    {
        icon: Search,
        title: "Check the Source",
        description: "Verify news from multiple trusted sources before sharing."
    },
    {
        icon: Fingerprint,
        title: "Look for Authenticity",
        description: "Check if the account is verified and has a consistent posting history."
    },
    {
        icon: Brain,
        title: "Question Emotional Content",
        description: "Content designed to provoke strong emotions may be manipulative."
    },
    {
        icon: Eye,
        title: "Examine Media",
        description: "Use reverse image search to verify photos and videos."
    },
];

export function TrustWatchTab() {
    const { data: feedData, isLoading } = useFeed('trust-watch');
    const posts: PostData[] = (feedData?.pages as any[])?.flatMap(p => p?.data?.posts || []) || [];

    // Calculate stats dynamically
    const suspiciousCount = posts.filter((p: any) => p.trustLevel === 'suspicious').length;
    const fakeCount = posts.filter((p: any) => p.trustLevel === 'likely_fake' || p.trustLevel === 'fake').length;

    // Calculate clean percentage from total analyzed posts
    const totalFlagged = suspiciousCount + fakeCount;
    const totalPosts = posts.length || 1; // Avoid division by zero
    const cleanPercentage = totalPosts > 0 ? Math.round(((totalPosts - totalFlagged) / totalPosts) * 100) : 100;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-amber-500/10 border-t-amber-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ShieldAlert className="w-6 h-6 text-amber-500" />
                    </div>
                </div>
                <p className="mt-6 text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">
                    Scanning Content...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Trust Watch Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/20 rounded-2xl p-5 overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-2xl" />
                <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <Eye className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-heading font-black text-xl text-white uppercase tracking-tight">
                            Trust Watch
                        </h3>
                        <p className="text-white/60 text-sm">AI-powered content verification alerts</p>
                    </div>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-3 gap-3"
            >
                <div className="bg-[#0c0c0e]/60 backdrop-blur-xl border border-white/5 rounded-xl p-4 text-center">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-emerald-500/20 flex items-center justify-center mb-2">
                        <Shield className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black text-white">{cleanPercentage}%</p>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Feed Clean</p>
                </div>
                <div className="bg-[#0c0c0e]/60 backdrop-blur-xl border border-amber-500/20 rounded-xl p-4 text-center">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-amber-500/20 flex items-center justify-center mb-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                    </div>
                    <p className="text-2xl font-black text-white">{suspiciousCount}</p>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Suspicious</p>
                </div>
                <div className="bg-[#0c0c0e]/60 backdrop-blur-xl border border-red-500/20 rounded-xl p-4 text-center">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-red-500/20 flex items-center justify-center mb-2">
                        <Flag className="w-5 h-5 text-red-400" />
                    </div>
                    <p className="text-2xl font-black text-white">{fakeCount}</p>
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Flagged</p>
                </div>
            </motion.div>

            {/* Verification Tips */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-[#0c0c0e]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5"
            >
                <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                    <h3 className="font-heading font-black text-white uppercase tracking-tight">
                        Spot Fake Content
                    </h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {VERIFICATION_TIPS.map((tip, index) => (
                        <motion.div
                            key={tip.title}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + index * 0.05 }}
                            className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <tip.icon className="w-4 h-4 text-primary" />
                                <h4 className="font-bold text-white text-xs">{tip.title}</h4>
                            </div>
                            <p className="text-white/40 text-[11px] leading-relaxed">{tip.description}</p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Flagged Content Section */}
            {posts.length > 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="space-y-4"
                >
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-amber-400" />
                        <h3 className="font-heading font-black text-white uppercase tracking-tight">
                            Flagged Content
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {posts.map((post, index) => (
                            <motion.div
                                key={post._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + index * 0.1 }}
                                className="relative"
                            >
                                {/* Warning Badge */}
                                <div className={cn(
                                    "absolute -top-2 left-4 z-10 px-3 py-1 rounded-lg flex items-center gap-1.5 text-[10px] font-black uppercase",
                                    (post as any).trustLevel === 'likely_fake' || (post as any).trustLevel === 'fake'
                                        ? "bg-red-500/90 text-white"
                                        : "bg-amber-500/90 text-white"
                                )}>
                                    <AlertTriangle className="w-3 h-3" />
                                    {(post as any).trustLevel === 'likely_fake' || (post as any).trustLevel === 'fake'
                                        ? 'Likely Fake'
                                        : 'Suspicious'}
                                </div>
                                <PostCard post={post} />
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 }}
                    className="bg-[#0c0c0e]/40 backdrop-blur-3xl border border-emerald-500/10 rounded-2xl p-10 text-center"
                >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="font-heading font-black text-xl text-white mb-2 uppercase">All Clear!</h3>
                    <p className="text-white/50 text-sm max-w-xs mx-auto">
                        No suspicious content detected in your feed. Our AI is continuously monitoring for misinformation.
                    </p>
                </motion.div>
            )}

            {/* Info Banner */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3"
            >
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-white/80 text-sm font-medium">About Trust Watch</p>
                    <p className="text-white/50 text-xs mt-1">
                        Our AI analyzes content for potential misinformation, manipulated media, and suspicious activity.
                        Content flagged here requires additional scrutiny before sharing.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
