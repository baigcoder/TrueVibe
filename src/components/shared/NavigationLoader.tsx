import { m, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface NavigationLoaderProps {
    isNavigating: boolean;
}

export function NavigationLoader({ isNavigating }: NavigationLoaderProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isNavigating) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isNavigating]);

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Top Progress Bar */}
                    <m.div
                        initial={{ width: "0%", opacity: 0 }}
                        animate={{
                            width: isNavigating ? "70%" : "100%",
                            opacity: 1,
                            transition: {
                                width: isNavigating ? { duration: 10, ease: "easeOut" } : { duration: 0.3, ease: "easeIn" },
                                opacity: { duration: 0.2 }
                            }
                        }}
                        exit={{ opacity: 0 }}
                        className="fixed top-0 left-0 lg:left-[300px] right-0 h-[3px] z-[100] bg-gradient-to-r from-primary via-secondary to-primary shadow-[0_0_15px_rgba(129,140,248,0.8)]"
                    />

                    {/* Subtle Overlay & Blur for the content area */}
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 lg:left-[300px] bg-black/5 backdrop-blur-[2px] z-[99] pointer-events-none"
                    />
                </>
            )}
        </AnimatePresence>
    );
}
