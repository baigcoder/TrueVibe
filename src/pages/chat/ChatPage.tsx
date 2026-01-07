import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Phone,
  Video,
  Smile,
  Pin,
  Reply,
  Plus,
  Users,
  Settings,
  X,
  Compass,
  MessageCircle,
  Loader2,
  MoreVertical,
  Sparkles,
  Mic,
  ArrowUpRight,
  Volume2,
  LogIn,
  Server,
  Monitor,
  MicOff,
  MonitorOff,
  VideoOff,
  LogOut,
  Activity,
  Terminal,
  Cpu,
  Radio,
  Send,
  ArrowRight,
  ArrowLeft,
  Lock,
  HelpCircle,
  Info,
  Hash,
  Headphones,
  Trash2,
  Ban,
  BellOff,
  Bell,
  Image,
  User,
  Camera,
  Palette,
} from "lucide-react";
import { MessageTicks } from "@/components/chat/MessageTicks";
import { OnlineIndicator } from "@/components/chat/OnlineIndicator";
import { useAuth } from "@/context/AuthContext";
import { useVoiceRoom } from "@/context/VoiceRoomContext";
import { cn } from "@/lib/utils";
import { m, AnimatePresence } from "framer-motion";
import {
  useServers,
  useDiscoverServers,
  useServer,
  useCreateServer,
  useJoinServer,
  useChannels,
  useChannelMessages,
  useSendChannelMessage,
  useConversations,
  useMessages,
  useSendMessage,
  useAddReaction,
  useRemoveReaction,
  useCreateConversation,
  useSearchUsers,
  useDeleteConversation,
  useBlockUser,
  useCheckBlockStatus,
} from "@/api/hooks";
import { api } from "@/api/client";
import { useSocket } from "@/context/SocketContext";
import { useRealtime } from "@/context/RealtimeContext";
import { useCall } from "@/context/CallContext";
import { useSearch } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MediaUploader } from "@/components/chat/MediaUploader";
import { MediaPreview, type PreviewFile } from "@/components/chat/MediaPreview";
import { MessageMedia } from "@/components/chat/MessageMedia";
import { CreateRoomModal } from "@/components/chat/CreateRoomModal";
import { JoinRoomModal } from "@/components/chat/JoinRoomModal";
import { ParticipantsGrid } from "@/components/chat/VoiceRoomPanel";
import { useMediaUpload, type MediaAttachment } from "@/hooks/useMediaUpload";
// New Phase 3 components
import { VideoRecorder } from "@/components/chat/VideoRecorder";
import { LocationPicker } from "@/components/chat/LocationSharing";
import { ChatThemeSelector, CHAT_THEMES, type ChatTheme } from "@/components/chat/ChatThemeSelector";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";

interface Message {
  _id: string;
  senderId: string;
  sender?: { name: string; avatar?: string; userId?: string };
  content: string;
  media?: { type: string; url: string }[];
  reactions?: { emoji: string; users: string[] }[];
  replyTo?: { _id: string; content: string; sender?: { name: string } };
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  createdAt: Date;
  isPinned?: boolean;
  readBy?: { userId: string; readAt: Date }[];
}

interface Channel {
  _id: string;
  name: string;
  type: "text" | "voice" | "announcement";
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
  type: "direct" | "group";
  groupName?: string;
  participants: {
    _id: string;
    userId?: string;
    name: string;
    avatar?: string;
  }[];
  lastMessage?: { content: string; timestamp: Date };
}

