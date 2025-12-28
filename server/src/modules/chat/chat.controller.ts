import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Conversation } from './Conversation.model.js';
import { Message } from './Message.model.js';
import { Profile } from '../users/Profile.model.js';
import { NotFoundError, ForbiddenError } from '../../shared/middleware/error.middleware.js';
import { emitToUser } from '../../socket/index.js';
import { createNotification } from '../notifications/notification.service.js';
import { logger } from '../../shared/utils/logger.js';

// Get user's conversations
export const getConversations = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;

        const conversations = await Conversation.find({
            participants: userId,
        })
            .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })
            .limit(50);

        // Get all participant profiles
        const allParticipantIds = [...new Set(
            conversations.flatMap((c) => c.participants.map((p) => p.toString()))
        )];
        const profiles = await Profile.find({ userId: { $in: allParticipantIds } });
        const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

        const conversationsWithProfiles = conversations.map((conv) => ({
            ...conv.toJSON(),
            // Filter out the current user from participants so frontend only sees "other" users
            participants: conv.participants
                .filter((pid) => pid.toString() !== userId)
                .map((pid) => profileMap.get(pid.toString())),
        }));

        // Filter out conversations where no other participants exist (self-conversations)
        const validConversations = conversationsWithProfiles.filter(
            (conv) => conv.participants.length > 0 || conv.type === 'group'
        );

        res.json({
            success: true,
            data: { conversations: validConversations },
        });
    } catch (error) {
        next(error);
    }
};

// Create conversation
export const createConversation = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { participantIds, type = 'direct', groupName } = req.body;

        // Include current user in participants
        const allParticipants = [...new Set([userId, ...participantIds])];

        // Prevent self-conversations
        if (type === 'direct' && allParticipants.length === 1) {
            res.status(400).json({
                success: false,
                error: { message: 'Cannot create a conversation with yourself' },
            });
            return;
        }

        // For direct conversations, check if already exists
        if (type === 'direct' && allParticipants.length === 2) {
            const existing = await Conversation.findOne({
                type: 'direct',
                participants: { $all: allParticipants, $size: 2 },
            });

            if (existing) {
                res.json({
                    success: true,
                    data: { conversation: existing },
                });
                return;
            }
        }

        const conversation = await Conversation.create({
            type,
            participants: allParticipants,
            groupName: type === 'group' ? groupName : undefined,
            createdBy: userId,
        });

        res.status(201).json({
            success: true,
            data: { conversation },
        });
    } catch (error) {
        next(error);
    }
};

