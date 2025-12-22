import {
    Hand, Users, Star, ArrowUp, ArrowUpRight, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useVoiceRoom } from '@/context/VoiceRoomContext';
import { useAuth } from '@/context/AuthContext';
import { RoomParticipant } from './VoiceRoomPanel';

export function LiveStage() {
    const {
        participants,
        speakers,
        listeners,
        raisedHands,
        isAdmin,
        toggleHand,
        promoteToSpeaker,
        demoteToListener,
        localStream,
        isMuted,
        isVideoOff,
        isScreenSharing,
    } = useVoiceRoom();

    const { profile } = useAuth();

    const isSpeaker = speakers.includes(profile?._id || '');
    const isHandRaised = raisedHands.some(h => h.userId === profile?._id);

    // Filter participants based on roles
    const speakerParticipants = participants.filter(p => speakers.includes(p.id));
    const listenerParticipants = participants.filter(p => listeners.includes(p.id));

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Stage Area (Speakers) */}
            <div className="flex-none p-4 pb-0">
                <div className="flex items-center justify-between mb-3 text-primary">
                    <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 fill-primary shadow-glow-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">THE_STAGE</span>
                    </div>
                    <span className="text-[9px] font-bold opacity-50 tech-font">{speakerParticipants.length + (isSpeaker ? 1 : 0)} BROADCASTING</span>
                </div>

                <div className="grid grid-cols-2 gap-3 min-h-[140px]">
                    {/* Local Speaker */}
                    {isSpeaker && (
                        <RoomParticipant
                            participant={{
                                id: profile?._id || '',
                                name: profile?.name || 'You',
                                avatar: profile?.avatar,
                                isMuted,
                                isVideoOff,
                                isScreenSharing,
                            }}
                            isLocal
                            localStream={localStream}
                            isMuted={isMuted}
                            isVideoOff={isVideoOff}
                            isAdmin={isAdmin}
                            isSpeaker={true}
                            onDemote={() => demoteToListener(profile?._id || '')}
                        />
                    )}

                    {/* Remote Speakers */}
                    {speakerParticipants.map(participant => (
                        <RoomParticipant
                            key={participant.id}
                            participant={participant}
                            isAdmin={isAdmin}
                            isSpeaker={true}
                            onDemote={() => demoteToListener(participant.id)}
                        />
                    ))}

                    {speakerParticipants.length === 0 && !isSpeaker && (
                        <div className="col-span-2 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center py-8 opacity-40">
                            <Star className="w-8 h-8 mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest italic">Stage is empty</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Audience Area (Listeners) */}
            <div className="flex-1 min-h-0 flex flex-col p-4">
                <div className="flex items-center justify-between mb-3 text-white/40">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">AUDIENCE</span>
                    </div>
                    <span className="text-[9px] font-bold tech-font">{listenerParticipants.length + (!isSpeaker ? 1 : 0)} LISTENING</span>
                </div>

                <div className="grid grid-cols-4 gap-2 overflow-y-auto scrollbar-hide">
                    {/* Local Listener */}
                    {!isSpeaker && (
                        <motion.div
                            className={cn(
                                "flex flex-col items-center p-2 rounded-xl transition-all relative overflow-hidden group",
                                isHandRaised ? "bg-primary/10 border border-primary/40" : "bg-white/5 border border-white/5"
                            )}
                        >
                            {profile?.avatar ? (
                                <img src={profile.avatar} className="w-10 h-10 rounded-full border border-white/10" alt="Me" />
                            ) : (
                                <div className="w-10 h-10 rounded-full glass-luxe flex items-center justify-center text-xs font-black italic">
                                    {profile?.name?.charAt(0)}
                                </div>
                            )}
                            <span className="text-[9px] font-black uppercase tracking-tight mt-1 text-white/40 group-hover:text-white transition-colors truncate w-full text-center">YOU</span>

                            {isHandRaised && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-1 right-1 w-4 h-4 rounded-md bg-primary flex items-center justify-center shadow-glow-primary"
                                >
                                    <Hand className="w-2.5 h-2.5 text-black" />
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* Remote Listeners */}
                    {listenerParticipants.map(participant => {
                        const hasHandRaised = raisedHands.some(h => h.userId === participant.id);
                        return (
                            <motion.div
                                key={participant.id}
                                className={cn(
                                    "flex flex-col items-center p-2 rounded-xl transition-all relative overflow-hidden group",
                                    hasHandRaised ? "bg-primary/10 border border-primary/40" : "bg-white/5 border border-white/5"
                                )}
                            >
                                {participant.avatar ? (
                                    <img src={participant.avatar} className="w-10 h-10 rounded-full border border-white/10" alt={participant.name} />
                                ) : (
                                    <div className="w-10 h-10 rounded-full glass-luxe flex items-center justify-center text-xs font-black italic">
                                        {participant.name?.charAt(0)}
                                    </div>
                                )}
                                <span className="text-[9px] font-black uppercase tracking-tight mt-1 text-white/40 group-hover:text-white transition-colors truncate w-full text-center">{participant.name}</span>

                                {hasHandRaised && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute top-1 right-1 w-4 h-4 rounded-md bg-primary flex items-center justify-center shadow-glow-primary"
                                    >
                                        <Hand className="w-2.5 h-2.5 text-black" />
                                    </motion.div>
                                )}

                                {/* Admin Promotion Controls */}
                                {isAdmin && hasHandRaised && (
                                    <button
                                        onClick={() => promoteToSpeaker(participant.id)}
                                        className="absolute inset-0 bg-primary/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <ArrowUp className="w-4 h-4 text-black mb-1" />
                                        <span className="text-[8px] font-black text-black">PROMOTE</span>
                                    </button>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Hand Toggler (Audience Only) */}
            {!isSpeaker && (
                <div className="px-4 pb-4">
                    <button
                        onClick={toggleHand}
                        className={cn(
                            "w-full py-3 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 group relative overflow-hidden",
                            isHandRaised
                                ? "bg-primary text-white shadow-glow-primary"
                                : "glass-luxe border border-primary/30 text-primary hover:bg-primary/10"
                        )}
                    >
                        <Hand className={cn("w-5 h-5", isHandRaised ? "animate-bounce" : "group-hover:rotate-12 transition-transform")} />
                        <span className="text-xs font-black italic uppercase tracking-widest">
                            {isHandRaised ? 'HAND_RAISED' : 'RAISE_HAND_TO_SPEAK'}
                        </span>
                    </button>
                </div>
            )}

            {/* Stage Controls (Speakers Only) */}
            {isSpeaker && isAdmin && (
                <div className="px-4 pb-2">
                    <div className="glass-luxe border border-white/5 rounded-2xl p-3 space-y-2">
                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">STAGE_ADMIN_LOG</div>
                        <div className="max-h-[80px] overflow-y-auto space-y-1.5 scrollbar-hide">
                            {raisedHands.length === 0 ? (
                                <p className="text-[9px] text-slate-600 italic">No hands raised currently...</p>
                            ) : (
                                raisedHands.map(hand => (
                                    <div key={hand.userId} className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-glow-primary" />
                                            <span className="text-[10px] font-black uppercase text-white truncate max-w-[120px]">{hand.name}</span>
                                        </div>
                                        <button
                                            onClick={() => promoteToSpeaker(hand.userId)}
                                            className="px-2 py-1 bg-primary text-white text-[9px] font-black rounded-lg hover:bg-primary/90 transition-colors"
                                        >
                                            BRING_STAGE
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