const AetherStyles = () => (
  <style
    dangerouslySetInnerHTML={{
      __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Inter:wght@100..900&display=swap');

        :root {
            --premium-bg: #030712;
            --premium-glass: rgba(13, 17, 28, 0.45);
            --premium-border: rgba(255, 255, 255, 0.04);
            --premium-primary: hsl(231 93% 73%);
            --premium-accent: hsl(171 66% 50%);
            --premium-glow: rgba(129, 140, 248, 0.3);
            --font-display: 'Outfit', sans-serif;
            --font-body: 'Inter', sans-serif;
        }

        .premium-font {
            font-family: var(--font-display);
        }

        .glass-premium {
            background: var(--premium-glass);
            backdrop-filter: blur(24px) saturate(200%);
            border: 1px solid var(--premium-border);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
        }

        .glass-card {
            background: rgba(255, 255, 255, 0.02);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.06);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .premium-gradient-text {
            background: linear-gradient(135deg, #fff 0%, var(--premium-primary) 50%, var(--premium-accent) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-size: 200% auto;
            animation: shine 6s linear infinite;
        }

        @keyframes shine {
            to { background-position: 200% center; }
        }

        .orb-glow {
            background: radial-gradient(circle at center, var(--premium-primary) 0%, transparent 70%);
            filter: blur(60px);
            opacity: 0.1;
            animation: pulse-orb 8s ease-in-out infinite;
        }
         @keyframes pulse-orb {
            0%, 100% { transform: scale(1); opacity: 0.1; }
            50% { transform: scale(1.2); opacity: 0.2; }
        }

        .premium-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .premium-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .premium-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
        }
        .premium-scrollbar::-webkit-scrollbar-thumb:hover {
            background: var(--premium-primary);
        }
    
    `,
    }}
  />
);

export default function ChatPage() {
  const { profile, user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const search = useSearch({ from: "/app/chat" }) as {
    userId?: string;
    conversationId?: string;
    room?: string;
  };

  const [view, setView] = useState<"dms" | "server" | "discover">("dms");
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null,
  );
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [showMembers, setShowMembers] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showJoinServer, setShowJoinServer] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  // Media attachment state
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PreviewFile[]>([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  // Phase 3 feature states
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [chatTheme, setChatTheme] = useState<ChatTheme>(CHAT_THEMES[0]);
  const [showMediaPlusMenu, setShowMediaPlusMenu] = useState(false);
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
  const [hideSidebarDesktop, setHideSidebarDesktop] = useState(false);
  const [showFeaturesGuide, setShowFeaturesGuide] = useState(false);

  // WhatsApp-style features state
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isMutedConversation, setIsMutedConversation] = useState(false);

  // Handle room URL parameter for join by link
  useEffect(() => {
    if (search.room && !isInRoom) {
      setPendingRoomId(search.room);
      setShowJoinRoomModal(true);
    }
  }, [search.room, isInRoom]);

  // Auto-show mobile sidebar when no conversation is selected on mobile
  useEffect(() => {
    if (!selectedConversationId && !selectedChannelId && view === "dms") {
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
      const newFiles: PreviewFile[] = Array.from(files).map((file) => ({
        file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith("image")
          ? "image"
          : file.type.startsWith("video")
            ? "video"
            : "file",
      }));
      setPendingFiles((prev) => [...prev, ...newFiles]);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: serversData, isLoading: serversLoading } = useServers();
  const { data: discoverData } = useDiscoverServers(searchQuery);
  const { data: serverData } = useServer(selectedServerId || "");
  const { data: channelsData } = useChannels(selectedServerId || "");
  const { data: conversationsData, isLoading: convsLoading } =
    useConversations();
  const { data: channelMessagesData, isLoading: channelMsgsLoading } =
    useChannelMessages(selectedServerId || "", selectedChannelId || "");
  const { data: dmMessagesData, isLoading: dmMsgsLoading } = useMessages(
    selectedConversationId || "",
  );

  const sendChannelMessage = useSendChannelMessage();
  const sendDmMessage = useSendMessage();
  const createServer = useCreateServer();
  const joinServer = useJoinServer();
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const blockUserMutation = useBlockUser();
  const { initiateCall } = useCall();
  const { data: searchUsersData, isLoading: searchLoading } =
    useSearchUsers(searchQuery);



  const servers = (serversData as any)?.data?.servers || [];
  const discoverServers = (discoverData as any)?.data?.servers || [];
  const conversations = (conversationsData as any)?.data?.conversations || [];
  const channels =
    (serverData as any)?.data?.server?.channels ||
    (channelsData as any)?.data?.channels ||
    [];
  const selectedServer = (serverData as any)?.data?.server;
  const currentMessages =
    view === "server"
      ? channelMessagesData?.pages?.flatMap(
        (p: any) => p.data?.messages || [],
      ) || []
      : dmMessagesData?.pages?.flatMap((p: any) => p.data?.messages || []) ||
      [];
  const selectedConversation = conversations.find(
    (c: Conversation) => c._id === selectedConversationId,
  );
  const selectedChannel = channels.find(
    (c: Channel) => c._id === selectedChannelId,
  );

  // Get the other participant's ID for block status check (WhatsApp-style features)
  const otherParticipantId = selectedConversation?.type === "direct"
    ? selectedConversation?.participants?.find(
      (p: any) => p._id !== profile?._id && p.userId !== profile?._id
    )?.userId || selectedConversation?.participants?.find(
      (p: any) => p._id !== profile?._id && p.userId !== profile?._id
    )?._id
    : null;

  const { data: blockStatus } = useCheckBlockStatus(otherParticipantId || "");
  const isUserBlocked = (blockStatus as any)?.data?.isBlocked || false;

  const messagesLoading =
    view === "server" ? channelMsgsLoading : dmMsgsLoading;

  useEffect(() => {
    if (!socket) {
      console.log('[ChatPage] Socket not connected');
      return;
    }

    console.log('[ChatPage] Setting up socket event listeners, socket connected:', socket.connected);

    servers.forEach((s: Server) =>
      socket.emit("server:join", { serverId: s._id }),
    );

    const handleChannelMessage = (data: any) => {
      console.log('[ChatPage] Received channel:message', data);
      if (data.channelId === selectedChannelId) {
        queryClient.invalidateQueries({ queryKey: ["channelMessages"] });
      }
    };

    // Handle new DM messages with instant UI update
    const handleDmMessage = (data: { conversationId: string; message: Message }) => {
      console.log('[ChatPage] Received message:new event:', data);

      // Optimistically add message to cache for instant UI update
      queryClient.setQueryData(
        ["messages", data.conversationId],
        (oldData: any) => {
          console.log('[ChatPage] Updating cache for conversation:', data.conversationId, 'oldData:', !!oldData);

          if (!oldData?.pages) {
            // If no data exists yet, create initial structure
            return {
              pages: [{ data: { messages: [data.message], cursor: null, hasMore: false } }],
              pageParams: [undefined],
            };
          }

          // Create a shallow copy of pages
          const newPages = [...oldData.pages];

          // Add the new message to the first page's messages array
          if (newPages[0]?.data?.messages) {
            newPages[0] = {
              ...newPages[0],
              data: {
                ...newPages[0].data,
                messages: [...newPages[0].data.messages, data.message],
              },
            };
          }

          return { ...oldData, pages: newPages };
        }
      );

      // Also update conversations list to show latest message preview
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // Scroll to bottom for new messages if in this conversation
      if (data.conversationId === selectedConversationId) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    };

    const handleTyping = (data: any) => {
      if (data.userId !== profile?._id) {
        setTypingUsers((prev) =>
          data.isTyping
            ? [...new Set([...prev, data.userId])]
            : prev.filter((id) => id !== data.userId),
        );
      }
    };
    const handleReaction = () => {
      queryClient.invalidateQueries({ queryKey: ["channelMessages"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    };

    socket.on("channel:message", handleChannelMessage);
    socket.on("message:new", handleDmMessage);
    socket.on("channel:typing", handleTyping);
    socket.on("typing:update", handleTyping);
    socket.on("message:reaction:add", handleReaction);
    socket.on("message:reaction:remove", handleReaction);

    return () => {
      socket.off("channel:message", handleChannelMessage);
      socket.off("message:new", handleDmMessage);
      socket.off("channel:typing", handleTyping);
      socket.off("typing:update", handleTyping);
      socket.off("message:reaction:add", handleReaction);
      socket.off("message:reaction:remove", handleReaction);
    };
  }, [socket, servers, selectedChannelId, selectedConversationId, profile?._id, queryClient]);

  useEffect(() => {
    if (socket && selectedChannelId) {
      socket.emit("channel:join", { channelId: selectedChannelId });
      return () => {
        socket.emit("channel:leave", { channelId: selectedChannelId });
      };
    }
  }, [socket, selectedChannelId]);

  // Join conversation room for real-time DM updates
  useEffect(() => {
    if (socket && selectedConversationId) {
      socket.emit("join:room", { roomId: `conversation:${selectedConversationId}` });
      return () => {
        socket.emit("leave:room", { roomId: `conversation:${selectedConversationId}` });
      };
    }
  }, [socket, selectedConversationId]);

  // Supabase Realtime subscription for DM messages (replaces Socket.IO)
  const { subscribeToChannel, unsubscribeFromChannel, broadcast } = useRealtime();

  useEffect(() => {
    if (!selectedConversationId) return;

    const channelName = `conversation:${selectedConversationId}`;
    console.log('[ChatPage] Subscribing to Supabase channel:', channelName);

    const channel = subscribeToChannel(channelName);

    // Handle incoming messages via Supabase Broadcast
    channel.on('broadcast', { event: 'message:new' }, ({ payload }) => {
      console.log('[ChatPage] Received message via Supabase:', payload);

      const data = payload as { conversationId: string; message: Message };

      // Optimistically add message to cache for instant UI update
      queryClient.setQueryData(
        ["messages", data.conversationId],
        (oldData: any) => {
          console.log('[ChatPage] Updating cache from Supabase event:', data.conversationId);

          if (!oldData?.pages) {
            return {
              pages: [{ data: { messages: [data.message], cursor: null, hasMore: false } }],
              pageParams: [undefined],
            };
          }

          const newPages = [...oldData.pages];
          if (newPages[0]?.data?.messages) {
            // Check if message already exists (avoid duplicates)
            const exists = newPages[0].data.messages.some((m: Message) => m._id === data.message._id);
            if (!exists) {
              newPages[0] = {
                ...newPages[0],
                data: {
                  ...newPages[0].data,
                  messages: [...newPages[0].data.messages, data.message],
                },
              };
            }
          }

          return { ...oldData, pages: newPages };
        }
      );

      // Update conversations list
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    // Handle typing indicators via Supabase
    channel.on('broadcast', { event: 'typing:update' }, ({ payload }) => {
      const data = payload as { userId: string; isTyping: boolean };
      if (data.userId !== profile?._id) {
        setTypingUsers((prev) =>
          data.isTyping
            ? [...new Set([...prev, data.userId])]
            : prev.filter((id) => id !== data.userId)
        );
      }
    });

    return () => {
      console.log('[ChatPage] Unsubscribing from Supabase channel:', channelName);
      unsubscribeFromChannel(channelName);
    };
  }, [selectedConversationId, subscribeToChannel, unsubscribeFromChannel, queryClient, profile?._id]);

  // Supabase Realtime subscription for server channel messages
  useEffect(() => {
    if (!selectedChannelId || view !== "server") return;

    const channelName = `channel:${selectedChannelId}`;
    console.log('[ChatPage] Subscribing to Supabase server channel:', channelName);

    const channel = subscribeToChannel(channelName);

    // Handle incoming channel messages
    channel.on('broadcast', { event: 'channel:message' }, ({ payload }) => {
      console.log('[ChatPage] Received channel message via Supabase:', payload);
      queryClient.invalidateQueries({ queryKey: ["channelMessages"] });
    });

    return () => {
      console.log('[ChatPage] Unsubscribing from Supabase server channel:', channelName);
      unsubscribeFromChannel(channelName);
    };
  }, [selectedChannelId, view, subscribeToChannel, unsubscribeFromChannel, queryClient]);

  // Handle search params (userId / conversationId)
  useEffect(() => {
    if (search.conversationId) {
      setSelectedConversationId(search.conversationId);
      setView("dms");
    } else if (search.userId && conversationsData && !convsLoading) {
      // Find existing DM with this user - check both userId AND _id for fallback
      const existingConv = conversations.find(
        (c: Conversation) =>
          c.type === "direct" &&
          c.participants.some(
            (p) => p.userId === search.userId || p._id === search.userId,
          ),
      );

      if (existingConv) {
        setSelectedConversationId(existingConv._id);
        setView("dms");
      } else {
        // Create new conversation
        createConversation.mutate(
          { participantIds: [search.userId] },
          {
            onSuccess: (response: any) => {
              const newConvId = response.data?.conversation?._id;
              if (newConvId) {
                setSelectedConversationId(newConvId);
                setView("dms");
              }
            },
          },
        );
      }
    }
  }, [search.userId, search.conversationId, conversationsData]);

  useEffect(() => {
    if (
      view === "server" &&
      selectedServerId &&
      !selectedChannelId &&
      channels.length > 0
    ) {
      setSelectedChannelId(channels[0]._id);
    }
  }, [view, selectedServerId, selectedChannelId, channels]);

  // Only scroll to bottom on initial load, not on every message update
  const hasScrolledRef = useRef(false);
  useEffect(() => {
    if (currentMessages.length > 0 && !hasScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
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
        toast.loading("Uploading media...", { id: "upload-media" });
        uploadedMedia = await Promise.all(
          pendingFiles.map((pf) => uploadMedia(pf.file, pf.type)),
        );
        toast.success("Media uploaded!", { id: "upload-media" });
      }

      const messageContent = messageInput.trim();

      if (view === "server" && selectedServerId && selectedChannelId) {
        sendChannelMessage.mutate(
          {
            serverId: selectedServerId,
            channelId: selectedChannelId,
            content: messageContent,
            media: uploadedMedia,
            replyTo: replyingTo?._id,
          },
          {
            onSuccess: (response: any) => {
              // Broadcast via Supabase Realtime for instant updates to other channel members
              const newMessage = response?.data?.message;
              if (newMessage) {
                console.log('[ChatPage] Broadcasting channel message via Supabase:', newMessage);
                broadcast(`channel:${selectedChannelId}`, 'channel:message', {
                  channelId: selectedChannelId,
                  message: newMessage,
                });
              }
            },
          }
        );
      } else if (selectedConversationId) {
        sendDmMessage.mutate(
          {
            conversationId: selectedConversationId,
            content: messageContent,
            media: uploadedMedia,
            replyTo: replyingTo?._id,
          },
          {
            onSuccess: (response: any) => {
              // Broadcast via Supabase Realtime for instant updates to other participants
              const newMessage = response?.data?.message;
              if (newMessage) {
                console.log('[ChatPage] Broadcasting message via Supabase:', newMessage);

                // Broadcast to conversation channel for chat updates
                broadcast(`conversation:${selectedConversationId}`, 'message:new', {
                  conversationId: selectedConversationId,
                  message: newMessage,
                });

                // Also broadcast to each participant's user channel for notifications
                const otherParticipants = selectedConversation?.participants?.filter(
                  (p: any) => p._id !== profile?._id && p.userId !== profile?._id
                ) || [];

                otherParticipants.forEach((participant: any) => {
                  const recipientId = participant.userId || participant._id;
                  if (recipientId) {
                    console.log('[ChatPage] Broadcasting notification to user:', recipientId);
                    broadcast(`user:${recipientId}`, 'notification:message', {
                      conversationId: selectedConversationId,
                      message: newMessage,
                    });
                  }
                });
              }
            },
          }
        );
      }

      setMessageInput("");
      setReplyingTo(null);
      setPendingFiles([]);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
  }, [
    messageInput,
    pendingFiles,
    view,
    selectedServerId,
    selectedChannelId,
    selectedConversationId,
    replyingTo,
    sendChannelMessage,
    sendDmMessage,
    uploadMedia,
    broadcast,
  ]);

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle files selected from media picker
  const handleFilesSelected = useCallback(
    (files: File[], type: "image" | "video" | "file") => {
      const newPreviews: PreviewFile[] = files.map((file) => ({
        file,
        previewUrl:
          type === "image" || type === "video"
            ? URL.createObjectURL(file)
            : undefined,
        type,
      }));
      setPendingFiles((prev) => [...prev, ...newPreviews]);
    },
    [],
  );

  const handleTyping = useCallback(() => {
    if (!socket) return;
    if (view === "server" && selectedChannelId)
      socket.emit("channel:typing:start", { channelId: selectedChannelId });
    else if (selectedConversationId)
      socket.emit("typing:start", { conversationId: selectedConversationId });
  }, [socket, view, selectedChannelId, selectedConversationId]);

  const handleReaction = useCallback(
    (messageId: string, emoji: string, hasReacted: boolean) => {
      if (hasReacted) removeReaction.mutate({ messageId, emoji });
      else addReaction.mutate({ messageId, emoji });
    },
    [addReaction, removeReaction],
  );

  const handleCreateServer = useCallback(() => {
    if (!newServerName.trim()) return;
    createServer.mutate(
      { name: newServerName.trim(), isPublic: true },
      {
        onSuccess: () => {
          setShowCreateServer(false);
          setNewServerName("");
        },
      },
    );
  }, [newServerName, createServer]);

  const handleJoinServer = useCallback(() => {
    if (!inviteCode.trim()) return;
    joinServer.mutate(
      { inviteCode: inviteCode.trim() },
      {
        onSuccess: () => {
          setShowJoinServer(false);
          setInviteCode("");
        },
      },
    );
  }, [inviteCode, joinServer]);

  const handleSelectServer = (server: Server) => {
    setSelectedServerId(server._id);
    setView("server");
    setSelectedConversationId(null);
    setSelectedChannelId(null); // Clear selected channel to avoid 404 with new server
  };

  const formatTime = (date: Date | string) =>
    new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleDeleteConversation = useCallback((conversationId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the conversation

    toast.custom((t) => (
      <div className="bg-slate-900/95 backdrop-blur-lg border border-white/10 rounded-2xl p-5 shadow-2xl max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Delete Conversation</p>
            <p className="text-slate-400 text-xs">With {name}</p>
          </div>
        </div>
        <p className="text-slate-300 text-sm mb-4">
          This will permanently delete all messages. This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(t);
            }}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              toast.dismiss(t);
              deleteConversation.mutate(conversationId, {
                onSuccess: () => {
                  toast.success("Conversation deleted");
                  if (selectedConversationId === conversationId) {
                    setSelectedConversationId(null);
                  }
                },
                onError: (error: any) => {
                  toast.error(error?.message || "Failed to delete conversation");
                },
              });
            }}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors border border-red-500/30"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: 10000 });
  }, [deleteConversation, selectedConversationId]);

  return (
    <div className="relative h-[calc(100vh-80px)] lg:h-screen w-full flex bg-transparent overflow-hidden aether-font lg:p-3 lg:gap-3">
      <AetherStyles />

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {showMobileSidebar && (
          <>
            {/* Backdrop */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileSidebar(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            {/* Sidebar Panel */}
            <m.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[85%] max-w-[340px] bg-neutral-900/95 backdrop-blur-xl z-50 lg:hidden flex flex-col border-r border-white/10 shadow-2xl"
              style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">
                  {view === "dms" ? "Messages" : view === "server" ? "Servers" : "Voice Rooms"}
                </h2>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex p-2 gap-1 border-b border-white/10">
                <button
                  onClick={() => setView("dms")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                    view === "dms" ? "bg-primary/20 text-primary" : "text-slate-400 hover:bg-white/5"
                  )}
                >
                  <MessageCircle className="w-4 h-4" />
                  DMs
                </button>
                <button
                  onClick={() => setView("server")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                    view === "server" ? "bg-primary/20 text-primary" : "text-slate-400 hover:bg-white/5"
                  )}
                >
                  <Cpu className="w-4 h-4" />
                  Servers
                </button>
                <button
                  onClick={() => setView("discover")}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                    view === "discover" ? "bg-primary/20 text-primary" : "text-slate-400 hover:bg-white/5"
                  )}
                >
                  <Mic className="w-4 h-4" />
                  Voice
                </button>
              </div>

              {/* Search */}
              <div className="p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder={view === "dms" ? "Search conversations..." : view === "server" ? "Search servers..." : "Search voice rooms..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-white/5 border-white/10 text-sm rounded-xl"
                  />
                </div>
              </div>

              {/* Enter Invite Code Button */}
              {(view === "server" || view === "discover") && (
                <div className="px-3 pb-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowJoinServer(true);
                      setShowMobileSidebar(false);
                    }}
                    className="w-full h-10 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 rounded-xl text-xs font-bold"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Enter Invite Code
                  </Button>
                </div>
              )}

              {/* DMs Conversations List */}
              {view === "dms" && (
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {conversations?.map((conv: Conversation) => {
                      const otherParticipant = conv.participants?.find(
                        (p) => p._id !== profile?._id && p.userId !== profile?._id
                      );
                      const displayName = conv.type === "group" ? conv.groupName : otherParticipant?.name;
                      const avatar = otherParticipant?.avatar;
                      const isSelected = selectedConversationId === conv._id;

                      return (
                        <div key={conv._id} className="relative group">
                          <m.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSelectedConversationId(conv._id);
                              setShowMobileSidebar(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left pr-12",
                              isSelected
                                ? "bg-primary/20 border border-primary/30"
                                : "hover:bg-white/5"
                            )}
                          >
                            <Avatar className="w-11 h-11 border border-white/10 shrink-0">
                              <AvatarImage src={avatar} />
                              <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                                {displayName?.charAt(0)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white truncate text-sm">{displayName}</p>
                              {conv.lastMessage && (
                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                  {conv.lastMessage.content}
                                </p>
                              )}
                            </div>
                          </m.button>
                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete conversation with ${displayName}? All messages will be permanently removed.`)) {
                                api.delete(`/chat/conversations/${conv._id}`).then(() => {
                                  toast.success(`Conversation deleted`);
                                  queryClient.invalidateQueries({ queryKey: ['conversations'] });
                                  if (selectedConversationId === conv._id) {
                                    setSelectedConversationId(null);
                                  }
                                }).catch(() => toast.error('Failed to delete conversation'));
                              }
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/40 transition-all"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      );
                    })}
                    {(!conversations || conversations.length === 0) && (
                      <div className="text-center py-8 text-slate-500">
                        <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No conversations yet</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              {/* Servers List */}
              {view === "server" && (
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {servers?.map((server: Server) => (
                      <m.button
                        key={server._id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedServerId(server._id);
                          setShowMobileSidebar(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                          selectedServerId === server._id
                            ? "bg-primary/20 border border-primary/30"
                            : "hover:bg-white/5"
                        )}
                      >
                        <div className="w-11 h-11 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                          <span className="text-primary font-bold">{server.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate text-sm">{server.name}</p>
                          <p className="text-xs text-slate-500">{server.memberCount || 0} members</p>
                        </div>
                      </m.button>
                    ))}
                    {(!servers || servers.length === 0) && (
                      <div className="text-center py-8 text-slate-500">
                        <Cpu className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No servers joined</p>
                        <p className="text-xs mt-1">Enter invite code to join</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              {/* Voice Rooms - Discover View */}
              {view === "discover" && (
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowCreateRoomModal(true);
                        setShowMobileSidebar(false);
                      }}
                      className="w-full h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-xs font-bold"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Voice Room
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowJoinRoomModal(true);
                        setShowMobileSidebar(false);
                      }}
                      className="w-full h-12 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl text-xs font-bold"
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Join Voice Room
                    </Button>
                    {isInRoom && (
                      <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          IN VOICE ROOM
                        </div>
                        <p className="text-white text-sm font-semibold">{roomId}</p>
                        <Button
                          onClick={leaveRoom}
                          size="sm"
                          className="w-full mt-2 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        >
                          Leave Room
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </m.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden w-full h-full max-w-full relative z-10 lg:rounded-3xl border border-white/[0.03] bg-black/10 backdrop-blur-3xl shadow-2xl">
        {/* PRIMARY SIDEBAR - Server / DM selection */}
        <div className="hidden lg:flex w-24 bg-transparent flex-col items-center py-8 gap-6 relative z-20 border-r border-white/[0.03] px-3">
          <m.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setView("dms");
              setSelectedServerId(null);
            }}
            className={cn(
              "w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all relative group overflow-hidden border",
              view === "dms"
                ? "bg-primary/10 text-primary border-primary/30 shadow-[0_0_20px_rgba(129,140,248,0.15)]"
                : "bg-white/[0.03] text-slate-500 hover:bg-white/[0.05] hover:text-primary border-transparent hover:border-white/10",
            )}
          >
            <MessageCircle className="w-6 h-6 z-10 transition-transform group-hover:scale-110" />
            {view === "dms" && (
              <m.div
                layoutId="active-server-indicator"
                className="absolute -left-1 w-1.5 h-8 bg-primary rounded-r-full shadow-[0_0_20px_rgba(0,243,255,0.8)] z-20"
              />
            )}
          </m.button>

          <div className="w-10 h-[1px] bg-white/10 my-1 flex justify-center items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
          </div>

          <ScrollArea className="w-full flex-1 hide-scrollbar">
            <div className="flex flex-col items-center gap-5 py-2">
              {serversLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-12 h-12 rounded-2xl bg-white/5 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                servers.map((server: Server) => (
                  <m.button
                    key={server._id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectServer(server)}
                    className="relative group"
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all overflow-hidden border relative group",
                        selectedServerId === server._id
                          ? "bg-primary/10 border-primary/40 shadow-[0_0_25px_rgba(0,243,255,0.15)]"
                          : "bg-white/5 border-white/5 hover:border-primary/30",
                      )}
                    >
                      {server.icon ? (
                        <img
                          src={server.icon}
                          alt={server.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <span className="text-xs font-bold tracking-wider text-white group-hover:text-primary transition-colors tech-font">
                          {server.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      )}
                      {selectedServerId === server._id && (
                        <m.div
                          layoutId="active-server-indicator"
                          className="absolute -left-1 w-1.5 h-8 bg-primary rounded-r-full shadow-[0_0_20px_rgba(0,243,255,0.8)] z-20"
                        />
                      )}
                    </div>

                    {/* Tooltip */}
                    <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-2 glass-aether rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-2xl border border-white/10">
                      <span className="text-[10px] font-bold text-white tracking-widest uppercase">
                        {server.name}
                      </span>
                    </div>
                  </m.button>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="mt-auto flex flex-col items-center gap-4">
            <div className="relative">
              <m.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                className={cn(
                  "w-12 h-12 rounded-2xl transition-all flex items-center justify-center border",
                  showPlusMenu
                    ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                    : "bg-white/5 text-primary hover:bg-primary/10 border-white/5",
                )}
              >
                <Plus
                  className={cn(
                    "w-5 h-5 transition-transform",
                    showPlusMenu && "rotate-45",
                  )}
                />
              </m.button>

              <AnimatePresence>
                {showPlusMenu && (
                  <m.div
                    initial={{ opacity: 0, x: -10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.95 }}
                    className="absolute left-[calc(100%+16px)] bottom-0 w-64 glass-aether rounded-2xl overflow-hidden z-50 p-2 border border-white/10"
                  >
                    <div className="p-2 space-y-1 relative z-10">
                      <div className="px-3 py-2 mb-2">
                        <span className="text-[10px] font-black text-primary/80 uppercase tracking-widest">
                          Connect Network
                        </span>
                      </div>

                      {[
                        {
                          icon: Server,
                          label: "Create Node",
                          sub: "New instance",
                          onClick: () => {
                            setShowPlusMenu(false);
                            setShowCreateServer(true);
                          },
                        },
                        {
                          icon: Volume2,
                          label: "Voice Bridge",
                          sub: "Audio relay",
                          onClick: () => {
                            setShowPlusMenu(false);
                            setShowCreateRoomModal(true);
                          },
                        },
                        {
                          icon: LogIn,
                          label: "Sync Link",
                          sub: "Join bridge",
                          onClick: () => {
                            setShowPlusMenu(false);
                            setShowJoinRoomModal(true);
                          },
                        },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={item.onClick}
                          className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-left group"
                        >
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-all",
                              item.label === "Create Node" &&
                              "shadow-glow-primary",
                            )}
                          >
                            <item.icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <p className="text-[11px] font-bold text-white tracking-wide">
                              {item.label}
                            </p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-tighter">
                              {item.sub}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            <m.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setView("discover")}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border",
                view === "discover"
                  ? "bg-secondary text-white border-secondary shadow-[0_8px_25px_rgba(112,0,255,0.3)]"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 border-white/5",
              )}
            >
              <Compass className="w-5 h-5" />
            </m.button>
          </div>
        </div>

        {/* SECONDARY SIDEBAR - Conversations / Channels list */}
        <div className={cn(
          "hidden lg:flex w-[320px] xl:w-[360px] bg-transparent flex-col border-r border-white-border z-10 relative transition-all duration-300",
          hideSidebarDesktop && "lg:hidden"
        )}>
          {view === "dms" ? (
            <div className="flex flex-col h-full bg-transparent">
              <div className="p-8 lg:p-10 border-b border-white/[0.03]">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_var(--premium-glow)]" />
                    <h3 className="text-xl font-bold text-white tracking-tight premium-font">
                      Messages
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowFeaturesGuide(true)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-primary/20 flex items-center justify-center transition-all group"
                    title="Chat Features Guide"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    placeholder="Search conversations..."
                    className="pl-12 h-12 bg-white/[0.02] border border-white/[0.05] text-sm rounded-2xl focus:border-primary/30 focus:ring-0 placeholder:text-slate-600 transition-all premium-font"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <ScrollArea className="flex-1 px-3 py-4 hide-scrollbar">
                <div className="space-y-1.5">
                  {/* Show search results when searching */}
                  {searchQuery.length >= 2 ? (
                    searchLoading ? (
                      <div className="space-y-4 px-3 py-4">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-16 bg-white/5 rounded-2xl animate-pulse"
                          />
                        ))}
                      </div>
                    ) : (searchUsersData as any)?.data?.users?.length > 0 ? (
                      <div className="space-y-2 py-2">
                        <p className="text-xs text-slate-400 font-medium px-3 mb-3">
                          Search Results
                        </p>
                        {(searchUsersData as any).data.users.map(
                          (user: any) => {
                            const targetId = String(user.userId || user._id);
                            const isCreatingConv = createConversation.isPending;

                            return (
                              <m.button
                                key={user._id}
                                whileHover={{
                                  x: 4,
                                  backgroundColor: "rgba(255,255,255,0.05)",
                                }}
                                disabled={isCreatingConv}
                                onClick={() => {
                                  const existingConv = conversations.find(
                                    (c: Conversation) =>
                                      c.type === "direct" &&
                                      c.participants.some(
                                        (p) =>
                                          String(p.userId) === targetId ||
                                          String(p._id) === targetId,
                                      ),
                                  );

                                  if (existingConv) {
                                    setSelectedConversationId(existingConv._id);
                                    setSearchQuery("");
                                    toast.success(
                                      `Opening chat with ${user.name}`,
                                    );
                                  } else {
                                    toast.loading(
                                      "Opening conversation...",
                                      { id: "create-conv" },
                                    );
                                    createConversation.mutate(
                                      { participantIds: [targetId] },
                                      {
                                        onSuccess: (response: any) => {
                                          const newConvId =
                                            response.data?.conversation?._id;
                                          if (newConvId) {
                                            setSelectedConversationId(
                                              newConvId,
                                            );
                                            setSearchQuery("");
                                            toast.success(
                                              `Chat with ${user.name} started`,
                                              { id: "create-conv" },
                                            );
                                          } else {
                                            toast.error(
                                              "Initialization failed",
                                              { id: "create-conv" },
                                            );
                                          }
                                        },
                                        onError: (error: any) => {
                                          toast.error(
                                            error?.message ||
                                            "Initialization failed",
                                            { id: "create-conv" },
                                          );
                                        },
                                      },
                                    );
                                  }
                                }}
                                className={cn(
                                  "w-full flex items-center gap-4 p-3 rounded-2xl transition-all border border-transparent",
                                  isCreatingConv &&
                                  "opacity-50 cursor-not-allowed",
                                )}
                              >
                                <Avatar className="w-11 h-11 border border-white/10 rounded-xl">
                                  <AvatarImage src={user.avatar} />
                                  <AvatarFallback className="bg-white/5 text-sm font-black uppercase">
                                    {user.name?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left min-w-0">
                                  <p className="text-sm font-bold text-white truncate">
                                    {user.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-medium tech-font">
                                    @{user.handle}
                                  </p>
                                </div>
                                {isCreatingConv ? (
                                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                ) : (
                                  <ArrowUpRight className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" />
                                )}
                              </m.button>
                            );
                          },
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-xs text-slate-500 font-medium">
                          No users found
                        </p>
                      </div>
                    )
                  ) : convsLoading ? (
                    <div className="space-y-4 px-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-20 bg-white/5 rounded-2xl animate-pulse"
                        />
                      ))}
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-20 px-6">
                      <div className="relative w-16 h-16 mx-auto mb-6">
                        <div className="w-16 h-16 flex items-center justify-center border border-white/10 rounded-full">
                          <MessageCircle className="w-8 h-8 text-slate-500" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-300 mb-2">
                        No conversations yet
                      </p>
                      <p className="text-xs text-slate-500">
                        Search for users to start chatting
                      </p>
                    </div>
                  ) : (
                    conversations.map((conv: Conversation) => {
                      // Filter out the current user from participants to get the "other" user
                      const other = conv.type === "group"
                        ? conv.participants[0]
                        : conv.participants.find(
                          (p) => p.userId !== profile?._id && p._id !== profile?._id
                        ) || conv.participants[0];

                      // Skip self-conversations (where we're chatting with ourselves)
                      if (conv.type === "direct" && !other) return null;
                      if (conv.type === "direct" && (other?.userId === profile?._id || other?._id === profile?._id)) return null;

                      const name =
                        conv.type === "group" ? conv.groupName : other?.name;
                      const isActive = selectedConversationId === conv._id;
                      return (
                        <m.button
                          key={conv._id}
                          whileHover={{ x: 4 }}
                          onClick={() => {
                            setSelectedConversationId(conv._id);
                            setView("dms");
                            // Hide sidebar on desktop when selecting a conversation
                            if (window.innerWidth >= 1024) {
                              setHideSidebarDesktop(true);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all relative group overflow-hidden border mb-1",
                            isActive
                              ? "bg-white/[0.04] border-white/10 shadow-2xl"
                              : "bg-transparent border-transparent hover:bg-white/[0.02]",
                          )}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary shadow-[0_0_12px_rgba(129,140,248,0.6)]" />
                          )}
                          <div className="relative">
                            <Avatar className="w-12 h-12 rounded-xl border border-white/10">
                              <AvatarImage
                                src={other?.avatar}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-white/5 text-xs font-bold text-white/40">
                                {name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#030712] transition-all z-20",
                                isActive
                                  ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                                  : "bg-slate-700",
                              )}
                            />
                          </div>

                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <p
                                className={cn(
                                  "text-sm font-medium tracking-tight transition-colors",
                                  isActive
                                    ? "text-primary"
                                    : "text-white",
                                )}
                              >
                                {name}
                              </p>
                              {conv.lastMessage && (
                                <span className="text-[10px] text-slate-500 group-hover:hidden">
                                  {new Date(conv.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            {conv.lastMessage && (
                              <p className="text-xs text-slate-500 truncate">
                                {conv.lastMessage.content}
                              </p>
                            )}
                          </div>

                          {/* Delete button - always visible on mobile, hover on desktop */}
                          <button
                            onClick={(e) => handleDeleteConversation(conv._id, name || 'this chat', e)}
                            className="flex lg:hidden lg:group-hover:flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all shrink-0"
                            title="Delete conversation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </m.button>
                      );
                    }).filter(Boolean)
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : view === "server" && selectedServer ? (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
                    <h3 className="text-xl font-black text-white italic tracking-tighter uppercase aether-font">
                      {selectedServer.name}
                    </h3>
                  </div>
                  <Terminal className="w-4 h-4 text-slate-600" />
                </div>
              </div>
              <ScrollArea className="flex-1 hide-scrollbar">
                <div className="p-4 space-y-10">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-3 mb-6">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
                        Audio Layers
                      </p>
                      <div className="p-2 bg-white/[0.03] rounded-xl cursor-pointer hover:text-primary transition-all border border-white/5">
                        <Cpu className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    {channels
                      .filter((c: Channel) => c.type !== "voice")
                      .map((ch: Channel) => (
                        <m.button
                          key={ch._id}
                          whileHover={{ x: 4 }}
                          onClick={() => setSelectedChannelId(ch._id)}
                          className={cn(
                            "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all relative group overflow-hidden border",
                            selectedChannelId === ch._id
                              ? "bg-primary/10 border-primary/30 text-primary shadow-[0_0_15px_rgba(129,140,248,0.2)]"
                              : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white",
                          )}
                        >
                          <span className="font-bold tracking-widest text-[11px] uppercase truncate">
                            {ch.name}
                          </span>
                          {selectedChannelId === ch._id && (
                            <div className="ml-auto w-1 h-4 bg-primary rounded-full shadow-[0_0_10px_rgba(129,140,248,0.6)]" />
                          )}
                        </m.button>
                      ))}
                  </div>
                  {channels.some((c: Channel) => c.type === "voice") && (
                    <div className="space-y-2">
                      <p className="px-3 mb-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                        Tactical Voice
                      </p>
                      {channels
                        .filter((c: Channel) => c.type === "voice")
                        .map((ch: Channel) => {
                          const isActive = roomId === ch._id;
                          return (
                            <m.button
                              key={ch._id}
                              whileHover={{ x: 4 }}
                              onClick={() => {
                                setSelectedChannelId(ch._id);
                                joinRoom(ch._id);
                              }}
                              className={cn(
                                "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all relative group overflow-hidden border",
                                isActive || selectedChannelId === ch._id
                                  ? "glass-luxe border-primary/30 text-primary"
                                  : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white",
                              )}
                            >
                              <Radio
                                className={cn(
                                  "w-4 h-4",
                                  isActive
                                    ? "text-primary animate-pulse"
                                    : "text-slate-600",
                                )}
                              />
                              <span className="font-bold tracking-widest text-[11px] uppercase truncate">
                                {ch.name}
                              </span>
                              {isActive && (
                                <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-ping shadow-[0_0_10px_rgba(129,140,248,0.8)]" />
                              )}
                            </m.button>
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
                      <AvatarFallback className="glass-luxe text-xs font-bold">
                        {profile?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full border-2 border-[#0F1117] shadow-[0_0_10px_rgba(129,140,248,0.4)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {profile?.name}
                    </p>
                    <p className="text-[10px] text-primary/80 font-bold uppercase tracking-widest">
                      Active Link
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-xl text-slate-500 hover:bg-white/10"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : view === "discover" ? (
            <div className="flex flex-col h-full uppercase tracking-tighter">
              <div className="p-6">
                <h2 className="text-2xl font-black text-white italic tracking-tighter mb-2 flex items-center gap-3">
                  <Compass className="w-6 h-6 text-primary" />
                  DISCOVER
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-6">
                  Scan emerging networks
                </p>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Scan protocols..."
                    className="pl-10 h-11 bg-white/5 border-white/10 text-sm rounded-2xl focus:border-primary/30 transition-all font-medium"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <ScrollArea className="flex-1 px-3">
                <div className="space-y-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-14 text-slate-400 hover:text-white bg-white/5 border border-dashed border-white/10 rounded-2xl"
                    onClick={() => setShowJoinServer(true)}
                  >
                    <Plus className="w-5 h-5 mr-3 text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest">
                      Inject Invite Code
                    </span>
                  </Button>
                  {discoverServers.map((s: Server) => (
                    <m.div
                      key={s._id}
                      whileHover={{ scale: 1.02, y: -2 }}
                      onClick={() => joinServer.mutate({ serverId: s._id })}
                      className="p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-primary/30 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/20 border border-white/10 flex items-center justify-center text-white font-black italic text-lg shadow-inner">
                          {s.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-white uppercase italic truncate">
                            {s.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">
                            {s.memberCount} OPERATIVES
                          </p>
                        </div>
                      </div>
                    </m.div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </div>

        {/* Main Chat Interface */}
        {/* MAIN CHAT INTERFACE */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-transparent relative z-10 overflow-hidden">
          {/* Header - Mobile optimized with safe-area */}
          <div className="min-h-[56px] h-auto pt-safe lg:h-24 px-3 sm:px-10 lg:px-12 py-2 lg:py-0 flex items-center justify-between border-b border-white/[0.03] bg-black/30 lg:bg-transparent backdrop-blur-xl relative overflow-hidden group shrink-0" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
            {/* Header Depth Layer - Organic Gradient */}
            <div className="absolute inset-0 z-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_0%,var(--premium-primary),transparent)] group-hover:opacity-[0.08] transition-opacity" />

            <div className="flex items-center gap-6 lg:gap-10 z-10">
              {/* Mobile menu toggle */}
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="lg:hidden w-11 h-11 rounded-xl glass-premium flex items-center justify-center shadow-lg shrink-0"
              >
                <MessageCircle className="w-5 h-5 text-primary" />
              </button>

              {/* Desktop back button - shows when sidebar is hidden */}
              {hideSidebarDesktop && (
                <button
                  onClick={() => {
                    setHideSidebarDesktop(false);
                    setSelectedConversationId(null);
                  }}
                  className="hidden lg:flex w-11 h-11 rounded-xl glass-premium items-center justify-center shadow-lg shrink-0 hover:bg-primary/10 transition-colors group/back"
                >
                  <ArrowLeft className="w-5 h-5 text-primary group-hover/back:scale-110 transition-transform" />
                </button>
              )}

              {view === "server" && selectedChannel ? (
                <div className="flex items-center gap-4 lg:gap-8 min-w-0">
                  <div className="hidden sm:flex w-12 lg:w-16 h-12 lg:h-16 rounded-[1rem] lg:rounded-[1.25rem] bg-primary/10 border border-primary/20 items-center justify-center shadow-[0_0_30px_rgba(129,140,248,0.1)] relative shrink-0">
                    <Cpu className="w-6 h-6 lg:w-8 lg:h-8 text-primary relative z-10" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-4">
                      <h2 className="font-bold text-white text-lg lg:text-3xl tracking-tight truncate premium-font">
                        {selectedChannel.name}
                      </h2>
                      <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest premium-font">
                          Online
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedConversation ? (
                <div
                  onClick={() => setShowContactPanel(true)}
                  className="flex items-center gap-4 lg:gap-6 min-w-0 cursor-pointer group"
                >
                  <div className="relative shrink-0 pr-2">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Avatar className="w-10 h-10 lg:w-16 lg:h-16 border border-white/[0.08] rounded-2xl shadow-2xl relative z-10 transition-transform group-hover:scale-105">
                      <AvatarImage
                        src={selectedConversation.participants[0]?.avatar}
                        className="object-cover"
                      />
                      <AvatarFallback className="glass-premium text-white text-xl font-bold uppercase">
                        {selectedConversation.participants[0]?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Dynamic Online Indicator */}
                    <OnlineIndicator
                      isOnline={selectedConversation.participants[0]?.isOnline}
                      size="lg"
                      className="absolute -bottom-1 -right-1 z-20"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h2 className="font-bold text-white text-lg lg:text-2xl tracking-tight truncate whitespace-nowrap premium-font group-hover:text-primary transition-colors">
                      {selectedConversation.type === "group"
                        ? selectedConversation.groupName
                        : selectedConversation.participants[0]?.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <OnlineIndicator
                        isOnline={selectedConversation.participants[0]?.isOnline}
                        lastSeen={selectedConversation.participants[0]?.lastSeen}
                        showLastSeen
                        size="sm"
                      />
                      {isMutedConversation && (
                        <BellOff className="w-3 h-3 text-amber-400 ml-1" />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 opacity-60">
                  <MessageCircle className="w-5 h-5 text-slate-500" />
                  <p className="text-sm text-slate-400">
                    Select a conversation to start messaging
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 lg:gap-8 z-10">
              {selectedConversation &&
                selectedConversation.type === "direct" && (
                  <div className="flex gap-4 lg:pr-8 lg:mr-4 border-r border-white/[0.03]">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        // Use supabaseId for Supabase Realtime channel targeting
                        const otherParticipant = selectedConversation.participants?.find(
                          (p: any) => p._id !== profile?._id && p.userId !== profile?._id
                        );
                        const targetId = otherParticipant?.supabaseId || otherParticipant?.userId || otherParticipant?._id;
                        if (targetId) initiateCall(targetId, "audio", { name: otherParticipant?.name, avatar: otherParticipant?.avatar });
                      }}
                      className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl glass-premium text-slate-400 hover:text-primary transition-all shadow-md group/btn shrink-0"
                    >
                      <Phone className="w-4 h-4 lg:w-5 lg:h-5 transition-transform group-hover:scale-110" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        // Use supabaseId for Supabase Realtime channel targeting
                        const otherParticipant = selectedConversation.participants?.find(
                          (p: any) => p._id !== profile?._id && p.userId !== profile?._id
                        );
                        const targetId = otherParticipant?.supabaseId || otherParticipant?.userId || otherParticipant?._id;
                        if (targetId) initiateCall(targetId, "video", { name: otherParticipant?.name, avatar: otherParticipant?.avatar });
                      }}
                      className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl glass-premium text-slate-400 hover:text-primary transition-all shadow-md group/btn shrink-0"
                    >
                      <Video className="w-4 h-4 lg:w-5 lg:h-5 transition-transform group-hover:scale-110" />
                    </Button>
                  </div>
                )}

              <div className="flex items-center gap-4">
                {view === "server" && (
                  <m.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowMembers(!showMembers)}
                    className={cn(
                      "w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl transition-all border",
                      showMembers
                        ? "bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(129,140,248,0.2)]"
                        : "glass-premium text-slate-500",
                    )}
                  >
                    <Users className="w-4 h-4 lg:w-5 lg:h-5 transition-transform hover:scale-110" />
                  </m.button>
                )}

                {/* Help Button - Always visible */}
                <m.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowFeaturesGuide(true)}
                  className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl transition-all border glass-premium text-slate-500 hover:text-primary hover:border-primary/30"
                  title="Chat Features Guide"
                >
                  <HelpCircle className="w-4 h-4 lg:w-5 lg:h-5" />
                </m.button>

                {/* Chat Theme Button */}
                <m.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowThemeSelector(true)}
                  className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl transition-all border glass-premium text-slate-500 hover:text-primary hover:border-primary/30"
                  title="Chat Theme"
                >
                  <Palette className="w-4 h-4 lg:w-5 lg:h-5" />
                </m.button>

                <div className="hidden sm:flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl glass-premium text-slate-400 hover:text-primary transition-all shadow-md group/btn"
                  >
                    <Pin className="w-4 h-4 lg:w-5 lg:h-5 transition-transform group-hover:scale-110" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl glass-premium text-slate-400 hover:text-primary transition-all shadow-md group/btn"
                  >
                    <MoreVertical className="w-4 h-4 lg:w-5 lg:h-5 transition-transform group-hover:scale-110" />
                  </Button>
                </div>

                {/* Delete Conversation Button - Mobile visible */}
                {selectedConversationId && selectedConversation && view === "dms" && (
                  <m.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => handleDeleteConversation(
                      selectedConversationId,
                      selectedConversation.type === "group"
                        ? selectedConversation.groupName
                        : selectedConversation.participants[0]?.name || 'this chat',
                      e
                    )}
                    className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl transition-all border glass-premium text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
                  </m.button>
                )}
              </div>
            </div>
          </div>

          {/* Main Area Wrapper */}
          <div className="flex-1 flex flex-row min-h-0 min-w-0 relative overflow-hidden">
            {/* Main Chat Content */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-transparent relative overflow-hidden">
              {view === "server" &&
                selectedChannel?.type === "voice" &&
                isInRoom &&
                (roomId === selectedChannelId ||
                  roomId === selectedChannel?._id) ? (
                <div className="flex-1 flex flex-col bg-slate-900/30 relative">
                  <ScrollArea className="flex-1 h-full">
                    <div className="p-8 h-full">
                      <div className="max-w-7xl mx-auto h-full">
                        <ParticipantsGrid />
                      </div>
                    </div>
                  </ScrollArea>

                  {/* Premium Voice Controls */}
                  <div className="h-24 lg:h-32 bg-[#030303]/80 backdrop-blur-3xl border-t border-primary/20 flex items-center justify-center gap-4 lg:gap-10 px-4 lg:px-8 relative z-20 shrink-0 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
                    {/* Control panel background effects */}
                    <div className="absolute inset-0 aether-grid opacity-[0.03] pointer-events-none" />

                    <m.button
                      whileHover={{ scale: 1.1, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleMute}
                      className={cn(
                        "w-12 h-12 lg:w-16 lg:h-16 rounded-2xl flex flex-col items-center justify-center transition-all border relative overflow-hidden group shadow-2xl",
                        isMuted
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
                          : "bg-primary/5 text-primary border-primary/30 hover:border-primary/60 shadow-[0_0_20px_rgba(0,243,255,0.1)]",
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      {isMuted ? (
                        <MicOff className="w-6 h-6" />
                      ) : (
                        <Mic className="w-6 h-6" />
                      )}
                      <span className="text-[7px] mt-1.5 font-black tracking-widest tech-font">
                        {isMuted ? "MIC_OFF" : "MIC_ON"}
                      </span>
                    </m.button>

                    <m.button
                      whileHover={{ scale: 1.1, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleVideo}
                      className={cn(
                        "w-12 h-12 lg:w-16 lg:h-16 rounded-2xl flex flex-col items-center justify-center transition-all border relative overflow-hidden group shadow-2xl",
                        isVideoOff
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
                          : "bg-primary/5 text-primary border-primary/30 hover:border-primary/60 shadow-[0_0_20px_rgba(0,243,255,0.1)]",
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      {isVideoOff ? (
                        <VideoOff className="w-6 h-6" />
                      ) : (
                        <Video className="w-6 h-6" />
                      )}
                      <span className="text-[7px] mt-1.5 font-black tracking-widest tech-font">
                        {isVideoOff ? "CAM_OFF" : "CAM_ON"}
                      </span>
                    </m.button>

                    <m.button
                      whileHover={{ scale: 1.1, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={
                        isScreenSharing ? stopScreenShare : startScreenShare
                      }
                      className={cn(
                        "w-12 h-12 lg:w-16 lg:h-16 rounded-2xl flex flex-col items-center justify-center transition-all border relative overflow-hidden group shadow-2xl",
                        isScreenSharing
                          ? "bg-primary/20 text-primary border-primary/50 shadow-[0_0_30px_rgba(0,243,255,0.2)]"
                          : "bg-primary/5 text-primary border-primary/30 hover:border-primary/60 shadow-[0_0_20px_rgba(0,243,255,0.1)]",
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      {isScreenSharing ? (
                        <MonitorOff className="w-6 h-6" />
                      ) : (
                        <Monitor className="w-6 h-6" />
                      )}
                      <span className="text-[7px] mt-1.5 font-black tracking-widest tech-font">
                        {isScreenSharing ? "STREAMING" : "SHARE_SCR"}
                      </span>
                    </m.button>

                    <div className="w-px h-12 bg-white/10 mx-2" />

                    <m.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={leaveRoom}
                      className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex flex-col items-center justify-center shadow-2xl border border-rose-500/40 hover:bg-rose-500 transition-all group hover:text-white"
                    >
                      <LogOut className="w-6 h-6 relative z-10 transition-transform group-hover:scale-110" />
                      <span className="text-[7px] mt-1.5 font-black tracking-widest tech-font relative z-10">
                        DISCONNECT
                      </span>
                    </m.button>
                  </div>
                </div>
              ) : (view === "server" && selectedChannelId) ||
                (view === "dms" && selectedConversationId) ? (
                <>
                  <ScrollArea className="flex-1 h-full">
                    <div className="p-3 sm:p-6 lg:p-8 space-y-1 min-h-full flex flex-col justify-end">
                      {messagesLoading ? (
                        <div className="space-y-8 py-10 flex-1">
                          {[1, 2, 3].map((i) => (
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
                        <div className="flex flex-col items-center justify-center py-20 select-none flex-1 relative">
                          <m.div
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            className="relative mb-8"
                          >
                            <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full flex items-center justify-center relative border border-white/10 bg-white/5">
                              <MessageCircle className="w-10 h-10 lg:w-14 lg:h-14 text-slate-500 opacity-40" />
                            </div>
                          </m.div>
                          <h3 className="font-semibold text-xl lg:text-3xl text-white mb-2">
                            No messages yet
                          </h3>
                          <p className="text-xs lg:text-sm text-slate-500 font-medium opacity-60">
                            Start a conversation to begin chatting
                          </p>
                        </div>
                      ) : (
                        currentMessages.map((msg: Message, idx: number) => {
                          // More robust isMe check - include Supabase user.id
                          const myIds = [
                            user?.id,
                            profile?._id,
                            profile?.userId,
                          ].filter(Boolean);
                          const senderIds = [
                            msg.senderId,
                            msg.sender?.userId,
                          ].filter(Boolean);
                          const isMe = myIds.some((myId) =>
                            senderIds.includes(myId),
                          );

                          // Avatar grouping logic available if needed

                          return (
                            <m.div
                              key={msg._id}
                              initial={{
                                opacity: 0,
                                x: isMe ? 20 : -20,
                                scale: 0.95,
                              }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 35,
                                delay: Math.min(idx * 0.01, 0.2),
                              }}
                              className={cn(
                                "group relative flex gap-3 transition-all py-1.5 px-4 sm:px-10 max-w-full",
                                isMe ? "flex-row-reverse" : "flex-row",
                                selectedMessageId === msg._id &&
                                "bg-white/[0.02]",
                              )}
                              onMouseEnter={() => setSelectedMessageId(msg._id)}
                              onMouseLeave={() => setSelectedMessageId(null)}
                            >
                              {/* Avatar */}
                              <div className="shrink-0 pt-1">
                                <div
                                  className={cn(
                                    "p-0.5 rounded-xl transition-all duration-500 border",
                                    isMe
                                      ? "border-primary/30"
                                      : "border-white/5",
                                  )}
                                >
                                  <Avatar className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg">
                                    <AvatarImage
                                      src={
                                        isMe
                                          ? profile?.avatar
                                          : msg.sender?.avatar
                                      }
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="glass-aether text-white/50 text-xs font-black uppercase">
                                      {(isMe
                                        ? profile?.name
                                        : msg.sender?.name
                                      )?.charAt(0) || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              </div>

                              <div
                                className={cn(
                                  "flex flex-col gap-1 sm:gap-1.5 max-w-[80%] xs:max-w-[85%] sm:max-w-[80%]",
                                  isMe && "items-end",
                                )}
                              >
                                {/* Identifier */}
                                <div
                                  className={cn(
                                    "flex items-center gap-2 sm:gap-3 px-1",
                                    isMe ? "flex-row-reverse" : "flex-row",
                                  )}
                                >
                                  <span className="text-[11px] sm:text-xs font-semibold text-white/90">
                                    {isMe ? "You" : msg.sender?.name || "User"}
                                  </span>
                                  <span className="text-[9px] sm:text-[10px] text-slate-600 font-medium">
                                    {formatTime(msg.createdAt)}
                                  </span>
                                  {/* Message status ticks for own messages */}
                                  {isMe && (
                                    <MessageTicks status={msg.status || 'sent'} className="w-3.5 h-3.5" />
                                  )}
                                </div>

                                <div
                                  className={cn(
                                    "relative px-4 py-3 sm:px-6 sm:py-5 rounded-[1.25rem] sm:rounded-[1.5rem] text-sm sm:text-[15px] leading-relaxed transition-all duration-500 group/bubble border shadow-sm",
                                    isMe
                                      ? "bg-primary/10 text-primary border-primary/20 rounded-tr-none"
                                      : "glass-card text-slate-200 rounded-tl-none backdrop-blur-3xl",
                                  )}
                                >
                                  {/* Depth Indicator */}
                                  {isMe && (
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                                  )}

                                  {msg.replyTo && (
                                    <div className="mb-4 pb-3 border-b border-white/5 flex items-center gap-3 opacity-60 text-[9px] font-black text-primary/80 tech-font uppercase tracking-widest italic">
                                      <Reply className="w-3 h-3" />
                                      <span className="truncate">
                                        REF: {msg.replyTo.sender?.name}
                                      </span>
                                    </div>
                                  )}

                                  <div className="selection:bg-primary/30 relative z-10 font-medium tracking-tight">
                                    {msg.content}
                                  </div>

                                  {msg.media && msg.media.length > 0 && (
                                    <div className="mt-4 p-1 rounded-xl overflow-hidden glass-aether shadow-inner border border-white/5">
                                      <MessageMedia media={msg.media as any} />
                                    </div>
                                  )}

                                  {/* Encryption Badge */}
                                  {isMe && (
                                    <div className="absolute -left-8 bottom-4 opacity-0 group-hover/bubble:opacity-100 transition-all flex flex-col gap-1 items-center">
                                      <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
                                      <span
                                        className="text-[7px] font-black text-primary uppercase tracking-[0.3em] rotate-180"
                                        style={{ writingMode: "vertical-rl" }}
                                      >
                                        AETHER
                                      </span>
                                    </div>
                                  )}

                                  {/* Delete Message Button - appears on hover for own messages */}
                                  {isMe && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Delete this message? It will be removed for everyone.')) {
                                          api.delete(`/chat/conversations/${selectedConversationId}/messages/${msg._id}`)
                                            .then(() => {
                                              toast.success('Message deleted');
                                              queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
                                            })
                                            .catch(() => toast.error('Failed to delete message'));
                                        }
                                      }}
                                      className="absolute -right-8 top-4 opacity-0 group-hover/bubble:opacity-100 transition-all w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center hover:bg-red-500/40"
                                    >
                                      <Trash2 className="w-3 h-3 text-red-400" />
                                    </button>
                                  )}

                                  {/* Reactions Panel */}
                                  {msg.reactions &&
                                    msg.reactions.length > 0 && (
                                      <div
                                        className={cn(
                                          "flex flex-wrap gap-2 mt-4",
                                          isMe
                                            ? "justify-end"
                                            : "justify-start",
                                        )}
                                      >
                                        {msg.reactions.map((r) => (
                                          <m.button
                                            key={r.emoji}
                                            whileHover={{ scale: 1.1, y: -2 }}
                                            onClick={() =>
                                              handleReaction(
                                                msg._id,
                                                r.emoji,
                                                r.users.includes(
                                                  profile?._id || "",
                                                ),
                                              )
                                            }
                                            className={cn(
                                              "px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 font-black tech-font",
                                              r.users.includes(
                                                profile?._id || "",
                                              )
                                                ? "bg-primary/10 border-primary/50 text-primary shadow-[0_0_15px_rgba(0,243,255,0.2)]"
                                                : "bg-white/[0.03] border-white/5 text-slate-500 hover:text-white",
                                            )}
                                          >
                                            <span className="text-sm">
                                              {r.emoji}
                                            </span>
                                            <span className="text-[10px] opacity-60 font-bold">
                                              {r.users.length}
                                            </span>
                                          </m.button>
                                        ))}
                                      </div>
                                    )}
                                </div>
                              </div>
                            </m.div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message Input Area */}
                  <div className="px-2 sm:px-6 lg:px-8 pb-3 lg:pb-10 shrink-0 relative z-10">
                    <div className="glass-premium rounded-2xl lg:rounded-3xl p-2 sm:p-4 lg:p-5 relative group focus-within:border-primary/40 transition-all duration-700">


                      {replyingTo && (
                        <div className="absolute bottom-full left-4 right-4 mb-6 px-6 py-4 glass-premium border border-primary/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-bottom-6 z-20 shadow-2xl">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Reply className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-semibold text-primary uppercase tracking-widest">
                                Replying to {replyingTo.sender?.name}
                              </span>
                              <span className="text-[13px] text-slate-300 font-medium truncate max-w-[500px] mt-0.5">
                                {replyingTo.content}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-10 h-10 rounded-xl hover:bg-white/10 text-slate-500 hover:text-rose-500"
                            onClick={() => setReplyingTo(null)}
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                      )}

                      {typingUsers.length > 0 && (
                        <div className="absolute -top-14 left-8 flex items-center gap-4 px-6 py-2.5 glass-premium rounded-full border border-primary/20 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex gap-1.5">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                          </div>
                          <span className="text-[11px] font-bold text-primary premium-font">
                            typing...
                          </span>
                        </div>
                      )}

                      {pendingFiles.length > 0 && (
                        <div className="mb-4">
                          <MediaPreview
                            files={pendingFiles}
                            onRemove={removeFile}
                            onClear={() => setPendingFiles([])}
                          />
                        </div>
                      )}

                      {/* Hidden file input for media upload - includes documents */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-h-[44px] lg:min-h-[56px] px-2 sm:px-3">
                        {/* Plus Menu with Options */}
                        <div className="relative">
                          <m.button
                            whileHover={{ scale: 1.1, rotate: showMediaPlusMenu ? 0 : 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowMediaPlusMenu(!showMediaPlusMenu)}
                            className={cn(
                              "w-10 h-10 rounded-[0.85rem] glass-premium transition-all flex items-center justify-center shrink-0 shadow-lg",
                              showMediaPlusMenu ? "text-primary rotate-45" : "text-slate-400 hover:text-primary"
                            )}
                          >
                            <Plus className="w-5 h-5" />
                          </m.button>

                          {/* Plus Menu Dropdown with Mobile Optimization */}
                          <AnimatePresence>
                            {showMediaPlusMenu && (
                              <>
                                {/* Backdrop overlay for mobile */}
                                <m.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  onClick={() => setShowMediaPlusMenu(false)}
                                  className="fixed inset-0 bg-black/50 z-40 sm:hidden"
                                />
                                <m.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute bottom-14 left-0 w-52 sm:w-48 p-2 bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl z-[100]"
                                >
                                  <button
                                    onClick={() => { fileInputRef.current?.click(); setShowMediaPlusMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 sm:py-2.5 rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors text-left"
                                  >
                                    <Image className="w-5 h-5 sm:w-4 sm:h-4 text-blue-400" />
                                    <span className="text-sm font-medium text-white">Photos & Files</span>
                                  </button>
                                  <button
                                    onClick={() => { setShowVideoRecorder(true); setShowMediaPlusMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 sm:py-2.5 rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors text-left"
                                  >
                                    <Camera className="w-5 h-5 sm:w-4 sm:h-4 text-purple-400" />
                                    <span className="text-sm font-medium text-white">Record Video</span>
                                  </button>
                                  <button
                                    onClick={() => { setShowVoiceRecorder(true); setShowMediaPlusMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 sm:py-2.5 rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors text-left"
                                  >
                                    <Mic className="w-5 h-5 sm:w-4 sm:h-4 text-rose-400" />
                                    <span className="text-sm font-medium text-white">Voice Message</span>
                                  </button>
                                  <button
                                    onClick={() => { setShowLocationPicker(true); setShowMediaPlusMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 sm:py-2.5 rounded-xl hover:bg-white/10 active:bg-white/20 transition-colors text-left"
                                  >
                                    <Compass className="w-5 h-5 sm:w-4 sm:h-4 text-emerald-400" />
                                    <span className="text-sm font-medium text-white">Share Location</span>
                                  </button>
                                </m.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="flex-1 flex flex-col justify-center relative">
                          <Input
                            value={messageInput}
                            onChange={(e) => {
                              setMessageInput(e.target.value);
                              handleTyping();
                            }}
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              !e.shiftKey &&
                              handleSendMessage()
                            }
                            placeholder="Type a message..."
                            className="bg-transparent border-0 focus-visible:ring-0 px-0 h-auto text-white text-[14px] lg:text-[15px] font-medium placeholder:text-slate-600 premium-font tracking-tight"
                          />
                        </div>

                        <div className="hidden sm:flex items-center gap-4 lg:gap-6 border-l border-white/5 pl-4 lg:pl-8 h-10">
                          {isRecordingVoice ? (
                            <m.div
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="flex items-center gap-4 px-6 py-2 glass-aether border border-rose-500/30 rounded-2xl shadow-[0_0_30px_rgba(244,63,94,0.1)]"
                            >
                              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest premium-font">
                                Recording
                              </span>
                              <button
                                onClick={() => setIsRecordingVoice(false)}
                                className="text-rose-500/40 hover:text-rose-500 transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </m.div>
                          ) : (
                            <m.button
                              whileHover={{ scale: 1.1, color: "#F43F5E" }}
                              onClick={() => setIsRecordingVoice(true)}
                              className="w-10 h-10 flex items-center justify-center text-slate-500 transition-all hover:text-rose-400 opacity-60 hover:opacity-100"
                            >
                              <Mic className="w-5 h-5" />
                            </m.button>
                          )}

                          <m.button
                            whileHover={{ scale: 1.1, color: "var(--primary)" }}
                            className="w-10 h-10 flex items-center justify-center text-slate-500 transition-all opacity-60 hover:opacity-100"
                          >
                            <Smile className="w-5 h-5" />
                          </m.button>
                        </div>

                        <m.button
                          whileHover={{ scale: 1.05, x: 2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSendMessage}
                          disabled={
                            (!messageInput.trim() &&
                              pendingFiles.length === 0) ||
                            sendChannelMessage.isPending ||
                            sendDmMessage.isPending ||
                            isUploading
                          }
                          className={cn(
                            "w-10 h-10 lg:w-12 lg:h-12 rounded-[1rem] flex items-center justify-center transition-all duration-500 shadow-2xl flex-shrink-0 relative overflow-hidden group/send border",
                            messageInput.trim() || pendingFiles.length > 0
                              ? "bg-primary/20 text-primary border-primary/30 shadow-[0_0_40px_rgba(129,140,248,0.2)] hover:bg-primary/30"
                              : "bg-white/[0.03] border-white/5 text-slate-700 cursor-not-allowed shadow-none",
                          )}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover/send:opacity-100 transition-opacity" />
                          <Send className="w-4 h-4 lg:w-5 lg:h-5 relative z-10 transition-transform group-hover/send:translate-x-1 group-hover/send:-translate-y-1" />
                        </m.button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in relative bg-transparent overflow-hidden">
                  {/* Subtle Background Pattern */}
                  <div className="absolute inset-0 bg-grid-pattern opacity-5" />

                  <div className="relative flex flex-col items-center max-w-sm">
                    {/* Compact Premium Orb */}
                    <div className="relative mb-8">
                      <m.div
                        animate={{
                          scale: [1, 1.1, 1],
                          opacity: [0.08, 0.15, 0.08]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-[-40px] bg-primary/20 blur-[60px] rounded-full"
                      />
                      <m.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="w-24 h-24 lg:w-32 lg:h-32 flex items-center justify-center relative z-10"
                      >
                        <m.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          className="p-6 lg:p-8 rounded-[2.5rem] glass-premium border border-white/10 shadow-2xl bg-white/[0.02]"
                        >
                          <Sparkles className="w-10 h-10 lg:w-14 lg:h-14 text-primary drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]" />
                        </m.div>
                      </m.div>
                    </div>

                    <div className="space-y-4 relative z-10">
                      <h2 className="text-3xl lg:text-5xl font-black tracking-tight premium-gradient-text premium-font italic uppercase">
                        TrueVibe
                      </h2>
                      <div className="h-px w-12 bg-primary/30 mx-auto" />
                      <p className="text-xs lg:text-sm text-slate-500 font-bold uppercase tracking-[0.2em] premium-font px-4 leading-relaxed">
                        Select a conversation to start <br /> messaging with your team
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Members Sidebar */}
            {view === "server" &&
              showMembers &&
              selectedServer?.memberProfiles && (
                <div className="w-[320px] glass-aether border-l border-white/5 p-10 flex flex-col shrink-0 relative overflow-hidden shadow-2xl bg-black/10 backdrop-blur-3xl">
                  <div className="absolute top-0 right-0 w-32 h-64 bg-primary/5 blur-[120px] pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-64 bg-secondary/5 blur-[120px] pointer-events-none" />

                  <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-8 flex items-center justify-between opacity-80">
                    <span>Members</span>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-md border border-primary/30 text-[10px] font-bold">
                        {selectedServer.memberProfiles.length}
                      </span>
                    </div>
                  </h3>

                  <ScrollArea className="flex-1 -mx-4 px-4">
                    <div className="space-y-8 pb-10">
                      {selectedServer.memberProfiles
                        .slice(0, 50)
                        .map((m: any, idx: number) => (
                          <m.div
                            key={m._id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className="flex items-center gap-5 group cursor-pointer relative"
                          >
                            <div className="relative">
                              <div className="p-0.5 rounded-xl border border-white/5 glass-aether group-hover:border-primary/40 transition-all duration-500 z-10 relative shadow-lg">
                                <Avatar className="w-12 h-12 rounded-lg">
                                  <AvatarImage
                                    src={m.avatar}
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="glass-aether text-white/50 text-[10px] font-black uppercase">
                                    {m.name?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              {/* Status Pulse */}
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#030712] p-0.5 z-20">
                                <div className="w-full h-full rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))] group-hover:scale-110 transition-transform" />
                              </div>
                            </div>
                            <div className="flex flex-col min-w-0 z-10">
                              <span className="text-[13px] font-black text-slate-200 group-hover:text-primary transition-colors truncate uppercase italic tracking-tight aether-font">
                                {m.name}
                              </span>
                              <div className="flex items-center gap-2 mt-1 opacity-50">
                                <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] tech-font truncate">
                                  NODE_ID:{m._id?.slice(-4)}
                                </span>
                              </div>
                            </div>

                            {/* Hover Technical Detail */}
                            <div className="absolute right-0 opacity-0 group-hover:opacity-40 transition-opacity translate-x-4 group-hover:translate-x-0 transition-all">
                              <div className="w-6 h-px bg-primary/40" />
                            </div>
                          </m.div>
                        ))}
                    </div>
                  </ScrollArea>

                  <div className="mt-8 p-6 border border-white/5 glass-aether rounded-3xl relative overflow-hidden group/load">
                    <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none" />
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-primary group-hover/load:animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] tech-font">
                          Network Load
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-primary tech-font">
                        24%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative shadow-inner">
                      <m.div
                        animate={{
                          width: ["20%", "28%", "24%"],
                          opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="h-full bg-gradient-to-r from-primary to-primary/40 shadow-[0_0_15px_rgba(129,140,248,0.4)] relative"
                      >
                        {/* Scanning Line in Progress Bar */}
                        <m.div
                          animate={{ left: ["-100%", "100%"] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        />
                      </m.div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em] italic tech-font">
                        SECURE_CHANNEL_READY
                      </span>
                      <div className="flex gap-1.5">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="w-1 h-1 rounded-full bg-primary/20"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>

        <AnimatePresence>
          {showCreateServer && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#0a0a0f] sm:bg-black/95 sm:backdrop-blur-3xl flex items-center justify-center z-[100] p-4 sm:p-6"
              onClick={() => setShowCreateServer(false)}
            >
              <m.div
                initial={{ scale: 0.9, y: 40, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 40, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#0d0d12] sm:glass-luxe border border-white/10 sm:border-primary/20 rounded-2xl sm:rounded-[3rem] p-6 sm:p-10 lg:p-14 w-full max-w-xl shadow-[0_0_100px_rgba(129,140,248,0.1)] relative overflow-hidden"
              >
                {/* Decorative HUD Accents - hidden on mobile */}
                <div className="hidden sm:block absolute top-0 left-0 w-32 h-px bg-gradient-to-r from-primary/40 to-transparent" />
                <div className="hidden sm:block absolute top-0 left-0 w-px h-32 bg-gradient-to-b from-primary/40 to-transparent" />
                <div className="hidden sm:block absolute bottom-0 right-0 w-32 h-px bg-gradient-to-l from-violet-500/40 to-transparent" />
                <div className="hidden sm:block absolute bottom-0 right-0 w-px h-32 bg-gradient-to-t from-violet-500/40 to-transparent" />

                {/* Close button for mobile */}
                <button
                  onClick={() => setShowCreateServer(false)}
                  className="absolute top-4 right-4 sm:hidden w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center z-20"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                <div className="relative z-10">
                  <div className="flex items-center gap-4 sm:gap-6 mb-6 sm:mb-10">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-primary/10 sm:glass-luxe border border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(129,140,248,0.2)]">
                      <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-3xl font-black text-white italic uppercase tracking-tighter glitch-hover">
                        Initialize Node
                      </h2>
                      <div className="flex items-center gap-2 sm:gap-3 mt-1">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <p className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] tech-font">
                          Create your server
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 sm:space-y-10">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between px-1 sm:px-2">
                        <label className="text-[10px] text-primary/60 font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] tech-font">
                          Server Name
                        </label>
                        <span className="text-[9px] text-emerald-500 font-bold">REQUIRED</span>
                      </div>
                      <div className="relative group">
                        <Input
                          value={newServerName}
                          onChange={(e) => setNewServerName(e.target.value)}
                          placeholder="Enter server name..."
                          className="h-14 sm:h-20 bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl px-4 sm:px-8 text-base sm:text-xl font-bold sm:font-black text-white focus:border-primary/50 focus:ring-0 transition-all outline-none placeholder:text-slate-600"
                        />
                        <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-100 transition-opacity">
                          <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 pt-4">
                      <button
                        className="order-2 sm:order-1 flex-1 h-12 sm:h-16 rounded-xl sm:rounded-2xl font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-all text-xs"
                        onClick={() => setShowCreateServer(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className={cn(
                          "order-1 sm:order-2 flex-1 h-12 sm:h-16 rounded-xl sm:rounded-2xl font-bold uppercase tracking-widest transition-all text-xs flex items-center justify-center gap-3 border shadow-xl",
                          newServerName.trim()
                            ? "bg-primary text-white sm:bg-primary/10 sm:border-primary/50 sm:text-primary shadow-[0_0_30px_rgba(129,140,248,0.2)] hover:bg-primary/90 sm:hover:bg-primary/20"
                            : "bg-white/5 border-white/10 text-slate-500 cursor-not-allowed shadow-none",
                        )}
                        onClick={handleCreateServer}
                        disabled={
                          createServer.isPending || !newServerName.trim()
                        }
                      >
                        {createServer.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            Create Server
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </m.div>
            </m.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showJoinServer && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#0a0a0f] sm:bg-black/80 sm:backdrop-blur-2xl z-[100] flex items-center justify-center p-4 sm:p-6"
              onClick={() => setShowJoinServer(false)}
            >
              <m.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[500px] bg-[#0d0d12] sm:glass-aether border border-white/10 rounded-2xl sm:rounded-[2.5rem] shadow-[0_60px_120px_rgba(0,0,0,0.8)] relative overflow-hidden"
              >
                <div className="hidden sm:block absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/2 pointer-events-none" />
                <div className="p-6 sm:p-8 lg:p-12 space-y-6 sm:space-y-10 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 sm:glass-aether border border-primary/30 flex items-center justify-center relative overflow-hidden">
                        <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white">
                          Join Node
                        </h3>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                          Enter bridge identifier to sync
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowJoinServer(false)}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 sm:glass-aether border border-white/10 flex items-center justify-center hover:text-rose-500 transition-colors"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <div className="space-y-6 sm:space-y-8">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Identifier
                        </label>
                        <span className="text-[9px] text-emerald-500 font-bold px-2 py-0.5 bg-emerald-500/10 rounded-full">
                          REQUIRED
                        </span>
                      </div>
                      <div className="relative group/input">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                          <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                        </div>
                        <Input
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          placeholder="Enter node ID..."
                          className="h-14 sm:h-16 bg-black/40 border border-white/10 rounded-xl sm:rounded-2xl pl-11 sm:pl-14 pr-4 text-base sm:text-lg font-bold text-white focus:border-primary/50 focus:ring-0 transition-all outline-none placeholder:text-slate-600"
                        />
                      </div>

                      {/* Helper text */}
                      <div className="flex items-start gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                        <Info className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" />
                        <p className="text-[10px] sm:text-xs text-slate-400 leading-relaxed">
                          Some nodes may require a manual verification protocol before the sync can be completed.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <button
                        className={cn(
                          "order-1 sm:order-2 flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl font-bold uppercase tracking-wider transition-all text-xs flex items-center justify-center gap-2 border relative overflow-hidden",
                          inviteCode.trim()
                            ? "bg-primary text-white sm:bg-primary/10 sm:border-primary/50 sm:text-primary shadow-[0_0_20px_rgba(0,243,255,0.15)] hover:bg-primary/90 sm:hover:bg-primary/20"
                            : "bg-white/5 border-white/10 text-slate-500 cursor-not-allowed",
                        )}
                        onClick={handleJoinServer}
                        disabled={joinServer.isPending || !inviteCode.trim()}
                      >
                        {joinServer.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            Execute Sync
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                      <button
                        className="order-2 sm:order-1 flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-all text-xs"
                        onClick={() => setShowJoinServer(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </m.div>
            </m.div>
          )}
        </AnimatePresence>

        <JoinRoomModal
          isOpen={showJoinRoomModal}
          onClose={() => {
            setShowJoinRoomModal(false);
            setPendingRoomId(null);
          }}
          initialRoomId={pendingRoomId || ""}
        />

        <CreateRoomModal
          isOpen={showCreateRoomModal}
          onClose={() => setShowCreateRoomModal(false)}
          onRoomCreated={(roomId) => {
            console.log("Room created:", roomId);
          }}
        />
        <MediaUploader
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onFilesSelected={handleFilesSelected}
          onVoiceRecord={() => setIsRecordingVoice(true)}
          onCreateVoiceRoom={() => {
            setShowCreateRoomModal(true);
            setShowMediaPicker(false);
          }}
        />

        {/* Features Guide Modal */}
        <AnimatePresence>
          {showFeaturesGuide && (
            <>
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFeaturesGuide(false)}
                className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100]"
              />
              <m.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-[101] flex items-center justify-center p-4"
              >
                <div className="w-full max-w-xl max-h-[80vh] overflow-y-auto bg-[#0a0a0f] rounded-2xl border border-white/10 p-5 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <HelpCircle className="w-4 h-4 text-primary" />
                      </div>
                      <h2 className="text-lg font-bold text-white">Chat Features</h2>
                    </div>
                    <button
                      onClick={() => setShowFeaturesGuide(false)}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Direct Messages */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">💬 Chat with Friends</h3>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Send private messages to anyone! You can share photos, videos, and voice notes too.
                      </p>
                    </div>

                    {/* Voice & Video Calls */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <Phone className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">📞 Voice & Video Calls</h3>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Call your friends! Tap the phone icon for voice or camera icon for video. Works just like FaceTime!
                      </p>
                    </div>

                    {/* Servers */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                          <Hash className="w-4 h-4 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">🏠 Servers</h3>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed mb-3">
                        Create your own community! Like Discord servers - make different chat rooms for different topics.
                        Your friends can join with an invite code.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium">Always There</span>
                        <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium">Multiple Rooms</span>
                      </div>
                    </div>

                    {/* Voice Rooms */}
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center">
                          <Headphones className="w-4 h-4 text-orange-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">🎧 Voice Rooms</h3>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed mb-3">
                        Quick group calls! Create a room, share the link, and anyone can join.
                        Perfect for hanging out or quick group chats. Room disappears when everyone leaves.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-medium">Quick Setup</span>
                        <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-medium">Share Link</span>
                        <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-medium">Screen Share</span>
                      </div>
                    </div>

                    {/* Difference Section */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                          <Info className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-white">🤔 Server vs Room?</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="p-4 rounded-xl bg-black/20">
                          <h4 className="font-bold text-purple-400 mb-2">🏠 Servers are...</h4>
                          <ul className="text-sm text-slate-400 space-y-1.5">
                            <li>• For communities & groups</li>
                            <li>• Stays forever</li>
                            <li>• Multiple chat channels</li>
                            <li>• Invite friends with code</li>
                          </ul>
                        </div>
                        <div className="p-4 rounded-xl bg-black/20">
                          <h4 className="font-bold text-orange-400 mb-2">🎧 Rooms are...</h4>
                          <ul className="text-sm text-slate-400 space-y-1.5">
                            <li>• For quick hangouts</li>
                            <li>• Disappears when empty</li>
                            <li>• Voice & video focus</li>
                            <li>• Share link to join</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setShowFeaturesGuide(false)}
                      className="px-5 py-2 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary font-bold transition-colors text-sm"
                    >
                      Got it!
                    </button>
                  </div>
                </div>
              </m.div>
            </>
          )}
        </AnimatePresence>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {showMobileSidebar && (
            <>
              {/* Backdrop */}
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileSidebar(false)}
                className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />
              {/* Sidebar */}
              <m.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="lg:hidden fixed left-0 top-0 bottom-0 w-[85vw] max-w-[340px] glass-aether z-50 border-r border-white/5 flex flex-col shadow-[40px_0_80px_rgba(0,0,0,0.9)] bg-black/40 backdrop-blur-3xl"
              >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 aether-grid opacity-[0.03] pointer-events-none" />
                  <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center relative">
                      <Terminal className="w-4 h-4 text-primary relative z-10" />
                    </div>
                    TrueVibe
                  </h2>
                  <button
                    onClick={() => setShowMobileSidebar(false)}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:text-rose-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile View Tabs */}
                <div className="flex gap-2 px-4 py-4 border-b border-white/5 shrink-0 bg-white/[0.01]">
                  <button
                    onClick={() => setView("dms")}
                    className={cn(
                      "flex-1 py-3 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      view === "dms"
                        ? "bg-primary/20 text-primary border border-primary/40"
                        : "text-slate-500 hover:bg-white/5",
                    )}
                  >
                    Chats
                  </button>
                  <button
                    onClick={() => setView("server")}
                    className={cn(
                      "flex-1 py-3 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      view === "server"
                        ? "bg-primary/20 text-primary border border-primary/40"
                        : "text-slate-500 hover:bg-white/5",
                    )}
                  >
                    Servers
                  </button>
                  <button
                    onClick={() => setView("discover")}
                    className={cn(
                      "flex-1 py-3 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      view === "discover"
                        ? "bg-primary/20 text-primary border border-primary/40"
                        : "text-slate-500 hover:bg-white/5",
                    )}
                  >
                    Discover
                  </button>
                </div>

                {/* Content based on view */}
                <ScrollArea className="flex-1 px-3 py-4">
                  {view === "dms" ? (
                    <div className="space-y-2">
                      <p className="px-2 mb-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Messages
                      </p>
                      {convsLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="h-16 rounded-2xl animate-pulse border border-white/5 bg-white/5"
                            />
                          ))}
                        </div>
                      ) : conversations.length === 0 ? (
                        <div className="text-center py-12 px-8 border border-dashed border-white/5 rounded-3xl">
                          <MessageCircle className="w-10 h-10 text-slate-700 mx-auto mb-4 opacity-40" />
                          <p className="text-xs font-medium text-slate-500">
                            No messages yet
                          </p>
                        </div>
                      ) : (
                        conversations.map((conv: Conversation) => {
                          const other = conv.participants[0];
                          const name =
                            conv.type === "group"
                              ? conv.groupName
                              : other?.name;
                          const isActive = selectedConversationId === conv._id;
                          return (
                            <div
                              key={conv._id}
                              className={cn(
                                "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all border group",
                                isActive
                                  ? "bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(0,243,255,0.1)]"
                                  : "border-transparent hover:bg-white/[0.03]",
                              )}
                            >
                              <button
                                onClick={() => {
                                  setSelectedConversationId(conv._id);
                                  setView("dms");
                                  setShowMobileSidebar(false);
                                }}
                                className="flex items-center gap-4 flex-1 min-w-0"
                              >
                                <div className="relative shrink-0">
                                  <Avatar className="w-11 h-11 rounded-xl border border-white/10 group-hover:border-primary/40 transition-all">
                                    <AvatarImage
                                      src={other?.avatar}
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="glass-aether text-[10px] font-black">
                                      {name?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#030303] p-0.5">
                                    <div className="w-full h-full rounded-full bg-primary" />
                                  </div>
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                  <p
                                    className={cn(
                                      "text-xs font-black uppercase italic tracking-tight aether-font truncate",
                                      isActive ? "text-primary" : "text-white",
                                    )}
                                  >
                                    {name}
                                  </p>
                                  {conv.lastMessage && (
                                    <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                                      {conv.lastMessage.content}
                                    </p>
                                  )}
                                </div>
                              </button>
                              {/* Delete button for mobile */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConversation(conv._id, name || 'this chat', e);
                                }}
                                className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all shrink-0 border border-red-500/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : view === "server" ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-2 mb-3">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Your Servers
                        </p>
                        <button
                          onClick={() => {
                            setShowCreateServer(true);
                            setShowMobileSidebar(false);
                          }}
                          className="w-8 h-8 rounded-xl glass-aether text-primary flex items-center justify-center hover:bg-primary/10 transition-colors border border-primary/20 shadow-[0_0_15px_rgba(0,243,255,0.1)]"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {serversLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="h-16 rounded-2xl animate-pulse border border-white/5 bg-white/5"
                            />
                          ))}
                        </div>
                      ) : servers.length === 0 ? (
                        <div className="text-center py-12 px-8 border border-dashed border-white/5 rounded-3xl">
                          <Terminal className="w-10 h-10 text-slate-700 mx-auto mb-4 opacity-40" />
                          <p className="text-xs font-medium text-slate-500 mb-4">
                            No servers found
                          </p>
                          <button
                            onClick={() => {
                              setShowCreateServer(true);
                              setShowMobileSidebar(false);
                            }}
                            className="px-6 py-3 rounded-2xl bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20"
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
                                if (server.channels?.[0])
                                  setSelectedChannelId(server.channels[0]._id);
                                setView("server");
                                setShowMobileSidebar(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all border group",
                                isActive
                                  ? "bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(0,243,255,0.1)]"
                                  : "border-transparent hover:bg-white/[0.03]",
                              )}
                            >
                              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm aether-font group-hover:bg-primary/20 transition-all">
                                {server.name.charAt(0)}
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <p
                                  className={cn(
                                    "text-xs font-black uppercase italic tracking-tight aether-font truncate",
                                    isActive ? "text-primary" : "text-white",
                                  )}
                                >
                                  {server.name}
                                </p>
                                <p className="text-[10px] text-slate-500 tech-font uppercase tracking-widest mt-0.5">
                                  {server.memberCount || 0} NODES
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}

                      {/* Channels for selected server */}
                      {selectedServer && channels.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <p className="px-2 mb-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                            Channels
                          </p>
                          {channels.map((ch: Channel) => (
                            <button
                              key={ch._id}
                              onClick={() => {
                                setSelectedChannelId(ch._id);
                                if (ch.type === "voice") joinRoom(ch._id);
                                setShowMobileSidebar(false);
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left",
                                selectedChannelId === ch._id
                                  ? "bg-primary/10 text-primary"
                                  : "text-slate-500 hover:bg-white/5 transition-colors"
                                ,
                              )}
                            >
                              {ch.type === "voice" ? (
                                <Radio className="w-3.5 h-3.5" />
                              ) : (
                                <MessageCircle className="w-3.5 h-3.5" />
                              )}
                              <span className="text-[11px] font-bold truncate">
                                {ch.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="px-2 mb-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] tech-font">
                        Network Discovery
                      </p>
                      <button
                        onClick={() => {
                          setShowJoinServer(true);
                          setShowMobileSidebar(false);
                        }}
                        className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-slate-500 hover:text-primary hover:border-primary/40 transition-all group/join"
                      >
                        <div className="w-9 h-9 rounded-xl glass-aether flex items-center justify-center border border-white/5 group-hover/join:border-primary/30 transition-all">
                          <Plus className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest tech-font">
                          Join_Uplink
                        </span>
                      </button>

                      <div className="space-y-3">
                        {discoverServers.map((s: Server) => (
                          <button
                            key={s._id}
                            onClick={() => {
                              joinServer.mutate({ serverId: s._id });
                              setShowMobileSidebar(false);
                            }}
                            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl glass-aether border border-white/5 hover:bg-white/[0.05] transition-all group"
                          >
                            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm aether-font group-hover:bg-primary/20 transition-all">
                              {s.name.charAt(0)}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-xs font-black uppercase italic tracking-tight aether-font text-white truncate">
                                {s.name}
                              </p>
                              <p className="text-[10px] text-slate-500 tech-font uppercase tracking-widest mt-0.5">
                                {s.memberCount || 0} NODES
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-primary transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </ScrollArea>

                {/* User Footer */}
                <div className="p-3 glass-luxe-light border-t border-white/5 shrink-0">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <Avatar className="w-9 h-9 rounded-lg border border-primary/20">
                      <AvatarImage src={profile?.avatar} />
                      <AvatarFallback className="text-xs font-bold">
                        {profile?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">
                        {profile?.name}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[8px] font-bold text-primary/60 uppercase tracking-wider">
                          Online
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </m.div>
            </>
          )}
        </AnimatePresence>

        {/* WhatsApp-Style Contact Profile Panel */}
        <AnimatePresence>
          {showContactPanel && selectedConversation && (
            <>
              {/* Mobile backdrop overlay */}
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[9998] sm:hidden"
                onClick={() => setShowContactPanel(false)}
              />
              <m.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed inset-0 sm:absolute sm:inset-auto sm:top-0 sm:right-0 w-full sm:w-80 h-full bg-slate-950 sm:bg-[#0a0f1a]/95 sm:backdrop-blur-2xl sm:border-l border-white/10 z-[9999] flex flex-col overflow-hidden overflow-y-auto"
              >
                {/* Panel Header */}
                <div className="p-3 sm:p-4 border-b border-white/10 flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setShowContactPanel(false)}
                    className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95"
                  >
                    <X className="w-5 h-5 text-white/70" />
                  </button>
                  <h3 className="text-lg sm:text-base font-bold text-white">Contact Info</h3>
                </div>

                {/* User Profile Section */}
                <div className="p-6 flex flex-col items-center text-center border-b border-white/10">
                  <div className="relative mb-4">
                    <Avatar className="w-24 h-24 rounded-2xl border-2 border-primary/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                      <AvatarImage
                        src={selectedConversation.participants?.[0]?.avatar}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-indigo-500/20 text-white">
                        {selectedConversation.participants?.[0]?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-3 border-[#0a0f1a] flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  </div>

                  <h4 className="text-lg font-bold text-white mb-1">
                    {selectedConversation.type === "group"
                      ? selectedConversation.groupName
                      : selectedConversation.participants?.[0]?.name}
                  </h4>
                  <p className="text-sm text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </p>

                  {isUserBlocked && (
                    <div className="mt-3 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-full">
                      <span className="text-xs font-semibold text-red-400">⛔ User Blocked</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="p-4 grid grid-cols-3 gap-3 border-b border-white/10">
                  <button
                    onClick={() => {
                      const targetId = otherParticipantId;
                      const targetUser = selectedConversation.participants?.find((p: any) => p._id !== profile?._id && p.userId !== profile?._id);
                      if (targetId) initiateCall(targetId, "audio", { name: targetUser?.name, avatar: targetUser?.avatar });
                      setShowContactPanel(false);
                    }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-primary/10 transition-colors group"
                  >
                    <Phone className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-semibold text-slate-400 group-hover:text-white">Call</span>
                  </button>
                  <button
                    onClick={() => {
                      const targetId = otherParticipantId;
                      const targetUser = selectedConversation.participants?.find((p: any) => p._id !== profile?._id && p.userId !== profile?._id);
                      if (targetId) initiateCall(targetId, "video", { name: targetUser?.name, avatar: targetUser?.avatar });
                      setShowContactPanel(false);
                    }}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-primary/10 transition-colors group"
                  >
                    <Video className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-semibold text-slate-400 group-hover:text-white">Video</span>
                  </button>
                  <button
                    onClick={() => window.open(`/app/profile/${otherParticipantId}`, '_blank')}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-primary/10 transition-colors group"
                  >
                    <User className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-semibold text-slate-400 group-hover:text-white">Profile</span>
                  </button>
                </div>

                {/* Shared Media - Dynamic from conversation */}
                {(() => {
                  // Extract media from messages
                  const sharedMedia = currentMessages
                    .filter((msg: any) => msg.attachments?.length > 0)
                    .flatMap((msg: any) =>
                      msg.attachments
                        .filter((att: any) => att.type === 'image' || att.type === 'video')
                        .map((att: any) => ({
                          url: att.url,
                          type: att.type,
                          thumbnail: att.thumbnail || att.url,
                          messageId: msg._id
                        }))
                    )
                    .slice(0, 9); // Limit to 9 items

                  return (
                    <div className="p-3 sm:p-4 border-b border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold text-white flex items-center gap-2">
                          <Image className="w-4 h-4 text-slate-400" />
                          Shared Media
                          {sharedMedia.length > 0 && (
                            <span className="text-xs text-slate-500">({sharedMedia.length})</span>
                          )}
                        </h5>
                        {sharedMedia.length > 6 && (
                          <button className="text-xs text-primary hover:underline">See All</button>
                        )}
                      </div>
                      {sharedMedia.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {sharedMedia.slice(0, 6).map((media: any, idx: number) => (
                            <div
                              key={idx}
                              className="aspect-square rounded-lg bg-white/5 overflow-hidden relative group cursor-pointer"
                              onClick={() => window.open(media.url, '_blank')}
                            >
                              <img
                                src={media.thumbnail}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              {media.type === 'video' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                                    <div className="w-0 h-0 border-l-[10px] border-l-slate-800 border-y-[6px] border-y-transparent ml-1" />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="aspect-square rounded-lg bg-white/5 flex items-center justify-center">
                                <Camera className="w-5 h-5 text-slate-600" />
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-500 text-center mt-2">No media shared yet</p>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="p-4 space-y-2 mt-auto">
                  {/* Mute Notifications */}
                  <button
                    onClick={() => {
                      setIsMutedConversation(!isMutedConversation);
                      toast.success(isMutedConversation ? "Notifications unmuted" : "Notifications muted");
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                      isMutedConversation
                        ? "bg-amber-500/20 border border-amber-500/30"
                        : "bg-white/5 hover:bg-white/10"
                    )}
                  >
                    {isMutedConversation ? (
                      <BellOff className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Bell className="w-5 h-5 text-slate-400" />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      isMutedConversation ? "text-amber-400" : "text-slate-300"
                    )}>
                      {isMutedConversation ? "Notifications Muted" : "Mute Notifications"}
                    </span>
                  </button>

                  {/* Block User */}
                  <button
                    onClick={() => {
                      if (showBlockConfirm) {
                        blockUserMutation.mutate(
                          { userId: otherParticipantId || "" },
                          {
                            onSuccess: () => {
                              toast.success(isUserBlocked ? "User unblocked" : "User blocked successfully");
                              setShowBlockConfirm(false);
                              setShowContactPanel(false);
                            },
                            onError: (err: any) => {
                              toast.error(err?.message || "Failed to block user");
                              setShowBlockConfirm(false);
                            }
                          }
                        );
                      } else {
                        setShowBlockConfirm(true);
                        setTimeout(() => setShowBlockConfirm(false), 3000);
                      }
                    }}
                    disabled={blockUserMutation.isPending}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                      showBlockConfirm
                        ? "bg-red-500/30 border border-red-500/50"
                        : isUserBlocked
                          ? "bg-red-500/20 border border-red-500/30"
                          : "bg-white/5 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent"
                    )}
                  >
                    {blockUserMutation.isPending ? (
                      <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
                    ) : (
                      <Ban className="w-5 h-5 text-red-400" />
                    )}
                    <span className="text-sm font-medium text-red-400">
                      {showBlockConfirm
                        ? "Click again to confirm"
                        : isUserBlocked
                          ? "Unblock User"
                          : "Block User"}
                    </span>
                  </button>
                </div>
              </m.div>
            </>
          )}
        </AnimatePresence>

        {/* Video Recorder Modal */}
        <AnimatePresence>
          {showVideoRecorder && (
            <VideoRecorder
              onRecordingComplete={async (blob, duration) => {
                toast.success(`Video recorded (${duration}s) - Ready to send!`);
                console.log('Video blob:', blob);
                setShowVideoRecorder(false);
              }}
              onCancel={() => setShowVideoRecorder(false)}
              maxDuration={60}
            />
          )}
        </AnimatePresence>

        {/* Voice Recorder Modal */}
        <AnimatePresence>
          {showVoiceRecorder && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={() => setShowVoiceRecorder(false)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <VoiceRecorder
                  onRecordingComplete={async (blob, duration) => {
                    toast.success(`Voice message recorded (${duration}s) - Ready to send!`);
                    console.log('Voice blob:', blob);
                    setShowVoiceRecorder(false);
                  }}
                  onCancel={() => setShowVoiceRecorder(false)}
                />
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Location Picker Modal */}
        <AnimatePresence>
          {showLocationPicker && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={() => setShowLocationPicker(false)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <LocationPicker
                  onLocationSelect={(location) => {
                    toast.success(`Location shared: ${location.address || `${location.lat}, ${location.lng}`}`);
                    console.log('Location:', location);
                    setShowLocationPicker(false);
                  }}
                  onCancel={() => setShowLocationPicker(false)}
                />
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Chat Theme Selector */}
        <AnimatePresence>
          {showThemeSelector && (
            <ChatThemeSelector
              currentTheme={chatTheme.id}
              onSelect={(theme) => {
                setChatTheme(theme);
                setShowThemeSelector(false);
                toast.success(`Theme changed to ${theme.name}`);
              }}
              onClose={() => setShowThemeSelector(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div >
  );
}
