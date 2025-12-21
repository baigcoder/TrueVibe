import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Search, Phone, Video, Smile, Pin, Reply, Plus,
    Users, Settings, X, Compass, MessageCircle, Loader2,
    MoreVertical, Sparkles, Shield, Share2, Mic,
    Volume2, LogIn, Server, Monitor, MicOff, MonitorOff, VideoOff, LogOut,
    Activity, Fingerprint, Terminal, Cpu, Radio, Send, ArrowRight, Lock
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useVoiceRoom } from "@/context/VoiceRoomContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
    useServers, useDiscoverServers, useServer, useCreateServer, useJoinServer,
    useChannels, useChannelMessages, useSendChannelMessage,
    useConversations, useMessages, useSendMessage, useAddReaction, useRemoveReaction,
    useCreateConversation,
    useSearchUsers
} from "@/api/hooks";
import { useSocket } from "@/context/SocketContext";
import { useCall } from "@/context/CallContext";
import { useSearch } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Media components
import { MediaUploader } from "@/components/chat/MediaUploader";
import { MediaPreview, type PreviewFile } from "@/components/chat/MediaPreview";
import { MessageMedia } from "@/components/chat/MessageMedia";
import { CreateRoomModal } from "@/components/chat/CreateRoomModal";
import { JoinRoomModal } from "@/components/chat/JoinRoomModal";
import { ParticipantsGrid } from "@/components/chat/VoiceRoomPanel";
import { useMediaUpload, type MediaAttachment } from "@/hooks/useMediaUpload";

interface Message {
    _id: string;
    senderId: string;
    sender?: { name: string; avatar?: string; userId?: string };
    content: string;
    media?: { type: string; url: string }[];
    reactions?: { emoji: string; users: string[] }[];
    replyTo?: { _id: string; content: string; sender?: { name: string } };
    createdAt: Date;
    isPinned?: boolean;
    readBy?: { userId: string; readAt: Date }[];
    status?: 'sending' | 'sent' | 'delivered' | 'read';
}

interface Channel {
    _id: string;
    name: string;
    type: 'text' | 'voice' | 'announcement';
}

interface Server {
    _id: string;
    name: string;
    icon?: string;
    memberCount: number;
    ownerId: string;
    inviteCode?: string;
    channels?: Channel[];
    memberProfiles?: any[];
}

interface Conversation {
    _id: string;
    type: 'direct' | 'group';
    groupName?: string;
    participants: { _id: string; userId?: string; name: string; avatar?: string }[];
    lastMessage?: { content: string; timestamp: Date };
}

