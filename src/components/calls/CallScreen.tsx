import { useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff,
    Maximize2, Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCall } from '@/context/CallContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function CallScreen() {
    const {
        callType,
        participants,
        isMuted,
        isVideoOff,
        toggleMute,
        toggleVideo,
        endCall,
        localStream,
    } = useCall();

    const [isFullscreen, setIsFullscreen] = useState(false);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // Set local video stream
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Set remote video stream - improved detection
    useEffect(() => {
        // Find the remote participant (anyone who is not 'You' or has a different ID)
        const remoteP = participants.find((p) => {
            // Check if participant has a stream and is not the local user
            const isRemote = p.name !== 'You' && p.stream;
            console.log('[CallScreen] Checking participant:', p.name, 'hasStream:', !!p.stream, 'isRemote:', isRemote);
            return isRemote;
        });

        if (remoteVideoRef.current && remoteP?.stream) {
            console.log('[CallScreen] Attaching remote stream to video element');
            remoteVideoRef.current.srcObject = remoteP.stream;
        }
    }, [participants]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const remoteParticipant = participants.find((p) => p.name !== 'You');

    return (
        <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col"
        >
            {/* Video Grid */}
            <div className="flex-1 relative">
                {callType === 'video' ? (
                    <>
                        {/* Remote Video (Main) */}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />

                        {/* Local Video (PiP) */}
                        <m.div
                            drag
                            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                            className="absolute bottom-24 right-4 w-40 h-56 rounded-2xl overflow-hidden bg-[#1a1a1a] border-2 border-white/20 shadow-xl"
                        >
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className={cn(
                                    "w-full h-full object-cover",
                                    isVideoOff && "hidden"
                                )}
                            />
                            {isVideoOff && (
                                <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
                                    <Avatar className="w-16 h-16">
                                        <AvatarImage src={participants[0]?.avatar} />
                                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xl">
                                            {participants[0]?.name?.[0] || 'Y'}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            )}
                        </m.div>
                    </>
                ) : (
                    // Audio Call UI
                    <div className="w-full h-full flex flex-col items-center justify-center p-8">
                        <m.div
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="relative mb-8"
                        >
                            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
                            <Avatar className="w-40 h-40 relative">
                                <AvatarImage src={remoteParticipant?.avatar} />
                                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-4xl">
                                    {remoteParticipant?.name?.[0] || '?'}
                                </AvatarFallback>
                            </Avatar>
                        </m.div>
                        <h2 className="text-2xl font-bold text-white mb-2">{remoteParticipant?.name || 'Connecting...'}</h2>
                        <p className="text-gray-400">Audio Call</p>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="p-6 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-center gap-4">
                    <Button
                        size="lg"
                        variant="ghost"
                        onClick={toggleMute}
                        className={cn(
                            "w-14 h-14 rounded-full",
                            isMuted ? "bg-red-500/20 text-red-500" : "bg-white/10 text-white"
                        )}
                    >
                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </Button>

                    {callType === 'video' && (
                        <Button
                            size="lg"
                            variant="ghost"
                            onClick={toggleVideo}
                            className={cn(
                                "w-14 h-14 rounded-full",
                                isVideoOff ? "bg-red-500/20 text-red-500" : "bg-white/10 text-white"
                            )}
                        >
                            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                        </Button>
                    )}

                    <Button
                        size="lg"
                        onClick={endCall}
                        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                    >
                        <PhoneOff className="w-7 h-7" />
                    </Button>

                    <Button
                        size="lg"
                        variant="ghost"
                        onClick={toggleFullscreen}
                        className="w-14 h-14 rounded-full bg-white/10 text-white"
                    >
                        {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
                    </Button>
                </div>
            </div>
        </m.div>
    );
}

export default CallScreen;
