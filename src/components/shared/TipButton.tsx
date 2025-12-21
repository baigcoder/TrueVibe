import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, Coins, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TipButtonProps {
    authorName: string;
}

export function TipButton({ authorName }: TipButtonProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isTipping, setIsTipping] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    const tipOptions = [
        { label: "10", icon: Sparkles, color: "text-amber-400" },
        { label: "50", icon: Coins, color: "text-emerald-400" },
        { label: "100", icon: Gift, color: "text-rose-400" },
    ];

    const handleTip = (amount: string) => {
        setIsTipping(true);
        // Mock tip transaction
        setTimeout(() => {
            setIsTipping(false);
            setShowOptions(false);
            toast.success(`Sent ${amount} VIBE credits to ${authorName}!`, {
                icon: <Heart className="w-4 h-4 text-rose-500 fill-current" />,
                description: "Creator appreciation is what keeps this platform alive."
            });
        }, 1500);
    };

    return (
        <div className="relative">
            <AnimatePresence>
                {showOptions && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        className="absolute bottom-full left-0 mb-4 p-2 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl flex gap-2 z-50 shadow-2xl"
                    >
                        {tipOptions.map((opt) => (
                            <button
                                key={opt.label}
                                onClick={() => handleTip(opt.label)}
                                disabled={isTipping}
                                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-white/10 transition-all group"
                            >
                                <opt.icon className={cn("w-5 h-5 mb-1 group-hover:scale-110 transition-transform", opt.color)} />
                                <span className="text-[10px] font-black tracking-tighter text-white">{opt.label}</span>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                variant="ghost"
                size="sm"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => setShowOptions(!showOptions)}
                className={cn(
                    "relative gap-2 px-4 h-10 rounded-xl transition-all duration-500 overflow-hidden",
                    "text-amber-500/50 hover:text-amber-400 hover:bg-amber-500/10",
                    showOptions && "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20"
                )}
            >
                {/* Background Sparkles Animation */}
                {isHovered && (
                    <div className="absolute inset-0 pointer-events-none">
                        {[...Array(3)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                animate={{
                                    opacity: [0, 1, 0],
                                    scale: [0, 1, 0],
                                    x: (Math.random() - 0.5) * 40,
                                    y: (Math.random() - 0.5) * 40
                                }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                                className="absolute left-1/2 top-1/2 w-1 h-1 bg-amber-400 rounded-full blur-[1px]"
                            />
                        ))}
                    </div>
                )}

                <div className="relative">
                    {isTipping ? (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                            <Sparkles className="w-4.5 h-4.5" />
                        </motion.div>
                    ) : (
                        <Gift className={cn("w-4.5 h-4.5 transition-transform", isHovered && "scale-110")} />
                    )}
                </div>

                <span className="font-heading font-black italic uppercase text-[10px] tracking-[0.1em]">
                    {isTipping ? "Synergizing..." : "Send Love"}
                </span>

                {/* Subtle Glow Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
        </div>
    );
}
