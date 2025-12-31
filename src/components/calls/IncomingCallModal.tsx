import { m } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface IncomingCallModalProps {
    callerName: string;
    callerAvatar?: string;
    callType: 'audio' | 'video';
    onAccept: () => void;
    onReject: () => void;
}

export function IncomingCallModal({
    callerName,
    callerAvatar,
    callType,
    onAccept,
    onReject,
}: IncomingCallModalProps) {
    return (
        <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <m.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-[#161616] border border-[#2a2a2a] rounded-3xl p-8 max-w-sm w-full text-center"
            >
                {/* Animated Ring */}
                <div className="relative mx-auto w-32 h-32 mb-6">
                    <m.div
                        className="absolute inset-0 rounded-full bg-primary/20"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <m.div
                        className="absolute inset-2 rounded-full bg-primary/30"
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                    />
                    <Avatar className="w-full h-full relative">
                        <AvatarImage src={callerAvatar} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-3xl">
                            {callerName[0]}
                        </AvatarFallback>
                    </Avatar>
                </div>

                {/* Caller Info */}
                <h2 className="text-xl font-bold text-white mb-2">{callerName}</h2>
                <p className="text-gray-400 mb-8">
                    Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...
                </p>

                {/* Action Buttons */}
                <div className="flex justify-center gap-6">
                    <m.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            size="lg"
                            onClick={onReject}
                            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                        >
                            <PhoneOff className="w-7 h-7" />
                        </Button>
                    </m.div>
                    <m.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            size="lg"
                            onClick={onAccept}
                            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
                        >
                            {callType === 'video' ? (
                                <Video className="w-7 h-7" />
                            ) : (
                                <Phone className="w-7 h-7" />
                            )}
                        </Button>
                    </m.div>
                </div>
            </m.div>
        </m.div>
    );
}

export default IncomingCallModal;