const CyberLuxeStyles = () => (
    <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .tech-font {
            font-family: 'JetBrains Mono', monospace;
        }

        .cyber-grid {
            background-image: 
                linear-gradient(rgba(0, 245, 255, 0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 245, 255, 0.05) 1px, transparent 1px);
            background-size: 30px 30px;
        }

        .cyber-scanner {
            background: linear-gradient(to bottom, transparent, rgba(0, 245, 255, 0.4), transparent);
            box-shadow: 0 0 20px rgba(0, 245, 255, 0.2);
        }

        .glass-luxe {
            background: rgba(6, 10, 22, 0.6);
            backdrop-filter: blur(25px) saturate(180%);
            -webkit-backdrop-filter: blur(25px) saturate(180%);
            border: 1px solid rgba(0, 245, 255, 0.1);
        }

        .glass-luxe-light {
            background: rgba(255, 255, 255, 0.02);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .neon-border-cyan {
            box-shadow: 0 0 15px rgba(0, 245, 255, 0.3), inset 0 0 5px rgba(0, 245, 255, 0.2);
        }

        .neon-glow-cyan {
            filter: drop-shadow(0 0 8px rgba(0, 245, 255, 0.6));
        }

        .text-glow-cyan {
            text-shadow: 0 0 10px rgba(0, 245, 255, 0.6);
        }

        .glitch-hover:hover {
            animation: glitch-text 0.3s infinite;
        }

        @keyframes scanning {
            0% { transform: translateY(-100%); opacity: 0; }
            50% { opacity: 0.5; }
            100% { transform: translateY(100vh); opacity: 0; }
        }

        @keyframes glitch-text {
            0% { transform: translate(0); }
            20% { transform: translate(-2px, 2px); }
            40% { transform: translate(-2px, -2px); }
            60% { transform: translate(2px, 2px); }
            80% { transform: translate(2px, -2px); }
            100% { transform: translate(0); }
        }

        .hacker-label {
            font-family: 'JetBrains Mono', monospace;
            text-transform: uppercase;
            letter-spacing: 0.25em;
            font-size: 0.65rem;
            font-weight: 800;
        }

        ::-webkit-scrollbar {
            width: 4px;
        }
        ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(0, 245, 255, 0.1);
            border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 245, 255, 0.3);
        }
    `}} />
);


export default function ChatPage() {
    const { profile, user } = useAuth();
    const { socket } = useSocket();
    const queryClient = useQueryClient();
    const search = useSearch({ from: '/app/chat' }) as { userId?: string; conversationId?: string; room?: string };

    const [view, setView] = useState<'dms' | 'server' | 'discover'>('dms');
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [showMembers, setShowMembers] = useState(true);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [showCreateServer, setShowCreateServer] = useState(false);
    const [showJoinServer, setShowJoinServer] = useState(false);
    const [newServerName, setNewServerName] = useState('');
    const [inviteCode, setInviteCode] = useState('');

    // Media attachment state
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<PreviewFile[]>([]);
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const {
        isInRoom,
        roomId,
        isMuted,
        isVideoOff,
        isScreenSharing,
        toggleMute,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        leaveRoom,
        joinRoom,
    } = useVoiceRoom();

    const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
    const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    // Handle room URL parameter for join by link
    useEffect(() => {
        if (search.room && !isInRoom) {
            setPendingRoomId(search.room);
            setShowJoinRoomModal(true);
        }
    }, [search.room, isInRoom]);

    // Auto-show mobile sidebar when no conversation is selected on mobile
    useEffect(() => {
        if (!selectedConversationId && !selectedChannelId && view === 'dms') {
            // Only on mobile (lg breakpoint is 1024px)
            const isMobile = window.innerWidth < 1024;
            if (isMobile) {
                setShowMobileSidebar(true);
            }
        }
    }, [selectedConversationId, selectedChannelId, view]);

    const { uploadMedia, isUploading } = useMediaUpload();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newFiles: PreviewFile[] = Array.from(files).map(file => ({
                file,
                url: URL.createObjectURL(file),
                type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'file'
            }));
            setPendingFiles(prev => [...prev, ...newFiles]);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: serversData, isLoading: serversLoading } = useServers();
    const { data: discoverData } = useDiscoverServers(searchQuery);
    const { data: serverData } = useServer(selectedServerId || '');
    const { data: channelsData } = useChannels(selectedServerId || '');
    const { data: conversationsData, isLoading: convsLoading } = useConversations();
    const { data: channelMessagesData, isLoading: channelMsgsLoading } = useChannelMessages(selectedServerId || '', selectedChannelId || '');
    const { data: dmMessagesData, isLoading: dmMsgsLoading } = useMessages(selectedConversationId || '');

    const sendChannelMessage = useSendChannelMessage();
    const sendDmMessage = useSendMessage();
    const createServer = useCreateServer();
    const joinServer = useJoinServer();
    const addReaction = useAddReaction();
    const removeReaction = useRemoveReaction();
    const createConversation = useCreateConversation();
    const { initiateCall } = useCall();
    const { data: searchUsersData, isLoading: searchLoading } = useSearchUsers(searchQuery);

    const servers = (serversData as any)?.data?.servers || [];
    const discoverServers = (discoverData as any)?.data?.servers || [];
    const conversations = (conversationsData as any)?.data?.conversations || [];
    const channels = (serverData as any)?.data?.server?.channels || (channelsData as any)?.data?.channels || [];
    const selectedServer = (serverData as any)?.data?.server;
    const currentMessages = view === 'server'
        ? (channelMessagesData?.pages?.flatMap((p: any) => p.data?.messages || []) || [])
        : (dmMessagesData?.pages?.flatMap((p: any) => p.data?.messages || []) || []);
    const selectedConversation = conversations.find((c: Conversation) => c._id === selectedConversationId);
    const selectedChannel = channels.find((c: Channel) => c._id === selectedChannelId);
    const messagesLoading = view === 'server' ? channelMsgsLoading : dmMsgsLoading;

    useEffect(() => {
        if (!socket) return;
        servers.forEach((s: Server) => socket.emit('server:join', { serverId: s._id }));

        const handleChannelMessage = (data: any) => {
            if (data.channelId === selectedChannelId) queryClient.invalidateQueries({ queryKey: ['channelMessages'] });
        };
        const handleDmMessage = () => {
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        };
        const handleTyping = (data: any) => {
            if (data.userId !== profile?._id) {
                setTypingUsers(prev => data.isTyping ? [...new Set([...prev, data.userId])] : prev.filter(id => id !== data.userId));
            }
        };
        const handleReaction = () => {
            queryClient.invalidateQueries({ queryKey: ['channelMessages'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
        };

        socket.on('channel:message', handleChannelMessage);
        socket.on('message:new', handleDmMessage);
        socket.on('channel:typing', handleTyping);
        socket.on('typing:update', handleTyping);
        socket.on('message:reaction:add', handleReaction);
        socket.on('message:reaction:remove', handleReaction);

        return () => {
            socket.off('channel:message', handleChannelMessage);
            socket.off('message:new', handleDmMessage);
            socket.off('channel:typing', handleTyping);
            socket.off('typing:update', handleTyping);
            socket.off('message:reaction:add', handleReaction);
            socket.off('message:reaction:remove', handleReaction);
        };
    }, [socket, servers, selectedChannelId, profile?._id, queryClient]);

    useEffect(() => {
        if (socket && selectedChannelId) {
            socket.emit('channel:join', { channelId: selectedChannelId });
            return () => { socket.emit('channel:leave', { channelId: selectedChannelId }); };
        }
    }, [socket, selectedChannelId]);

    // Handle search params (userId / conversationId)
    useEffect(() => {
        if (search.conversationId) {
            setSelectedConversationId(search.conversationId);
            setView('dms');
        } else if (search.userId && conversationsData && !convsLoading) {
            // Find existing DM with this user - check both userId AND _id for fallback
            const existingConv = conversations.find((c: Conversation) =>
                c.type === 'direct' && c.participants.some(p => p.userId === search.userId || p._id === search.userId)
            );

            if (existingConv) {
                setSelectedConversationId(existingConv._id);
                setView('dms');
            } else {
                // Create new conversation
                createConversation.mutate({ participantIds: [search.userId] }, {
                    onSuccess: (response: any) => {
                        const newConvId = response.data?.conversation?._id;
                        if (newConvId) {
                            setSelectedConversationId(newConvId);
                            setView('dms');
                        }
                    }
                });
            }
        }
    }, [search.userId, search.conversationId, conversationsData]);

    useEffect(() => {
        if (view === 'server' && selectedServerId && !selectedChannelId && channels.length > 0) {
            setSelectedChannelId(channels[0]._id);
        }
    }, [view, selectedServerId, selectedChannelId, channels]);

    // Only scroll to bottom on initial load, not on every message update
    const hasScrolledRef = useRef(false);
    useEffect(() => {
        if (currentMessages.length > 0 && !hasScrolledRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
            hasScrolledRef.current = true;
        }
    }, [currentMessages.length]);

    // Reset scroll flag when conversation changes
    useEffect(() => {
        hasScrolledRef.current = false;
    }, [selectedConversationId, selectedChannelId]);

    const handleSendMessage = useCallback(async () => {
        if (!messageInput.trim() && pendingFiles.length === 0) return;

        try {
            // Upload any pending media files
            let uploadedMedia: MediaAttachment[] = [];
            if (pendingFiles.length > 0) {
                toast.loading('Uploading media...', { id: 'upload-media' });
                uploadedMedia = await Promise.all(
                    pendingFiles.map(pf => uploadMedia(pf.file, pf.type))
                );
                toast.success('Media uploaded!', { id: 'upload-media' });
            }

            const messageContent = messageInput.trim() || (uploadedMedia.length > 0 ? '[Media]' : '');

            if (view === 'server' && selectedServerId && selectedChannelId) {
                sendChannelMessage.mutate({
                    serverId: selectedServerId,
                    channelId: selectedChannelId,
                    content: messageContent,
                    media: uploadedMedia,
                    replyTo: replyingTo?._id
                });
            } else if (selectedConversationId) {
                sendDmMessage.mutate({
                    conversationId: selectedConversationId,
                    content: messageContent,
                    media: uploadedMedia,
                    replyTo: replyingTo?._id
                });
            }

            setMessageInput('');
            setReplyingTo(null);
            setPendingFiles([]);
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message');
        }
    }, [messageInput, pendingFiles, view, selectedServerId, selectedChannelId, selectedConversationId, replyingTo, sendChannelMessage, sendDmMessage, uploadMedia]);

    const removeFile = (index: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Handle files selected from media picker
    const handleFilesSelected = useCallback((files: File[], type: 'image' | 'video' | 'file') => {
        const newPreviews: PreviewFile[] = files.map(file => ({
            file,
            previewUrl: (type === 'image' || type === 'video') ? URL.createObjectURL(file) : undefined,
            type,
        }));
        setPendingFiles(prev => [...prev, ...newPreviews]);
    }, []);


    const handleTyping = useCallback(() => {
        if (!socket) return;
        if (view === 'server' && selectedChannelId) socket.emit('channel:typing:start', { channelId: selectedChannelId });
        else if (selectedConversationId) socket.emit('typing:start', { conversationId: selectedConversationId });
    }, [socket, view, selectedChannelId, selectedConversationId]);

    const handleReaction = useCallback((messageId: string, emoji: string, hasReacted: boolean) => {
        if (hasReacted) removeReaction.mutate({ messageId, emoji });
        else addReaction.mutate({ messageId, emoji });
    }, [addReaction, removeReaction]);

    const handleCreateServer = useCallback(() => {
        if (!newServerName.trim()) return;
        createServer.mutate({ name: newServerName.trim(), isPublic: true }, {
            onSuccess: () => { setShowCreateServer(false); setNewServerName(''); }
        });
    }, [newServerName, createServer]);

    const handleJoinServer = useCallback(() => {
        if (!inviteCode.trim()) return;
        joinServer.mutate({ inviteCode: inviteCode.trim() }, {
            onSuccess: () => { setShowJoinServer(false); setInviteCode(''); }
        });
    }, [inviteCode, joinServer]);

    const handleSelectServer = (server: Server) => {
        setSelectedServerId(server._id);
        setView('server');
        setSelectedConversationId(null);
        setSelectedChannelId(null); // Clear selected channel to avoid 404 with new server
    };


    const formatTime = (date: Date | string) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="relative h-[calc(100vh-80px)] lg:h-screen w-full flex bg-transparent overflow-hidden font-sans">
            <CyberLuxeStyles />
            <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
            <div className="cyber-scanner" />

            <div className="flex-1 flex overflow-hidden w-full h-full max-w-full relative z-10">
                <div className="hidden lg:flex w-24 bg-[#0a0f18]/40 backdrop-blur-3xl flex-col items-center py-8 gap-6 relative z-20 border-r border-white/5 group/sidebar px-3">
                    {/* HUD Vertical Accent */}
                    <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent" />

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setView('dms'); setSelectedServerId(null); }}
                        className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all relative group overflow-hidden border",
                            view === 'dms'
                                ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/50 shadow-[0_0_20px_rgba(0,245,255,0.15)] scale-105"
                                : "bg-white/5 text-slate-500 hover:bg-white/10 hover:text-cyan-400 border-white/5 hover:border-cyan-500/20"
                        )}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <MessageCircle className="w-6 h-6 z-10 transition-transform group-hover:scale-110" />
                        {view === 'dms' && (
                            <motion.div
                                layoutId="active-server-indicator"
                                className="absolute -left-1 w-1.5 h-8 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(0,245,255,0.8)] z-20"
                            />
                        )}
                    </motion.button>

                    <div className="w-10 h-[1px] bg-white/10 my-1 relative">
                        <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-1 h-1 rounded-full bg-cyan-500/30" />
                        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-1 h-1 rounded-full bg-cyan-500/30" />
                    </div>

                    <ScrollArea className="w-full flex-1">
                        <div className="flex flex-col items-center gap-5 py-2">
                            {serversLoading ? (
                                <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="w-12 h-12 rounded-[1rem] bg-white/5 animate-pulse" />)}</div>
                            ) : (
                                servers.map((server: Server) => (
                                    <motion.button
                                        key={server._id}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleSelectServer(server)}
                                        className="relative group"
                                    >
                                        <div className={cn(
                                            "w-12 h-12 rounded-[1rem] flex items-center justify-center transition-all overflow-hidden border relative group",
                                            selectedServerId === server._id
                                                ? "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_25px_rgba(0,245,255,0.15)]"
                                                : "bg-white/5 border-white/5 hover:border-cyan-500/30"
                                        )}>
                                            {server.icon ? (
                                                <img src={server.icon} alt={server.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                            ) : (
                                                <span className="text-xs font-bold tracking-wider text-white group-hover:text-cyan-400 transition-colors">
                                                    {server.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                                </span>
                                            )}
                                            {selectedServerId === server._id && (
                                                <>
                                                    <motion.div
                                                        layoutId="active-server-indicator"
                                                        className="absolute -left-1 w-1 h-6 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(0,245,255,0.6)] z-20"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none" />
                                                </>
                                            )}
                                        </div>

                                        {/* Owner Badge */}
                                        {server.ownerId === profile?._id && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-md flex items-center justify-center shadow-lg border-2 border-[#161B22] z-30">
                                                <Shield className="w-2.5 h-2.5 text-black" />
                                            </div>
                                        )}

                                        {/* Delete Button (Owner Only - appears on hover) */}
                                        {server.ownerId === profile?._id && (
                                            <motion.button
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                whileHover={{ scale: 1.1 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Are you sure you want to delete "${server.name}"? This action cannot be undone.`)) {
                                                        api.delete(`/chat/servers/${server._id}`)
                                                            .then(() => {
                                                                toast.success('Server deleted successfully');
                                                                if (selectedServerId === server._id) {
                                                                    setSelectedServerId(null);
                                                                    setSelectedServer(null);
                                                                    setSelectedChannel(null);
                                                                }
                                                                queryClient.invalidateQueries({ queryKey: ['servers'] });
                                                            })
                                                            .catch((err) => toast.error(err.message || 'Failed to delete server'));
                                                    }
                                                }}
                                                className="absolute -bottom-1 -right-1 w-5 h-5 bg-rose-500/90 rounded-md items-center justify-center shadow-lg border-2 border-[#161B22] z-30 opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex"
                                            >
                                                <Trash2 className="w-2.5 h-2.5 text-white" />
                                            </motion.button>
                                        )}

                                        {/* Tooltip */}
                                        <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 glass-luxe-light rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-2xl">
                                            <span className="text-[10px] font-bold text-white tracking-widest uppercase">{server.name}</span>
                                        </div>
                                    </motion.button>
                                ))
                            )}
                        </div>
                    </ScrollArea>


                    {/* Bottom Actions */}
                    <div className="mt-auto flex flex-col items-center gap-3">
                        {/* Plus Button with Dropdown Menu */}
                        <div className="relative">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowPlusMenu(!showPlusMenu)}
                                className={cn(
                                    "w-12 h-12 rounded-[1rem] transition-all flex items-center justify-center border",
                                    showPlusMenu
                                        ? "bg-cyan-500 text-black border-cyan-400 shadow-lg shadow-cyan-500/20"
                                        : "bg-white/5 text-cyan-400 hover:bg-cyan-500/10 border-white/5"
                                )}
                            >
                                <Plus className={cn("w-5 h-5 transition-transform", showPlusMenu && "rotate-45")} />
                            </motion.button>

                            <AnimatePresence>
                                {showPlusMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: -10, scale: 0.95 }}
                                        className="absolute left-[calc(100%+16px)] bottom-0 w-64 glass-luxe rounded-2xl overflow-hidden z-50 p-2 border border-white/10"
                                    >
                                        <div className="p-2 space-y-1 relative z-10">
                                            <div className="px-3 py-2 mb-2">
                                                <span className="text-[10px] font-black text-cyan-400/80 uppercase tracking-widest">Create & Connect</span>
                                            </div>

                                            {[
                                                { icon: Server, label: 'Create Node', sub: 'Establish new server', onClick: () => { setShowPlusMenu(false); setShowCreateServer(true); } },
                                                { icon: Volume2, label: 'Voice Bridge', sub: 'Initialize audio relay', onClick: () => { setShowPlusMenu(false); setShowCreateRoomModal(true); } },
                                                { icon: LogIn, label: 'Sync Link', sub: 'Join existing bridge', onClick: () => { setShowPlusMenu(false); setShowJoinRoomModal(true); } }
                                            ].map((item, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={item.onClick}
                                                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-left group"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-white/5 group-hover:border-cyan-500/30 transition-all">
                                                        <item.icon className="w-4 h-4 text-cyan-400" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <p className="text-[11px] font-bold text-white tracking-wide">{item.label}</p>
                                                        <p className="text-[9px] text-slate-500 uppercase tracking-tighter">{item.sub}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setView('discover')}
                            className={cn(
                                "w-12 h-12 rounded-[1rem] flex items-center justify-center transition-all border",
                                view === 'discover'
                                    ? "bg-violet-500 text-black border-violet-400 shadow-[0_8px_25px_rgba(139,92,246,0.3)]"
                                    : "bg-white/5 text-slate-400 hover:bg-white/10 border-white/5"
                            )}
                        >
                            <Compass className="w-5 h-5" />
                        </motion.button>
                    </div>
                </div>

                {/* Side Navigation (DMs / Channels) */}
                <div className="hidden lg:flex w-[280px] bg-slate-900/60 backdrop-blur-xl flex-col border-r border-white/5 z-10">
                    {view === 'dms' ? (
                        <div className="flex flex-col h-full">
                            <div className="p-5 border-b border-white/5">
                                <h2 className="text-sm font-bold text-white tracking-wide mb-4 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-cyan-400" />
                                    Direct Messages
                                </h2>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <Search className="w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                                    </div>
                                    <Input
                                        placeholder="Search..."
                                        className="pl-10 h-10 bg-white/5 border-white/10 text-sm rounded-xl focus:border-cyan-500/40 focus:ring-0 placeholder:text-slate-600 transition-all"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <ScrollArea className="flex-1 px-3">
                                <div className="space-y-1">
                                    {/* Show search results when searching */}
                                    {searchQuery.length >= 2 ? (
                                        searchLoading ? (
                                            <div className="space-y-4 px-3 py-4">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />)}</div>
                                        ) : (searchUsersData as any)?.data?.users?.length > 0 ? (
                                            <div className="space-y-2 py-2">
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-3 mb-2">Search Results</p>
                                                {(searchUsersData as any).data.users.map((user: any) => {
                                                    const targetId = String(user.userId || user._id);
                                                    const isCreatingConv = createConversation.isPending;

                                                    return (
                                                        <motion.button
                                                            key={user._id}
                                                            whileHover={{ x: 4, scale: 1.02 }}
                                                            disabled={isCreatingConv}
                                                            onClick={() => {
                                                                // Start chat with this user
                                                                const existingConv = conversations.find((c: Conversation) =>
                                                                    c.type === 'direct' && c.participants.some(p =>
                                                                        String(p.userId) === targetId || String(p._id) === targetId
                                                                    )
                                                                );

                                                                if (existingConv) {
                                                                    setSelectedConversationId(existingConv._id);
                                                                    setSearchQuery('');
                                                                    toast.success(`Opening chat with ${user.name} `);
                                                                } else {
                                                                    toast.loading('Starting conversation...', { id: 'create-conv' });
                                                                    createConversation.mutate({ participantIds: [targetId] }, {
                                                                        onSuccess: (response: any) => {
                                                                            const newConvId = response.data?.conversation?._id;
                                                                            if (newConvId) {
                                                                                setSelectedConversationId(newConvId);
                                                                                setSearchQuery('');
                                                                                toast.success(`Started chat with ${user.name} `, { id: 'create-conv' });
                                                                            } else {
                                                                                toast.error('Failed to start conversation', { id: 'create-conv' });
                                                                            }
                                                                        },
                                                                        onError: (error: any) => {
                                                                            console.error('Failed to create conversation:', error);
                                                                            toast.error(error?.message || 'Failed to start conversation', { id: 'create-conv' });
                                                                        }
                                                                    });
                                                                }
                                                            }}
                                                            className={cn(
                                                                "w-full flex items-center gap-4 p-4 rounded-3xl transition-all hover:bg-white/5 border border-transparent",
                                                                isCreatingConv && "opacity-50 cursor-not-allowed"
                                                            )}
                                                        >
                                                            <Avatar className="w-10 h-10 border border-white/10 rounded-xl">
                                                                <AvatarImage src={user.avatar} />
                                                                <AvatarFallback className="bg-slate-800 text-sm font-black uppercase">{user.name?.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 text-left min-w-0">
                                                                <p className="text-sm font-bold text-white truncate">{user.name}</p>
                                                                <p className="text-xs text-slate-500">@{user.handle}</p>
                                                            </div>
                                                            {isCreatingConv ? (
                                                                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                                            ) : (
                                                                <MessageCircle className="w-4 h-4 text-primary" />
                                                            )}
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-10">
                                                <p className="text-sm text-slate-500">No users found</p>
                                            </div>
                                        )
                                    ) : convsLoading ? (
                                        <div className="space-y-4 px-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 glass-luxe-light rounded-2xl animate-pulse" />)}</div>
                                    ) : conversations.length === 0 ? (
                                        <div className="text-center py-24 px-8 relative overflow-hidden group">
                                            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
                                            <div className="w-20 h-20 glass-luxe rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10 group-hover:scale-105 transition-all duration-500 shadow-2xl relative">
                                                <div className="absolute inset-0 bg-cyan-500/5 animate-pulse rounded-3xl" />
                                                <MessageCircle className="w-10 h-10 text-cyan-500 group-hover:text-cyan-400 transition-colors" />
                                            </div>
                                            <p className="text-sm font-black text-white italic tracking-tighter uppercase mr-[-0.1em] transition-all group-hover:tracking-widest">No Active Nodes</p>
                                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-3 opacity-60">Initialize link to established bridge</p>
                                        </div>
                                    ) : (
                                        conversations.map((conv: Conversation) => {
                                            const other = conv.participants[0];
                                            const name = conv.type === 'group' ? conv.groupName : other?.name;
                                            const isActive = selectedConversationId === conv._id;
                                            return (
                                                <motion.button
                                                    key={conv._id}
                                                    whileHover={{ x: 6, backgroundColor: "rgba(255,255,255,0.03)" }}
                                                    onClick={() => { setSelectedConversationId(conv._id); setView('dms'); }}
                                                    className={cn(
                                                        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all relative group overflow-hidden border mb-2",
                                                        isActive
                                                            ? "glass-luxe border-cyan-500/30 shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
                                                            : "bg-transparent border-transparent hover:border-white/5"
                                                    )}
                                                >
                                                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-cyan-400 shadow-[0_0_15px_rgba(0,245,255,0.8)]" />}
                                                    <div className="relative">
                                                        <div className={cn(
                                                            "w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden transition-all duration-500 p-0.5 border relative z-10",
                                                            isActive ? "border-cyan-500/50 shadow-[0_0_15px_rgba(0,245,255,0.2)]" : "border-white/10"
                                                        )}>
                                                            <Avatar className="w-full h-full rounded-lg">
                                                                <AvatarImage src={other?.avatar} className="object-cover" />
                                                                <AvatarFallback className="glass-luxe text-xs font-bold text-white/50">{name?.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                        </div>
                                                        <div className={cn(
                                                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#030508] transition-all z-20",
                                                            isActive ? "bg-cyan-400 shadow-[0_0_8px_rgba(0,245,255,1)]" : "bg-slate-700"
                                                        )} />
                                                    </div>

                                                    <div className="flex-1 text-left min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className={cn(
                                                                "text-[13px] font-black italic uppercase tracking-tight transition-colors",
                                                                isActive ? "text-cyan-400 text-glow-cyan" : "text-slate-300"
                                                            )}>
                                                                {name}
                                                            </p>
                                                            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest opacity-40">NODE_0{conversations.indexOf(conv)}</span>
                                                        </div>
                                                        {conv.lastMessage && (
                                                            <p className="text-[10px] text-slate-500 truncate font-semibold opacity-80 tech-font">
                                                                {">"} {conv.lastMessage.content}
                                                            </p>
                                                        )}
                                                    </div>
                                                </motion.button>
                                            );
                                        })
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : view === 'server' && selectedServer ? (
                        <div className="flex flex-col h-full">
                            <div className="px-6 py-8 border-b border-white/5 glass-luxe">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    className="w-full flex items-center justify-between p-4 glass-luxe-light rounded-2xl border border-white/5 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(0,245,255,0.8)]" />
                                        <h2 className="font-bold text-white text-sm uppercase tracking-[0.15em] truncate">
                                            {selectedServer.name}
                                        </h2>
                                    </div>
                                    <Terminal className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                                </motion.button>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-4 space-y-10">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between px-3 mb-6">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Audio Fragments</p>
                                            <div className="p-1.5 glass-luxe-light rounded-lg cursor-pointer hover:text-cyan-400 transition-all">
                                                <Cpu className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                        {channels.filter((c: Channel) => c.type !== 'voice').map((ch: Channel) => (
                                            <motion.button
                                                key={ch._id}
                                                whileHover={{ x: 4 }}
                                                onClick={() => setSelectedChannelId(ch._id)}
                                                className={cn(
                                                    "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all relative group overflow-hidden border",
                                                    selectedChannelId === ch._id
                                                        ? "glass-luxe border-cyan-500/30 text-cyan-400"
                                                        : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
                                                )}
                                            >
                                                <span className="font-bold tracking-widest text-[11px] uppercase truncate">{ch.name}</span>
                                                {selectedChannelId === ch._id && (
                                                    <div className="ml-auto w-1 h-4 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(0,245,255,0.6)]" />
                                                )}
                                            </motion.button>
                                        ))}
                                    </div>
                                    {channels.some((c: Channel) => c.type === 'voice') && (
                                        <div className="space-y-2">
                                            <p className="px-3 mb-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Tactical Voice</p>
                                            {channels.filter((c: Channel) => c.type === 'voice').map((ch: Channel) => {
                                                const isActive = roomId === ch._id;
                                                return (
                                                    <motion.button
                                                        key={ch._id}
                                                        whileHover={{ x: 4 }}
                                                        onClick={() => {
                                                            setSelectedChannelId(ch._id);
                                                            joinRoom(ch._id);
                                                        }}
                                                        className={cn(
                                                            "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all relative group overflow-hidden border",
                                                            isActive || selectedChannelId === ch._id
                                                                ? "glass-luxe border-cyan-500/30 text-cyan-400"
                                                                : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
                                                        )}
                                                    >
                                                        <Radio className={cn("w-4 h-4", isActive ? "text-cyan-400 animate-pulse" : "text-slate-600")} />
                                                        <span className="font-bold tracking-widest text-[11px] uppercase truncate">{ch.name}</span>
                                                        {isActive && (
                                                            <div className="ml-auto w-2 h-2 rounded-full bg-cyan-400 animate-ping shadow-[0_0_10px_rgba(0,245,255,0.8)]" />
                                                        )}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                            <div className="mt-auto shrink-0 p-4 glass-luxe border-t border-white/5 relative z-20">
                                <div className="flex items-center gap-4 p-4 glass-luxe-light rounded-2xl border border-white/5">
                                    <div className="relative">
                                        <Avatar className="w-10 h-10 border border-white/10 rounded-xl">
                                            <AvatarImage src={profile?.avatar} />
                                            <AvatarFallback className="glass-luxe text-xs font-bold">{profile?.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-cyan-400 rounded-full border-2 border-[#0F1117] shadow-[0_0_10px_rgba(0,245,255,0.4)]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{profile?.name}</p>
                                        <p className="text-[10px] text-cyan-400/80 font-bold uppercase tracking-widest">Active Link</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-xl text-slate-500 hover:bg-white/10"><Settings className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : view === 'discover' ? (
                        <div className="flex flex-col h-full uppercase tracking-tighter">
                            <div className="p-6">
                                <h2 className="text-2xl font-black text-white italic tracking-tighter mb-2 flex items-center gap-3">
                                    <Compass className="w-6 h-6 text-cyan-400" />
                                    DISCOVER
                                </h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-6">Scan emerging networks</p>
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <Input
                                        placeholder="Scan protocols..."
                                        className="pl-10 h-11 bg-white/5 border-white/10 text-sm rounded-2xl focus:border-cyan-500/30 transition-all font-medium"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            <ScrollArea className="flex-1 px-3">
                                <div className="space-y-3">
                                    <Button variant="ghost" className="w-full justify-start h-14 text-slate-400 hover:text-white bg-white/5 border border-dashed border-white/10 rounded-2xl" onClick={() => setShowJoinServer(true)}>
                                        <Plus className="w-5 h-5 mr-3 text-cyan-400" />
                                        <span className="text-xs font-black uppercase tracking-widest">Inject Invite Code</span>
                                    </Button>
                                    {discoverServers.map((s: Server) => (
                                        <motion.div
                                            key={s._id}
                                            whileHover={{ scale: 1.02, y: -2 }}
                                            onClick={() => joinServer.mutate({ serverId: s._id })}
                                            className="p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-cyan-500/30 cursor-pointer transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center text-white font-black italic text-lg shadow-inner">
                                                    {s.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-white uppercase italic truncate">{s.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">{s.memberCount} OPERATIVES</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : null}
                </div>

                {/* Main Chat Interface */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-950/40 backdrop-blur-xl relative z-10 overflow-hidden">
                    {/* Header */}
                    <div className="h-14 lg:h-24 px-3 sm:px-6 lg:px-10 flex items-center justify-between border-b border-white/10 glass-luxe relative overflow-hidden group shrink-0">
                        {/* Header Background Signal Animation */}
                        <div className="absolute inset-0 z-0 opacity-20 bg-[radial-gradient(circle_at_50%_0%,rgba(0,245,255,0.1),transparent)] group-hover:opacity-30 transition-opacity" />

                        <div className="flex items-center gap-6 lg:gap-10 z-10">
                            {/* Mobile menu toggle */}
                            <button
                                onClick={() => setShowMobileSidebar(true)}
                                className="lg:hidden w-10 h-10 rounded-xl glass-luxe-light border border-white/10 flex items-center justify-center shadow-lg shrink-0"
                            >
                                <MessageCircle className="w-6 h-6 text-cyan-400" />
                            </button>

                            {view === 'server' && selectedChannel ? (
                                <div className="flex items-center gap-3 lg:gap-6 min-w-0">
                                    <div className="hidden sm:flex w-10 lg:w-12 h-10 lg:h-12 rounded-xl lg:rounded-2xl glass-luxe-light border border-cyan-500/30 items-center justify-center shadow-[0_0_20px_rgba(0,245,255,0.1)] relative group/icon shrink-0">
                                        <div className="absolute inset-0 bg-cyan-400/5 animate-pulse rounded-2xl" />
                                        <Cpu className="w-6 h-6 text-cyan-400 relative z-10" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2 lg:gap-4">
                                            <h2 className="font-black text-white text-base lg:text-xl italic uppercase tracking-tight glitch-hover cursor-default truncate">
                                                {selectedChannel.name}
                                            </h2>
                                            <div className="hidden sm:flex px-2 lg:px-3 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30">
                                                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest tech-font">P2P_LINK_SECURE</span>
                                            </div>
                                        </div>
                                        <div className="hidden lg:flex items-center gap-4 mt-2">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-60 tech-font">LATENCY: 14MS</span>
                                            <div className="w-1 h-1 rounded-full bg-slate-700" />
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-60 tech-font">UPTIME: 99.9%</span>
                                        </div>
                                    </div>
                                </div>
                            ) : selectedConversation ? (
                                <div className="flex items-center gap-3 lg:gap-6 min-w-0">
                                    <div className="relative shrink-0">
                                        <div className="absolute -inset-1 bg-cyan-400/20 blur-md rounded-xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Avatar className="w-10 h-10 lg:w-14 lg:h-14 border-2 border-cyan-500/30 rounded-xl lg:rounded-2xl shadow-2xl relative z-10">
                                            <AvatarImage src={selectedConversation.participants[0]?.avatar} />
                                            <AvatarFallback className="glass-luxe text-white text-lg font-black uppercase italic">
                                                {selectedConversation.participants[0]?.name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full border-2 border-[#030508] shadow-[0_0_15px_rgba(0,245,255,1)] z-20 animate-pulse" />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-4">
                                            <h2 className="font-black text-white text-xl italic uppercase tracking-tight glitch-hover cursor-default">
                                                {selectedConversation.type === 'group' ? selectedConversation.groupName : selectedConversation.participants[0]?.name}
                                            </h2>
                                            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(0,245,255,1)] animate-pulse" />
                                        </div>
                                        <div className="hidden sm:flex items-center gap-4 mt-2">
                                            <span className="text-[10px] text-cyan-400/60 font-black uppercase tracking-[0.2em] tech-font">ENCRYPTED_STREAM_ACTIVE</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-5 opacity-40 group-hover:opacity-60 transition-opacity">
                                    <Activity className="w-8 h-8 text-slate-500 animate-pulse" />
                                    <div>
                                        <p className="font-black text-slate-400 tracking-[0.3em] text-[10px] uppercase italic">System State</p>
                                        <p className="font-black text-slate-500 tracking-[0.1em] text-xs uppercase italic mt-1">Standby: Awaiting Node Target</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 lg:gap-6 z-10">
                            {selectedConversation && selectedConversation.type === 'direct' && (
                                <div className="flex gap-2 lg:border-r lg:border-white/10 lg:pr-6 lg:mr-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            const otherId = selectedConversation.participants[0]?._id;
                                            if (otherId) initiateCall(otherId, 'audio');
                                        }}
                                        className="w-10 h-10 rounded-xl glass-luxe-light text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/20"
                                    >
                                        <Phone className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            const otherId = selectedConversation.participants[0]?._id;
                                            if (otherId) initiateCall(otherId, 'video');
                                        }}
                                        className="w-10 h-10 rounded-xl glass-luxe-light text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/20"
                                    >
                                        <Video className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}

                            <div className="flex gap-2">
                                {view === 'server' && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setShowMembers(!showMembers)}
                                        className={cn(
                                            "w-10 h-10 flex items-center justify-center rounded-xl transition-all border",
                                            showMembers
                                                ? "glass-luxe border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(0,245,255,0.1)]"
                                                : "glass-luxe-light text-slate-500 border-white/5 hover:border-white/10 shadow-lg"
                                        )}
                                    >
                                        <Users className="w-4 h-4" />
                                    </motion.button>
                                )}
                                {view === 'server' && selectedServer && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        onClick={() => {
                                            const invite = selectedServer.inviteCode || selectedServer._id;
                                            navigator.clipboard.writeText(invite);
                                            toast.success(`Invite code ${invite} copied!`);
                                        }}
                                        className="h-10 px-5 gap-2 glass-luxe-light text-slate-300 hover:text-cyan-400 rounded-xl border border-white/5 hover:border-cyan-500/20 transition-all font-bold text-[11px] uppercase tracking-widest"
                                    >
                                        <Share2 className="w-3.5 h-3.5" />
                                        Share
                                    </motion.button>
                                )}
                                <Button variant="ghost" size="icon" className="hidden lg:flex w-10 h-10 glass-luxe-light text-slate-500 hover:text-cyan-400 rounded-xl border border-white/5 hover:border-cyan-500/20 shadow-lg"><Pin className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="w-10 h-10 glass-luxe-light text-slate-500 hover:text-cyan-400 rounded-xl border border-white/5 hover:border-cyan-500/20 shadow-lg"><MoreVertical className="w-4 h-4" /></Button>
                            </div>

                            <div className="hidden lg:block relative w-56 ml-2 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                                <Input
                                    placeholder="Search logs..."
                                    className="h-10 pl-10 glass-luxe-light border-white/5 rounded-xl text-[11px] font-bold uppercase tracking-wider focus:border-cyan-500/30 focus:ring-0 transition-all placeholder:text-slate-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Main Area Wrapper */}
                    <div className="flex-1 flex flex-row min-h-0 min-w-0 relative overflow-hidden" >
                        {/* Main Chat Content */}
                        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#020617] relative overflow-hidden" >
                            {view === 'server' && selectedChannel?.type === 'voice' && isInRoom && (roomId === selectedChannelId || roomId === selectedChannel?._id) ? (
                                <div className="flex-1 flex flex-col bg-slate-900/30 relative">
                                    <ScrollArea className="flex-1 h-full">
                                        <div className="p-8 h-full">
                                            <div className="max-w-7xl mx-auto h-full">
                                                <ParticipantsGrid />
                                            </div>
                                        </div>
                                    </ScrollArea>

                                    {/* Premium Voice Controls */}
                                    <div className="h-20 lg:h-28 bg-black/80 backdrop-blur-3xl border-t border-emerald-500/20 flex items-center justify-center gap-4 lg:gap-8 px-4 lg:px-8 relative z-20 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                                        {/* Control panel background effects */}
                                        <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />

                                        <motion.button
                                            whileHover={{ scale: 1.1, y: -2 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={toggleMute}
                                            className={cn(
                                                "w-12 h-12 lg:w-16 lg:h-16 rounded-xl flex flex-col items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.3)] border relative overflow-hidden group",
                                                isMuted
                                                    ? "bg-rose-500/10 text-rose-500 border-rose-500/40 shadow-rose-500/5"
                                                    : "bg-emerald-500/5 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/50"
                                            )}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                                            <span className="text-[7px] mt-1 font-black hacker-label">{isMuted ? "MIC_OFF" : "MIC_ON"}</span>
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.1, y: -2 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={toggleVideo}
                                            className={cn(
                                                "w-12 h-12 lg:w-16 lg:h-16 rounded-xl flex flex-col items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.3)] border relative overflow-hidden group",
                                                isVideoOff
                                                    ? "bg-rose-500/10 text-rose-500 border-rose-500/40 shadow-rose-500/5"
                                                    : "bg-emerald-500/5 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/50"
                                            )}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                                            <span className="text-[7px] mt-1 font-black hacker-label">{isVideoOff ? "CAM_OFF" : "CAM_ON"}</span>
                                        </motion.button>

                                        <motion.button
                                            whileHover={{ scale: 1.1, y: -2 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                                            className={cn(
                                                "w-12 h-12 lg:w-16 lg:h-16 rounded-xl flex flex-col items-center justify-center transition-all shadow-[0_0_15_rgb(0,0,0,0.3)] border relative overflow-hidden group",
                                                isScreenSharing
                                                    ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/50 shadow-emerald-500/10"
                                                    : "bg-emerald-500/5 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/50"
                                            )}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                                            <span className="text-[7px] mt-1 font-black hacker-label">{isScreenSharing ? "STREAMING" : "SHARE_SCR"}</span>
                                        </motion.button>

                                        <div className="w-px h-12 bg-emerald-500/10 mx-2 shadow-[0_0_10px_rgba(16,185,129,0.1)]" />

                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 90 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={leaveRoom}
                                            className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl bg-black text-rose-500 flex flex-col items-center justify-center shadow-lg border border-rose-500/40 hover:bg-rose-500/20 transition-all group"
                                        >
                                            <LogOut className="w-6 h-6" />
                                            <span className="text-[7px] mt-1 font-black hacker-label">TERMINATE</span>
                                        </motion.button>
                                    </div>
                                </div>
                            ) : (view === 'server' && selectedChannelId) || (view === 'dms' && selectedConversationId) ? (
                                <>
                                    <ScrollArea className="flex-1 h-full">
                                        <div className="p-3 sm:p-6 lg:p-8 space-y-1 min-h-full flex flex-col justify-end">
                                            {messagesLoading ? (
                                                <div className="space-y-8 py-10 flex-1">
                                                    {[1, 2, 3].map(i => (
                                                        <div key={i} className="flex gap-4 animate-pulse">
                                                            <div className="w-12 h-12 rounded-2xl glass-luxe-light flex-shrink-0" />
                                                            <div className="flex-1 space-y-3">
                                                                <div className="h-3 bg-white/5 rounded w-32" />
                                                                <div className="h-16 bg-white/5 rounded-3xl w-2/3" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : currentMessages.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-20 select-none flex-1">
                                                    <motion.div
                                                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                                                        animate={{ scale: 1, opacity: 1, y: 0 }}
                                                        className="relative mb-10"
                                                    >
                                                        <motion.div
                                                            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                                                            transition={{ duration: 3, repeat: Infinity }}
                                                            className="absolute inset-0 w-28 h-28 rounded-[2.5rem] bg-cyan-500/20 blur-3xl"
                                                        />
                                                        <div className="w-28 h-28 rounded-[2.5rem] glass-luxe border border-white/10 flex items-center justify-center relative shadow-2xl">
                                                            <MessageCircle className="w-12 h-12 text-slate-500" />
                                                        </div>
                                                    </motion.div>
                                                    <h3 className="font-bold text-white text-2xl tracking-tight mb-3">No messages yet</h3>
                                                    <p className="text-sm text-slate-500 text-center max-w-[320px] font-medium leading-relaxed">Select a link or start a new conversation to begin encryption protocol.</p>
                                                </div>
                                            ) : (
                                                currentMessages.map((msg: Message, idx: number) => {
                                                    // More robust isMe check - include Supabase user.id
                                                    const myIds = [user?.id, profile?._id, profile?.userId].filter(Boolean);
                                                    const senderIds = [msg.senderId, msg.sender?.userId].filter(Boolean);
                                                    const isMe = myIds.some(myId => senderIds.includes(myId));

                                                    const prevMsg = currentMessages[idx - 1];
                                                    const showAvatar = !prevMsg || (prevMsg.senderId !== msg.senderId && prevMsg.sender?.userId !== msg.sender?.userId);

                                                    return (
                                                        <motion.div
                                                            key={msg._id}
                                                            initial={{ opacity: 0, x: isMe ? 20 : -20, scale: 0.95 }}
                                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                                            transition={{
                                                                type: "spring",
                                                                stiffness: 300,
                                                                damping: 30,
                                                                delay: Math.min(idx * 0.01, 0.3)
                                                            }}
                                                            className={cn(
                                                                "group relative flex gap-3 transition-all py-2 px-3 sm:px-6 max-w-full",
                                                                isMe ? "flex-row-reverse" : "flex-row",
                                                                selectedMessageId === msg._id && "bg-cyan-500/5"
                                                            )}
                                                            onMouseEnter={() => setSelectedMessageId(msg._id)}
                                                            onMouseLeave={() => setSelectedMessageId(null)}
                                                        >
                                                            {/* Avatar - Always show */}
                                                            <div className="shrink-0 pt-1">
                                                                <div className={cn(
                                                                    "p-0.5 rounded-xl border transition-all duration-500",
                                                                    isMe ? "border-cyan-500/30" : "border-white/10"
                                                                )}>
                                                                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg">
                                                                        <AvatarImage src={isMe ? profile?.avatar : msg.sender?.avatar} className="object-cover" />
                                                                        <AvatarFallback className="glass-luxe text-white/50 text-xs font-black uppercase tracking-tighter">
                                                                            {(isMe ? profile?.name : msg.sender?.name)?.charAt(0) || '?'}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                </div>
                                                            </div>

                                                            <div className={cn("flex flex-col gap-1 max-w-[80%] sm:max-w-[75%]", isMe && "items-end")}>
                                                                {/* Name and Time - Always show */}
                                                                <div className={cn("flex items-center gap-2 px-1", isMe ? "flex-row-reverse" : "flex-row")}>
                                                                    <span className="text-[10px] sm:text-[11px] font-bold text-white/80">
                                                                        {isMe ? 'You' : (msg.sender?.name || 'User')}
                                                                    </span>
                                                                    <span className="text-[9px] text-slate-500 font-medium">
                                                                        {formatTime(msg.createdAt)}
                                                                    </span>
                                                                </div>


                                                                <div className={cn(
                                                                    "relative px-5 py-4 rounded-2xl text-[14px] leading-relaxed transition-all duration-500 border group/bubble",
                                                                    isMe
                                                                        ? "bg-[#060a16]/80 text-cyan-50 border-cyan-500/20 rounded-tr-none shadow-[0_4px_20px_rgba(0,245,255,0.03)]"
                                                                        : "bg-slate-900/60 text-slate-200 border-white/5 rounded-tl-none backdrop-blur-md"
                                                                )}>
                                                                    {/* Background Glow for Own Messages */}
                                                                    {isMe && <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-transparent opacity-0 group-hover/bubble:opacity-100 transition-opacity rounded-2xl" />}

                                                                    {msg.replyTo && (
                                                                        <div className="mb-4 pb-3 border-b border-white/10 flex items-center gap-3 opacity-60 text-[10px] font-bold text-cyan-400/80 tech-font italic">
                                                                            <Reply className="w-3.5 h-3.5" />
                                                                            <span className="truncate">RES_LINK_ID: {msg.replyTo.sender?.name}</span>
                                                                        </div>
                                                                    )}

                                                                    <div className="selection:bg-cyan-500/40 relative z-10 font-medium">
                                                                        {msg.content}
                                                                    </div>

                                                                    {msg.media && msg.media.length > 0 && (
                                                                        <div className="mt-4 p-1.5 rounded-xl overflow-hidden border border-white/10 glass-luxe-light shadow-inner">
                                                                            <MessageMedia media={msg.media as any} />
                                                                        </div>
                                                                    )}

                                                                    {/* Status Marker for Own Messages */}
                                                                    {isMe && (
                                                                        <div className="absolute -left-6 bottom-2 opacity-0 group-hover/bubble:opacity-100 transition-all flex flex-col gap-1 items-center">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,245,255,0.8)]" />
                                                                            <span className="text-[6px] font-black text-cyan-400 uppercase tracking-tighter rotate-180" style={{ writingMode: 'vertical-rl' }}>SECURE</span>
                                                                        </div>
                                                                    )}

                                                                    {/* Reactions Panel */}
                                                                    {msg.reactions && msg.reactions.length > 0 && (
                                                                        <div className={cn("flex flex-wrap gap-2 mt-4", isMe ? "justify-end" : "justify-start")}>
                                                                            {msg.reactions.map((r) => (
                                                                                <motion.button
                                                                                    key={r.emoji}
                                                                                    whileHover={{ scale: 1.1, y: -2 }}
                                                                                    onClick={() => handleReaction(msg._id, r.emoji, r.users.includes(profile?._id || ''))}
                                                                                    className={cn(
                                                                                        "px-3 py-1.5 rounded-xl text-[10px] border transition-all flex items-center gap-2 font-black tech-font shadow-lg",
                                                                                        r.users.includes(profile?._id || '')
                                                                                            ? "bg-cyan-500/10 border-cyan-400/50 text-cyan-400 shadow-[0_0_15px_rgba(0,245,255,0.2)]"
                                                                                            : "glass-luxe-light border-white/5 text-slate-500 hover:text-white"
                                                                                    )}
                                                                                >
                                                                                    <span className="text-sm">{r.emoji}</span>
                                                                                    <span className="opacity-60">{r.users.length.toString().padStart(2, '0')}</span>
                                                                                </motion.button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })
                                            )}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    </ScrollArea>

                                    {/* Message Input Area */}
                                    <div className="px-3 sm:px-6 lg:px-8 pb-4 lg:pb-10 shrink-0 relative z-10">
                                        <div className="glass-luxe border border-cyan-500/10 rounded-2xl lg:rounded-3xl p-3 sm:p-4 lg:p-5 shadow-[0_20px_80px_rgba(0,0,0,0.8)] relative group focus-within:border-cyan-500/40 transition-all duration-700 overflow-hidden">
                                            {/* Decorative Corner Accents */}
                                            <div className="absolute top-0 left-0 w-8 h-[1px] bg-cyan-500/30" />
                                            <div className="absolute top-0 left-0 w-[1px] h-8 bg-cyan-500/30" />
                                            <div className="absolute bottom-0 right-0 w-8 h-[1px] bg-cyan-500/30" />
                                            <div className="absolute bottom-0 right-0 w-[1px] h-8 bg-cyan-500/30" />

                                            {replyingTo && (
                                                <div className="absolute bottom-full left-4 right-4 mb-6 px-6 py-4 glass-luxe border border-cyan-500/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-bottom-6 z-20 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                                                            <Reply className="w-5 h-5 text-cyan-400" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest tech-font">REFERENCE_NODE: {replyingTo.sender?.name}</span>
                                                            <span className="text-[13px] text-slate-300 font-medium truncate max-w-[500px] mt-0.5 italic">{replyingTo.content}</span>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl hover:bg-white/10 text-slate-500 hover:text-rose-500" onClick={() => setReplyingTo(null)}><X className="w-5 h-5" /></Button>
                                                </div>
                                            )}

                                            {typingUsers.length > 0 && (
                                                <div className="absolute -top-10 left-10 flex items-center gap-4 px-4 py-1.5 glass-luxe-light rounded-full border border-cyan-500/10">
                                                    <div className="flex gap-2">
                                                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s] shadow-[0_0_10px_rgba(0,245,255,0.8)]"></span>
                                                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s] shadow-[0_0_10px_rgba(0,245,255,0.8)]"></span>
                                                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(0,245,255,0.8)]"></span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.25em] tech-font">PEER_SYNCING...</span>
                                                </div>
                                            )}

                                            {pendingFiles.length > 0 && <div className="mb-4"><MediaPreview files={pendingFiles} onRemove={removeFile} onClear={() => setPendingFiles([])} /></div>}

                                            {/* Hidden file input for media upload */}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*,video/*"
                                                multiple
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />

                                            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 px-1 sm:px-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl glass-luxe-light text-slate-500 hover:text-cyan-400 border border-white/5 hover:border-cyan-500/30 transition-all flex items-center justify-center shrink-0 shadow-lg"
                                                >
                                                    <Plus className="w-6 h-6" />
                                                </motion.button>

                                                <div className="flex-1 min-h-[48px] lg:min-h-[60px] flex flex-col justify-center relative">
                                                    <Input
                                                        value={messageInput}
                                                        onChange={(e) => { setMessageInput(e.target.value); handleTyping(); }}
                                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                                        placeholder="Type message..."
                                                        className="bg-transparent border-0 focus-visible:ring-0 px-0 h-auto text-white text-sm lg:text-[15px] font-medium placeholder:text-slate-700 tech-font tracking-wide"
                                                    />
                                                    {/* Technical Loading Line Accent */}
                                                    <div className="absolute -bottom-2 left-0 right-0 h-[1px] bg-white/5 overflow-hidden">
                                                        <motion.div
                                                            animate={{ left: ['-100%', '100%'] }}
                                                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                                            className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="hidden sm:flex items-center gap-4 border-l border-white/10 pl-4 lg:pl-6 h-10">
                                                    {isRecordingVoice ? (
                                                        <motion.div
                                                            initial={{ scale: 0.9, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            className="flex items-center gap-4 px-6 py-2 glass-luxe border border-rose-500/40 rounded-2xl shadow-[0_0_20px_rgba(244,63,94,0.1)]"
                                                        >
                                                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shadow-[0_0_12px_rgba(244,63,94,1)]" />
                                                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest tech-font">UPLINK_REC</span>
                                                            <button onClick={() => setIsRecordingVoice(false)} className="text-rose-500/40 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                                                        </motion.div>
                                                    ) : (
                                                        <motion.button
                                                            whileHover={{ scale: 1.1, color: "#F43F5E" }}
                                                            onClick={() => setIsRecordingVoice(true)}
                                                            className="w-10 h-10 flex items-center justify-center text-slate-500 transition-all hover:text-rose-400"
                                                        >
                                                            <Mic className="w-5 h-5" />
                                                        </motion.button>
                                                    )}

                                                    <motion.button
                                                        whileHover={{ scale: 1.1, color: "#00F5FF" }}
                                                        className="w-10 h-10 flex items-center justify-center text-slate-500 transition-all opacity-60 hover:opacity-100"
                                                    >
                                                        <Smile className="w-5 h-5" />
                                                    </motion.button>
                                                </div>

                                                <motion.button
                                                    whileHover={{ scale: 1.1, x: 2 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={handleSendMessage}
                                                    disabled={((!messageInput.trim() && pendingFiles.length === 0) || sendChannelMessage.isPending || sendDmMessage.isPending || isUploading)}
                                                    className={cn(
                                                        "w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center transition-all duration-700 shadow-2xl flex-shrink-0 relative overflow-hidden group/send border",
                                                        (messageInput.trim() || pendingFiles.length > 0)
                                                            ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_40px_rgba(0,245,255,0.2)]"
                                                            : "bg-white/5 border-white/5 text-slate-700 cursor-not-allowed"
                                                    )}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-transparent opacity-0 group-hover/send:opacity-100 transition-opacity" />
                                                    <Send className="w-6 h-6 relative z-10 transition-transform group-hover/send:translate-x-1 group-hover/send:-translate-y-1" />
                                                </motion.button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 text-center select-none animate-in fade-in zoom-in duration-1000 relative">
                                    <div className="relative mb-10 lg:mb-24">
                                        <div className="absolute inset-0 bg-cyan-500/5 blur-[100px] lg:blur-[180px] rounded-full scale-150 animate-pulse" />

                                        {/* Holographic Core Placeholder */}
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 2, ease: "easeOut" }}
                                            className="w-32 h-32 lg:w-56 lg:h-56 rounded-[2rem] lg:rounded-[4rem] glass-luxe border border-cyan-500/10 flex items-center justify-center relative shadow-[0_30px_60px_rgba(0,0,0,0.6)] lg:shadow-[0_60px_120px_rgba(0,0,0,0.8)] group overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-violet-500/10" />
                                            <div className="absolute inset-0 cyber-grid opacity-10" />
                                            <div className="relative z-10">
                                                <div className="w-14 h-14 lg:w-24 lg:h-24 rounded-full bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-center relative">
                                                    <div className="absolute inset-0 bg-cyan-400/5 animate-ping rounded-full" />
                                                    <Sparkles className="w-7 h-7 lg:w-12 lg:h-12 text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>

                                            {/* Procedural HUD Elements */}
                                            <div className="absolute top-4 left-4 lg:top-8 lg:left-8 w-8 lg:w-16 h-px bg-gradient-to-r from-cyan-500/40 to-transparent" />
                                            <div className="absolute bottom-4 right-4 lg:bottom-8 lg:right-8 w-8 lg:w-16 h-px bg-gradient-to-l from-violet-500/40 to-transparent" />
                                            <div className="absolute top-4 right-4 lg:top-8 lg:right-8 w-px h-8 lg:h-16 bg-gradient-to-b from-cyan-500/40 to-transparent" />
                                            <div className="absolute bottom-4 left-4 lg:bottom-8 lg:left-8 w-px h-8 lg:h-16 bg-gradient-to-t from-violet-500/40 to-transparent" />
                                        </motion.div>

                                        <div className="absolute -bottom-6 lg:-bottom-10 left-1/2 -translate-x-1/2">
                                            <motion.div
                                                animate={{ opacity: [0.4, 1, 0.4] }}
                                                transition={{ duration: 3, repeat: Infinity }}
                                                className="px-4 lg:px-6 py-1.5 lg:py-2 rounded-full glass-luxe border border-cyan-500/20 shadow-xl lg:shadow-2xl backdrop-blur-xl"
                                            >
                                                <span className="text-[9px] lg:text-[11px] font-black text-cyan-400 uppercase tracking-[0.3em] lg:tracking-[0.4em] tech-font">STATE: STANDBY</span>
                                            </motion.div>
                                        </div>
                                    </div>

                                    <h2 className="text-2xl lg:text-5xl font-black text-white italic tracking-tighter mb-4 lg:mb-8 uppercase glitch-hover cursor-default">
                                        Cyber-Luxe <span className="text-cyan-400">OS_V1.0</span>
                                    </h2>
                                    <p className="text-slate-500 font-bold tracking-[0.05em] lg:tracking-[0.1em] text-[11px] lg:text-[13px] max-w-[280px] lg:max-w-[400px] leading-relaxed opacity-60 uppercase tech-font">
                                        Awaiting encrypted handshake protocol. Select a manifest node from the terminal to establish primary uplink.
                                    </p>

                                    <div className="mt-8 lg:mt-16 hidden sm:flex items-center gap-4 lg:gap-6 px-6 lg:px-8 py-3 lg:py-4 rounded-2xl lg:rounded-3xl glass-luxe-light border border-white/5 opacity-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,245,255,1)]" />
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest tech-font">ENCRYPTION: ACTIVE</span>
                                        </div>
                                        <div className="w-[1px] h-4 bg-white/10" />
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest tech-font">UPLINK: SECURE</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Members Sidebar */}
                        {view === 'server' && showMembers && selectedServer?.memberProfiles && (
                            <div className="w-[320px] glass-luxe border-l border-white/10 p-10 flex flex-col shrink-0 relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 w-32 h-64 bg-cyan-500/5 blur-[120px] pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-32 h-64 bg-violet-500/5 blur-[120px] pointer-events-none" />

                                <h3 className="text-[12px] font-black text-white italic uppercase tracking-[0.4em] mb-12 flex items-center justify-between group/manifest">
                                    <span className="glitch-hover">User Manifest</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,245,255,0.8)]" />
                                        <span className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-md border border-cyan-500/30 text-[10px] font-black tech-font">
                                            {selectedServer.memberProfiles.length.toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                </h3>

                                <ScrollArea className="flex-1 -mx-4 px-4">
                                    <div className="space-y-8 pb-10">
                                        {selectedServer.memberProfiles.slice(0, 50).map((m: any, idx: number) => (
                                            <motion.div
                                                key={m._id}
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.02 }}
                                                whileHover={{ x: 6 }}
                                                className="flex items-center gap-5 group cursor-pointer relative"
                                            >
                                                <div className="relative">
                                                    <div className="p-0.5 rounded-xl border border-white/5 glass-luxe-light group-hover:border-cyan-500/40 transition-all duration-500 z-10 relative shadow-lg">
                                                        <Avatar className="w-12 h-12 border border-white/5 rounded-lg">
                                                            <AvatarImage src={m.avatar} className="object-cover" />
                                                            <AvatarFallback className="glass-luxe text-white/50 text-xs font-black uppercase tracking-tighter">
                                                                {m.name?.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </div>
                                                    {/* Status Pulse */}
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#030508] p-0.5 z-20">
                                                        <div className="w-full h-full rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(0,245,255,0.6)] group-hover:scale-110 transition-transform" />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col min-w-0 z-10">
                                                    <span className="text-[13px] font-black text-slate-200 group-hover:text-cyan-400 transition-colors truncate uppercase italic tracking-tight">
                                                        {m.name}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-1 opacity-50">
                                                        <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] tech-font truncate">NODE_ID:{m._id?.slice(-4)}</span>
                                                    </div>
                                                </div>

                                                {/* Hover Technical Detail */}
                                                <div className="absolute right-0 opacity-0 group-hover:opacity-40 transition-opacity">
                                                    <div className="w-8 h-px bg-cyan-500/40" />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </ScrollArea>

                                <div className="mt-8 p-6 border border-white/5 glass-luxe rounded-3xl relative overflow-hidden group/load">
                                    <div className="absolute inset-0 bg-cyan-500/[0.02] pointer-events-none" />
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <Activity className="w-4 h-4 text-cyan-500 group-hover/load:animate-pulse" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] tech-font">Network Load</span>
                                        </div>
                                        <span className="text-[10px] font-black text-cyan-500 tech-font">24%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                                        <motion.div
                                            animate={{ width: ['20%', '28%', '24%'], opacity: [0.6, 1, 0.6] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_15px_rgba(0,245,255,0.4)] relative"
                                        >
                                            {/* Scanning Line in Progress Bar */}
                                            <motion.div
                                                animate={{ left: ['-100%', '100%'] }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                            />
                                        </motion.div>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest italic tech-font">SECURE_CHANNEL_READY</span>
                                        <div className="flex gap-1">
                                            {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-cyan-500/20" />)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {showCreateServer && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/95 backdrop-blur-3xl flex items-center justify-center z-[100] p-4"
                            onClick={() => setShowCreateServer(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 40, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.9, y: 40, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="glass-luxe border border-cyan-500/20 rounded-[3rem] p-10 lg:p-14 w-full max-w-xl shadow-[0_0_100px_rgba(0,245,255,0.1)] relative overflow-hidden"
                            >
                                {/* Decorative HUD Accents */}
                                <div className="absolute top-0 left-0 w-32 h-px bg-gradient-to-r from-cyan-500/40 to-transparent" />
                                <div className="absolute top-0 left-0 w-px h-32 bg-gradient-to-b from-cyan-500/40 to-transparent" />
                                <div className="absolute bottom-0 right-0 w-32 h-px bg-gradient-to-l from-violet-500/40 to-transparent" />
                                <div className="absolute bottom-0 right-0 w-px h-32 bg-gradient-to-t from-violet-500/40 to-transparent" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-6 mb-10">
                                        <div className="w-16 h-16 rounded-2xl glass-luxe border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(0,245,255,0.2)]">
                                            <Plus className="w-8 h-8 text-cyan-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter glitch-hover">Initialize Node</h2>
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] tech-font">Protocol: Pocket_Dimension_Alpha</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-10">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <label className="text-[10px] text-cyan-400/60 font-black uppercase tracking-[0.4em] tech-font">Node Identifier</label>
                                                <span className="text-[9px] text-slate-700 font-black tech-font">SECURE_AUTH_REQUIRED</span>
                                            </div>
                                            <div className="relative group">
                                                <Input
                                                    value={newServerName}
                                                    onChange={(e) => setNewServerName(e.target.value)}
                                                    placeholder="ENTER_NODE_NAME..."
                                                    className="h-20 bg-black/40 border border-white/5 rounded-2xl px-8 text-xl font-black text-white focus:border-cyan-500/50 focus:ring-0 transition-all outline-none placeholder:text-slate-800 tech-font uppercase tracking-wider"
                                                />
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                                                    <Cpu className="w-6 h-6 text-cyan-400" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-6 pt-4">
                                            <button
                                                className="flex-1 h-16 rounded-2xl font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white hover:bg-white/5 border border-white/5 transition-all text-[11px] tech-font"
                                                onClick={() => setShowCreateServer(false)}
                                            >
                                                Abort_Task
                                            </button>
                                            <button
                                                className={cn(
                                                    "flex-1 h-16 rounded-2xl font-black uppercase tracking-[0.3em] transition-all text-[11px] tech-font flex items-center justify-center gap-3 border shadow-2xl",
                                                    newServerName.trim()
                                                        ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_30px_rgba(0,245,255,0.2)] hover:bg-cyan-500/20"
                                                        : "bg-white/5 border-white/10 text-slate-700 cursor-not-allowed shadow-none"
                                                )}
                                                onClick={handleCreateServer}
                                                disabled={createServer.isPending || !newServerName.trim()}
                                            >
                                                {createServer.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                    <>
                                                        Establish_Node
                                                        <ArrowRight className="w-4 h-4" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showJoinServer && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/95 backdrop-blur-3xl flex items-center justify-center z-[100] p-4"
                            onClick={() => setShowJoinServer(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 40, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.9, y: 40, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="glass-luxe border border-violet-500/20 rounded-[3rem] p-10 lg:p-14 w-full max-w-xl shadow-[0_0_100px_rgba(139,92,246,0.1)] relative overflow-hidden"
                            >
                                {/* Decorative HUD Accents */}
                                <div className="absolute top-0 left-0 w-32 h-px bg-gradient-to-r from-violet-500/40 to-transparent" />
                                <div className="absolute top-0 left-0 w-px h-32 bg-gradient-to-b from-violet-500/40 to-transparent" />
                                <div className="absolute bottom-0 right-0 w-32 h-px bg-gradient-to-l from-cyan-500/40 to-transparent" />
                                <div className="absolute bottom-0 right-0 w-px h-32 bg-gradient-to-t from-cyan-500/40 to-transparent" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-6 mb-10">
                                        <div className="w-16 h-16 rounded-2xl glass-luxe border border-violet-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                                            <Fingerprint className="w-8 h-8 text-violet-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter glitch-hover">Sync Access</h2>
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] tech-font">Link: Established_Node_Bridge</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-10">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between px-2">
                                                <label className="text-[10px] text-violet-400/60 font-black uppercase tracking-[0.4em] tech-font">Invite Token</label>
                                                <span className="text-[9px] text-slate-700 font-black tech-font">VERIFICATION_SYSTEM_ACTIVE</span>
                                            </div>
                                            <div className="relative group">
                                                <Input
                                                    value={inviteCode}
                                                    onChange={(e) => setInviteCode(e.target.value)}
                                                    placeholder="EX: PROTOCOL_ALPHA_77"
                                                    className="h-20 bg-black/40 border border-white/5 rounded-2xl px-8 text-xl font-black text-white focus:border-violet-500/50 focus:ring-0 transition-all outline-none placeholder:text-slate-800 tech-font uppercase tracking-wider"
                                                />
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                                                    <Lock className="w-6 h-6 text-violet-400" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-6 pt-4">
                                            <button
                                                className="flex-1 h-16 rounded-2xl font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white hover:bg-white/5 border border-white/5 transition-all text-[11px] tech-font"
                                                onClick={() => setShowJoinServer(false)}
                                            >
                                                SIG_TERMINATE
                                            </button>
                                            <button
                                                className={cn(
                                                    "flex-1 h-16 rounded-2xl font-black uppercase tracking-[0.3em] transition-all text-[11px] tech-font flex items-center justify-center gap-3 border shadow-2xl",
                                                    inviteCode.trim()
                                                        ? "bg-violet-500/10 border-violet-500/50 text-violet-400 shadow-[0_0_30_rgba(139,92,246,0.2)] hover:bg-violet-500/20"
                                                        : "bg-white/5 border-white/10 text-slate-700 cursor-not-allowed shadow-none"
                                                )}
                                                onClick={handleJoinServer}
                                                disabled={joinServer.isPending || !inviteCode.trim()}
                                            >
                                                {joinServer.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                    <>
                                                        Authorize_Sync
                                                        <Activity className="w-4 h-4" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <JoinRoomModal
                    isOpen={showJoinRoomModal}
                    onClose={() => {
                        setShowJoinRoomModal(false);
                        setPendingRoomId(null);
                    }}
                    initialRoomId={pendingRoomId || ''}
                />

                <CreateRoomModal
                    isOpen={showCreateRoomModal}
                    onClose={() => setShowCreateRoomModal(false)}
                    onRoomCreated={(roomId) => {
                        console.log('Room created:', roomId);
                    }}
                />
                <MediaUploader
                    isOpen={showMediaPicker}
                    onClose={() => setShowMediaPicker(false)}
                    onFilesSelected={handleFilesSelected}
                    onVoiceRecord={() => setIsRecordingVoice(true)}
                    onCreateVoiceRoom={() => { setShowCreateRoomModal(true); setShowMediaPicker(false); }}
                />

                {/* Mobile Sidebar Overlay */}
                <AnimatePresence>
                    {showMobileSidebar && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowMobileSidebar(false)}
                                className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                            />
                            {/* Sidebar */}
                            <motion.div
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="lg:hidden fixed left-0 top-0 bottom-0 w-[85vw] max-w-[320px] glass-luxe z-50 border-r border-cyan-500/20 flex flex-col shadow-[20px_0_60px_rgba(0,0,0,0.8)]"
                            >
                                {/* Header */}
                                <div className="p-4 border-b border-white/5 flex items-center justify-between relative overflow-hidden shrink-0">
                                    <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
                                    <h2 className="text-xs font-black text-white italic tracking-tight uppercase flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg glass-luxe-light flex items-center justify-center border border-cyan-500/30">
                                            <Activity className="w-3.5 h-3.5 text-cyan-400" />
                                        </div>
                                        CHAT_HUB
                                    </h2>
                                    <button onClick={() => setShowMobileSidebar(false)} className="w-9 h-9 rounded-xl glass-luxe-light border border-white/5 flex items-center justify-center hover:text-rose-500 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Mobile View Tabs */}
                                <div className="flex gap-2 px-3 py-3 border-b border-white/5 shrink-0">
                                    <button
                                        onClick={() => setView('dms')}
                                        className={cn(
                                            "flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                            view === 'dms'
                                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                                : "text-slate-400 hover:bg-white/5"
                                        )}
                                    >
                                        Messages
                                    </button>
                                    <button
                                        onClick={() => setView('server')}
                                        className={cn(
                                            "flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                            view === 'server'
                                                ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                                                : "text-slate-400 hover:bg-white/5"
                                        )}
                                    >
                                        Servers
                                    </button>
                                    <button
                                        onClick={() => setView('discover')}
                                        className={cn(
                                            "flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                            view === 'discover'
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : "text-slate-400 hover:bg-white/5"
                                        )}
                                    >
                                        Discover
                                    </button>
                                </div>

                                {/* Content based on view */}
                                <ScrollArea className="flex-1 px-3 py-4">
                                    {view === 'dms' ? (
                                        <div className="space-y-2">
                                            <p className="px-2 mb-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Direct Messages</p>
                                            {convsLoading ? (
                                                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 glass-luxe-light rounded-xl animate-pulse" />)}</div>
                                            ) : conversations.length === 0 ? (
                                                <div className="text-center py-12 px-4">
                                                    <MessageCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                                    <p className="text-[10px] font-bold text-slate-500">No conversations yet</p>
                                                </div>
                                            ) : (
                                                conversations.map((conv: Conversation) => {
                                                    const other = conv.participants[0];
                                                    const name = conv.type === 'group' ? conv.groupName : other?.name;
                                                    const isActive = selectedConversationId === conv._id;
                                                    return (
                                                        <button
                                                            key={conv._id}
                                                            onClick={() => {
                                                                setSelectedConversationId(conv._id);
                                                                setView('dms');
                                                                setShowMobileSidebar(false);
                                                            }}
                                                            className={cn(
                                                                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all border",
                                                                isActive
                                                                    ? "bg-cyan-500/10 border-cyan-500/30"
                                                                    : "border-transparent hover:bg-white/5"
                                                            )}
                                                        >
                                                            <Avatar className="w-10 h-10 rounded-lg border border-white/10">
                                                                <AvatarImage src={other?.avatar} />
                                                                <AvatarFallback className="text-xs font-bold">{name?.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 text-left min-w-0">
                                                                <p className={cn("text-xs font-bold truncate", isActive ? "text-cyan-400" : "text-white")}>{name}</p>
                                                                {conv.lastMessage && (
                                                                    <p className="text-[10px] text-slate-500 truncate">{conv.lastMessage.content}</p>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    ) : view === 'server' ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between px-2 mb-3">
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Your Servers</p>
                                                <button
                                                    onClick={() => { setShowCreateServer(true); setShowMobileSidebar(false); }}
                                                    className="w-6 h-6 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center hover:bg-violet-500/30 transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            {serversLoading ? (
                                                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 glass-luxe-light rounded-xl animate-pulse" />)}</div>
                                            ) : servers.length === 0 ? (
                                                <div className="text-center py-12 px-4">
                                                    <Terminal className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                                    <p className="text-[10px] font-bold text-slate-500 mb-3">No servers yet</p>
                                                    <button
                                                        onClick={() => { setShowCreateServer(true); setShowMobileSidebar(false); }}
                                                        className="px-4 py-2 rounded-lg bg-violet-500/20 text-violet-400 text-[10px] font-bold"
                                                    >
                                                        Create Server
                                                    </button>
                                                </div>
                                            ) : (
                                                servers.map((server: Server) => {
                                                    const isActive = selectedServerId === server._id;
                                                    return (
                                                        <button
                                                            key={server._id}
                                                            onClick={() => {
                                                                setSelectedServerId(server._id);
                                                                if (server.channels?.[0]) setSelectedChannelId(server.channels[0]._id);
                                                                setView('server');
                                                                setShowMobileSidebar(false);
                                                            }}
                                                            className={cn(
                                                                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all border",
                                                                isActive
                                                                    ? "bg-violet-500/10 border-violet-500/30"
                                                                    : "border-transparent hover:bg-white/5"
                                                            )}
                                                        >
                                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center text-white font-bold text-sm">
                                                                {server.name.charAt(0)}
                                                            </div>
                                                            <div className="flex-1 text-left min-w-0">
                                                                <p className={cn("text-xs font-bold truncate", isActive ? "text-violet-400" : "text-white")}>{server.name}</p>
                                                                <p className="text-[10px] text-slate-500">{server.memberCount || 0} members</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}

                                            {/* Channels for selected server */}
                                            {selectedServer && channels.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-white/5">
                                                    <p className="px-2 mb-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Channels</p>
                                                    {channels.map((ch: Channel) => (
                                                        <button
                                                            key={ch._id}
                                                            onClick={() => {
                                                                setSelectedChannelId(ch._id);
                                                                if (ch.type === 'voice') joinRoom(ch._id);
                                                                setShowMobileSidebar(false);
                                                            }}
                                                            className={cn(
                                                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left",
                                                                selectedChannelId === ch._id
                                                                    ? "bg-cyan-500/10 text-cyan-400"
                                                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                                                            )}
                                                        >
                                                            {ch.type === 'voice' ? <Radio className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                                                            <span className="text-[11px] font-bold truncate">{ch.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="px-2 mb-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Discover Servers</p>
                                            <button
                                                onClick={() => { setShowJoinServer(true); setShowMobileSidebar(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-dashed border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                            >
                                                <Plus className="w-4 h-4 text-emerald-400" />
                                                <span className="text-[11px] font-bold">Join with Invite Code</span>
                                            </button>
                                            {discoverServers.map((s: Server) => (
                                                <button
                                                    key={s._id}
                                                    onClick={() => { joinServer.mutate({ serverId: s._id }); setShowMobileSidebar(false); }}
                                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center text-white font-bold text-sm">
                                                        {s.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 text-left min-w-0">
                                                        <p className="text-xs font-bold text-white truncate">{s.name}</p>
                                                        <p className="text-[10px] text-slate-500">{s.memberCount || 0} members</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>

                                {/* User Footer */}
                                <div className="p-3 glass-luxe-light border-t border-white/5 shrink-0">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                                        <Avatar className="w-9 h-9 rounded-lg border border-cyan-500/20">
                                            <AvatarImage src={profile?.avatar} />
                                            <AvatarFallback className="text-xs font-bold">{profile?.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-white truncate">{profile?.name}</p>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                                <span className="text-[8px] font-bold text-cyan-400/60 uppercase tracking-wider">Online</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
