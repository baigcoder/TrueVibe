import { motion } from 'framer-motion';
import { useSpotify } from '@/hooks/useSpotify';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export const SpotifyConnect = () => {
    const { status, connect, disconnect, isConnecting, isDisconnecting, isLoading } = useSpotify();

    if (isLoading) {
        return (
            <div className="w-full p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 relative overflow-hidden group shadow-2xl"
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#1DB954]/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-[#1DB954]/15 transition-all duration-700" />

            <div className="flex flex-col items-center text-center gap-3 relative z-10">
                <div className="relative">
                    <div className="w-14 h-14 bg-[#1DB954] rounded-[1.2rem] flex items-center justify-center shadow-[0_0_25px_rgba(29,185,84,0.3)] group-hover:shadow-[0_0_35px_rgba(29,185,84,0.45)] transition-all duration-500">
                        <SpotifyIcon className="w-8 h-8 text-black" />
                    </div>
                </div>

                <div className="space-y-0.5">
                    <h3 className="text-xl font-black text-white tracking-tight uppercase italic aether-font">
                        {status?.connected ? 'Synced' : 'Spotify'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium tech-font tracking-wide">
                        {status?.connected
                            ? `As ${status.displayName}`
                            : 'Sync your music vibe'}
                    </p>
                </div>

                <div className="w-full">
                    {status?.connected ? (
                        <div className="flex flex-col gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => disconnect()}
                                disabled={isDisconnecting}
                                className="w-full h-9 rounded-xl border border-white/5 bg-white/5 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-500 transition-all duration-300 tech-font uppercase tracking-widest text-[8px] font-black"
                            >
                                {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disconnect'}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={() => connect()}
                            disabled={isConnecting}
                            className="w-full h-12 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/10 hover:border-[#1DB954]/40 transition-all duration-500 group/btn shadow-xl shadow-black/40 overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#1DB954]/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                            <div className="flex items-center justify-center gap-2 relative z-10">
                                {isConnecting ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-[#1DB954]" />
                                ) : (
                                    <>
                                        <SpotifyIcon className="w-4 h-4 text-[#1DB954]" />
                                        <span className="text-[9px] font-black uppercase tracking-wide aether-font italic">Connect Spotify</span>
                                    </>
                                )}
                            </div>
                        </Button>
                    )}
                </div>

                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.15em] tech-font">
                    Listen while you vibe
                </p>
            </div>
        </motion.div>
    );
};

const SpotifyIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        className={className}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M12 0C5.373 0 0 5.372 0 12s5.373 12 12 12 12-5.372 12-12S18.627 0 12 0zm5.508 17.302c-.218.358-.68.473-1.037.255-2.88-1.758-6.505-2.157-10.774-1.18-.41.093-.814-.165-.907-.573-.093-.41.165-.813.573-.906 4.673-1.07 8.67-.611 11.89 1.353.357.218.472.68.255 1.051zm1.467-3.262c-.274.446-.858.59-1.303.315-3.3-2.028-8.324-2.614-12.23-1.428-.5.153-1.026-.13-1.18-.63-.153-.5.13-1.026.63-1.18 4.46-1.354 10.007-.702 13.8 1.628.444.275.59.858.314 1.304l-.001-.009zm.127-3.39c-3.957-2.35-10.511-2.568-14.332-1.408-.606.184-1.25-.164-1.434-.77-.184-.606.164-1.25.77-1.434 4.398-1.334 11.649-1.076 16.216 1.636.545.324.726 1.03.402 1.575a1.118 1.118 0 0 1-1.622.401z" />
    </svg>
);
