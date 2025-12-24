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
            className="w-full bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-3xl p-6 relative group shadow-2xl transition-all duration-700 hover:border-white/20"
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#1DB954]/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-[#1DB954]/15 transition-all duration-700" />

            <div className="flex items-center gap-4 relative z-10">
                <div className="relative shrink-0">
                    <div className="w-10 h-10 bg-[#1DB954] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(29,185,84,0.3)] group-hover:shadow-[0_0_25px_rgba(29,185,84,0.45)] transition-all duration-500">
                        <SpotifyIcon className="w-6 h-6 text-black" />
                    </div>
                </div>

                <div className="flex-1 min-w-0 text-left">
                    <h3 className="text-xs font-black text-white tracking-widest uppercase italic aether-font">
                        {status?.connected ? 'Synced' : 'Spotify'}
                    </h3>
                    <p className="text-[9px] text-slate-500 font-bold tech-font tracking-wide uppercase">
                        {status?.connected
                            ? `As ${status.displayName}`
                            : 'Music Sync'}
                    </p>
                </div>

                <div className="shrink-0">
                    {status?.connected ? (
                        <Button
                            variant="ghost"
                            onClick={() => disconnect()}
                            disabled={isDisconnecting}
                            className="h-8 px-3 rounded-lg border border-white/5 bg-white/5 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-500 transition-all duration-300 tech-font uppercase tracking-widest text-[8px] font-black"
                        >
                            {isDisconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Off'}
                        </Button>
                    ) : (
                        <Button
                            onClick={() => connect()}
                            disabled={isConnecting}
                            className="h-9 px-4 rounded-xl bg-white/[0.05] hover:bg-[#1DB954] text-white hover:text-black border border-white/10 hover:border-[#1DB954] transition-all duration-500 group/btn shadow-lg"
                        >
                            <div className="flex items-center justify-center gap-2 relative z-10">
                                {isConnecting ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <span className="text-[9px] font-black uppercase tracking-wider italic">Sync</span>
                                )}
                            </div>
                        </Button>
                    )}
                </div>
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
