import { useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Message {
    _id: string;
    senderId: string;
    sender?: { name: string; avatar?: string; userId?: string };
    content: string;
    createdAt: Date;
}

export function NotificationManager() {
    const { socket } = useSocket();
    const { profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!socket) return;

        // Request browser notification permission
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }

        const handleNewMessage = (data: { conversationId: string; message: Message }) => {
            const { conversationId, message } = data;

            // Don't notify for our own messages
            if (message.senderId === profile?._id) return;

            // Check if we're already in the conversation page
            // Path: /app/chat?conversationId=...
            const searchParams = new URLSearchParams(window.location.search);
            const currentConvId = searchParams.get('conversationId');
            const isAtChatPath = location.pathname.includes('/app/chat');

            if (isAtChatPath && currentConvId === conversationId) {
                return;
            }

            // Trigger browser notification if document is hidden
            if (document.visibilityState === 'hidden' && Notification.permission === 'granted') {
                new Notification(`New message from ${message.sender?.name || 'Someone'}`, {
                    body: message.content,
                    icon: message.sender?.avatar || '/logo.png',
                });
            }

            // Always show in-app toast unless it's the exact active chat
            toast.custom((t) => (
                <div
                    onClick={() => {
                        navigate({ to: '/app/chat', search: { conversationId } });
                        toast.dismiss(t);
                    }}
                    className="w-[350px] glass-aether border border-primary/20 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-primary/5 transition-all animate-in fade-in slide-in-from-right-8 duration-300"
                >
                    <Avatar className="w-12 h-12 border border-primary/20">
                        <AvatarImage src={message.sender?.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary font-black uppercase">
                            {message.sender?.name?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-primary uppercase tracking-widest tech-font mb-0.5">NEW_TRANSMISSION</p>
                        <p className="text-sm font-black text-white italic aether-font truncate">{message.sender?.name}</p>
                        <p className="text-[11px] text-slate-400 truncate tech-font mt-0.5 opacity-80">{message.content}</p>
                    </div>
                </div>
            ), {
                duration: 5000,
                position: 'top-right',
            });
        };

        socket.on('message:new', handleNewMessage);
        return () => {
            socket.off('message:new', handleNewMessage);
        };
    }, [socket, profile?._id, navigate, location.pathname]);

    return null;
}