// Get single conversation
export const getConversation = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const conversation = await Conversation.findById(id);

        if (!conversation) {
            throw new NotFoundError('Conversation');
        }

        // Verify user is participant
        if (!conversation.participants.some((p) => p.toString() === userId)) {
            throw new ForbiddenError('Not a participant in this conversation');
        }

        // Get participant profiles
        const profiles = await Profile.find({
            userId: { $in: conversation.participants },
        });

        res.json({
            success: true,
            data: {
                conversation: {
                    ...conversation.toJSON(),
                    participants: profiles,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get messages
export const getMessages = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { cursor, limit = '50' } = req.query;
        const userId = req.user!.userId;

        // Verify access
        const conversation = await Conversation.findById(id);
        if (!conversation) {
            throw new NotFoundError('Conversation');
        }
        if (!conversation.participants.some((p) => p.toString() === userId)) {
            throw new ForbiddenError('Not a participant');
        }

        const query: Record<string, unknown> = {
            conversationId: id,
            isDeleted: false,
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string, 10) + 1);

        const hasMore = messages.length > parseInt(limit as string, 10);
        const results = hasMore ? messages.slice(0, -1) : messages;

        // Get sender profiles
        const senderIds = [...new Set(results.map((m) => m.senderId.toString()))];
        const profiles = await Profile.find({ userId: { $in: senderIds } });
        const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

        const messagesWithSenders = results.map((msg) => ({
            ...msg.toJSON(),
            sender: profileMap.get(msg.senderId.toString()),
        }));

        res.json({
            success: true,
            data: {
                messages: messagesWithSenders.reverse(), // Oldest first for display
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Send message
export const sendMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { content, media } = req.body;
        const userId = req.user!.userId;

        // Verify access
        const conversation = await Conversation.findById(id);
        if (!conversation) {
            throw new NotFoundError('Conversation');
        }
        if (!conversation.participants.some((p) => p.toString() === userId)) {
            throw new ForbiddenError('Not a participant');
        }

        // Create message
        const message = await Message.create({
            conversationId: id,
            senderId: userId,
            content,
            media: media || [],
            readBy: [{ userId, readAt: new Date() }], // Sender has read it
        });

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(id, {
            lastMessage: {
                content: content.substring(0, 100),
                senderId: userId,
                timestamp: new Date(),
            },
        });

        // Get sender profile
        const profile = await Profile.findOne({ userId });

        const messageWithSender = {
            ...message.toJSON(),
            sender: profile,
        };

        // Emit to all participants and create notifications
        for (const participantId of conversation.participants) {
            const pId = participantId.toString();
            if (pId !== userId) {
                // Socket emission
                emitToUser(pId, 'message:new', {
                    conversationId: id,
                    message: messageWithSender,
                });

                // Persistence for notifications
                createNotification({
                    userId: pId,
                    type: 'message',
                    title: `New message from ${profile?.name || 'Someone'}`,
                    body: content.length > 50 ? content.substring(0, 47) + '...' : content,
                    senderId: userId,
                    link: `/app/chat/${id}`,
                });
            }
        }

        res.status(201).json({
            success: true,
            data: { message: messageWithSender },
        });
    } catch (error) {
        next(error);
    }
};

// Mark messages as read
export const markAsRead = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        // Verify access
        const conversation = await Conversation.findById(id);
        if (!conversation) {
            throw new NotFoundError('Conversation');
        }
        if (!conversation.participants.some((p) => p === userId)) {
            throw new ForbiddenError('Not a participant');
        }

        // Mark all unread messages as read
        await Message.updateMany(
            {
                conversationId: id,
                'readBy.userId': { $ne: userId },
            },
            {
                $push: {
                    readBy: { userId, readAt: new Date() },
                },
            }
        );

        res.json({
            success: true,
            message: 'Messages marked as read',
        });
    } catch (error) {
        next(error);
    }
};

// Update/Edit message
export const updateMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id, messageId } = req.params;
        const { content } = req.body;
        const userId = req.user!.userId;

        // Verify access
        const conversation = await Conversation.findById(id);
        if (!conversation) {
            throw new NotFoundError('Conversation');
        }
        if (!conversation.participants.some((p) => p.toString() === userId)) {
            throw new ForbiddenError('Not a participant');
        }

        // Find and update message
        const message = await Message.findOne({ _id: messageId, conversationId: id, isDeleted: false });
        if (!message) {
            throw new NotFoundError('Message');
        }

        // Only sender can edit
        if (message.senderId.toString() !== userId) {
            throw new ForbiddenError('Not authorized to edit this message');
        }

        // Update message
        message.content = content;
        (message as any).isEdited = true;
        (message as any).editedAt = new Date();
        await message.save();

        // Get sender profile
        const profile = await Profile.findOne({ userId });

        const messageWithSender = {
            ...message.toJSON(),
            sender: profile,
        };

        // Emit to all participants
        for (const participantId of conversation.participants) {
            emitToUser(participantId.toString(), 'message:updated', {
                conversationId: id,
                message: messageWithSender,
            });
        }

        res.json({
            success: true,
            data: { message: messageWithSender },
        });
    } catch (error) {
        next(error);
    }
};

// Delete message
export const deleteMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id, messageId } = req.params;
        const userId = req.user!.userId;

        // Verify access
        const conversation = await Conversation.findById(id);
        if (!conversation) {
            throw new NotFoundError('Conversation');
        }
        if (!conversation.participants.some((p) => p.toString() === userId)) {
            throw new ForbiddenError('Not a participant');
        }

        // Find message
        const message = await Message.findOne({ _id: messageId, conversationId: id });
        if (!message) {
            throw new NotFoundError('Message');
        }

        // Only sender can delete
        if (message.senderId.toString() !== userId) {
            throw new ForbiddenError('Not authorized to delete this message');
        }

        // Soft delete
        message.isDeleted = true;
        await message.save();

        // Emit to all participants
        for (const participantId of conversation.participants) {
            emitToUser(participantId.toString(), 'message:deleted', {
                conversationId: id,
                messageId,
            });
        }

        res.json({
            success: true,
            message: 'Message deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Delete conversation and all its messages
export const deleteConversation = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        // Verify access
        const conversation = await Conversation.findById(id);
        if (!conversation) {
            throw new NotFoundError('Conversation');
        }
        if (!conversation.participants.some((p) => p.toString() === userId)) {
            throw new ForbiddenError('Not a participant in this conversation');
        }

        // Delete all messages in this conversation
        await Message.deleteMany({ conversationId: id });

        // Delete the conversation itself
        await Conversation.findByIdAndDelete(id);

        // Notify other participants about deletion
        for (const participantId of conversation.participants) {
            const pId = participantId.toString();
            if (pId !== userId) {
                emitToUser(pId, 'conversation:deleted', {
                    conversationId: id,
                });
            }
        }

        res.json({
            success: true,
            message: 'Conversation deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};
