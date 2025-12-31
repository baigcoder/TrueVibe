import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showReconnected, setShowReconnected] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowReconnected(true);
            setTimeout(() => setShowReconnected(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowReconnected(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleRetry = () => {
        window.location.reload();
    };

    return (
        <AnimatePresence>
            {!isOnline && (
                <m.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-rose-500/95 backdrop-blur-sm shadow-lg"
                >
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <WifiOff className="w-5 h-5 text-white" />
                            <div>
                                <p className="text-white font-medium text-sm">You're offline</p>
                                <p className="text-white/70 text-xs">Check your internet connection</p>
                            </div>
                        </div>
                        <Button
                            onClick={handleRetry}
                            size="sm"
                            variant="secondary"
                            className="bg-white/20 hover:bg-white/30 text-white border-0 h-8"
                        >
                            <RefreshCw className="w-3 h-3 mr-1.5" />
                            Retry
                        </Button>
                    </div>
                </m.div>
            )}

            {showReconnected && (
                <m.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-emerald-500/95 backdrop-blur-sm shadow-lg"
                >
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <p className="text-white font-medium text-sm">Back online!</p>
                    </div>
                </m.div>
            )}
        </AnimatePresence>
    );
}

// Hook for checking online status
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

export default OfflineIndicator;
