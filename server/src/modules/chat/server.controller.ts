import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Server } from './Server.model.js';
import { Channel } from './Channel.model.js';
import { ChannelCategory } from './ChannelCategory.model.js';
import { Message } from './Message.model.js';
import { Profile } from '../users/Profile.model.js';
import { NotFoundError, ForbiddenError } from '../../shared/middleware/error.middleware.js';
import { emitToRoom, emitToUser } from '../../socket/index.js';

// ============== SERVER CONTROLLERS ==============

// Get user's servers
export const getServers = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;

        const servers = await Server.find({
            'members.userId': userId,
        })
            .sort({ updatedAt: -1 })
            .select('-members')
            .limit(50);

        res.json({
            success: true,
            data: { servers },
        });
    } catch (error) {
        next(error);
    }
};

// Get discover servers (public servers)
export const discoverServers = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { search, limit = '20' } = req.query;
        const userId = req.user!.userId;

        const query: Record<string, unknown> = {
            isPublic: true,
            'members.userId': { $ne: userId }, // Not already a member
        };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const servers = await Server.find(query)
            .sort({ memberCount: -1 })
            .select('name description icon memberCount')
            .limit(parseInt(limit as string, 10));

        res.json({
            success: true,
            data: { servers },
        });
    } catch (error) {
        next(error);
    }
};

// Create server
export const createServer = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { name, description, icon, isPublic = true } = req.body;

        // Create server with owner as first member
        const server = await Server.create({
            name,
            description,
            icon,
            isPublic,
            ownerId: userId,
            members: [{
                userId,
                role: 'owner',
                joinedAt: new Date(),
            }],
            memberCount: 1,
        });

        // Create default channels
        const generalChannel = await Channel.create({
            serverId: server._id,
            name: 'general',
            type: 'text',
            position: 0,
        });

        const welcomeChannel = await Channel.create({
            serverId: server._id,
            name: 'welcome',
            type: 'announcement',
            position: 1,
        });

        const loungeChannel = await Channel.create({
            serverId: server._id,
            name: 'lounge',
            type: 'voice',
            position: 2,
        });

        // Update server with channel IDs
        server.channels = [generalChannel._id, welcomeChannel._id, loungeChannel._id];
        await server.save();

        res.status(201).json({
            success: true,
            data: {
                server: {
                    ...server.toJSON(),
                    channels: [generalChannel, welcomeChannel, loungeChannel],
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get server details
export const getServer = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const server = await Server.findById(id);

        if (!server) {
            throw new NotFoundError('Server');
        }

        // Check if user is member
        const isMember = server.members.some((m) => m.userId === userId);
        if (!isMember && !server.isPublic) {
            throw new ForbiddenError('Not a member of this server');
        }

        // Get channels
        const channels = await Channel.find({ serverId: id }).sort({ position: 1 });

        // Get member profiles (limited)
        const memberIds = server.members.slice(0, 50).map((m) => m.userId);
        const profiles = await Profile.find({ userId: { $in: memberIds } });

        res.json({
            success: true,
            data: {
                server: {
                    ...server.toJSON(),
                    channels,
                    memberProfiles: profiles,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// Join server
export const joinServer = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { inviteCode } = req.body;
        const userId = req.user!.userId;

        const server = await Server.findById(id);

        if (!server) {
            throw new NotFoundError('Server');
        }

        // Check if already member
        if (server.members.some((m) => m.userId === userId)) {
            res.json({
                success: true,
                message: 'Already a member',
                data: { server },
            });
            return;
        }

        // Check access
        if (!server.isPublic && server.inviteCode !== inviteCode) {
            throw new ForbiddenError('Invalid invite code');
        }

        // Add member
        server.members.push({
            userId,
            role: 'member',
            joinedAt: new Date(),
        });
        server.memberCount = server.members.length;
        await server.save();

        // Get user profile for notification
        const profile = await Profile.findOne({ userId });

        // Notify other members
        emitToRoom(`server:${id}`, 'server:member:joined', {
            serverId: id,
            member: profile,
        });

        res.json({
            success: true,
            message: 'Joined server successfully',
            data: { server },
        });
    } catch (error) {
        next(error);
    }
};

// Leave server
export const leaveServer = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const server = await Server.findById(id);

        if (!server) {
            throw new NotFoundError('Server');
        }

        // Cannot leave if owner
        if (server.ownerId === userId) {
            throw new ForbiddenError('Owner cannot leave the server. Transfer ownership first.');
        }

        // Remove member
        server.members = server.members.filter((m) => m.userId !== userId);
        server.memberCount = server.members.length;
        await server.save();

        // Notify other members
        emitToRoom(`server:${id}`, 'server:member:left', {
            serverId: id,
            userId: userId.toString(),
        });

        res.json({
            success: true,
            message: 'Left server successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Delete server (owner only)
export const deleteServer = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const server = await Server.findById(id);

        if (!server) {
            throw new NotFoundError('Server');
        }

        // Only owner can delete the server
        if (server.ownerId !== userId) {
            throw new ForbiddenError('Only the server owner can delete the server');
        }

        // Notify all members before deletion
        server.members.forEach((member) => {
            emitToUser(member.userId, 'server:deleted', {
                serverId: id,
                serverName: server.name,
            });
        });

        // Delete all channels
        await Channel.deleteMany({ serverId: id });

        // Delete all messages in those channels
        await Message.deleteMany({ channelId: { $in: server.channels } });

        // Delete the server
        await Server.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Server deleted permanently',
        });
    } catch (error) {
        next(error);
    }
};

// ============== CHANNEL CONTROLLERS ==============

// Get channel messages
export const getChannelMessages = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { serverId, channelId } = req.params;
        const { cursor, limit = '50' } = req.query;
        const userId = req.user!.userId;

        // Verify server membership
        const server = await Server.findById(serverId);
        if (!server) {
            throw new NotFoundError('Server');
        }
        if (!server.members.some((m) => m.userId === userId)) {
            throw new ForbiddenError('Not a member of this server');
        }

        // Verify channel exists
        const channel = await Channel.findById(channelId);
        if (!channel || !channel.serverId.equals(server._id)) {
            throw new NotFoundError('Channel');
        }

        const query: Record<string, unknown> = {
            channelId,
            isDeleted: false,
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string, 10) + 1)
            .populate('replyTo', 'content senderId');

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
                messages: messagesWithSenders.reverse(),
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Send message to channel
export const sendChannelMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { serverId, channelId } = req.params;
        const { content, media, replyTo } = req.body;
        const userId = req.user!.userId;

        // Verify server membership
        const server = await Server.findById(serverId);
        if (!server) {
            throw new NotFoundError('Server');
        }
        if (!server.members.some((m) => m.userId === userId)) {
            throw new ForbiddenError('Not a member of this server');
        }

        // Verify channel exists
        const channel = await Channel.findById(channelId);
        if (!channel || !channel.serverId.equals(server._id)) {
            throw new NotFoundError('Channel');
        }

        // Create message
        const message = await Message.create({
            channelId,
            senderId: userId,
            content,
            media: media || [],
            replyTo: replyTo || undefined,
            reactions: [],
        });

        // Update channel's last message
        channel.lastMessage = {
            content: content.substring(0, 100),
            senderId: userId,
            timestamp: new Date(),
        };
        await channel.save();

        // Get sender profile
        const profile = await Profile.findOne({ userId });

        // Get reply message if exists
        let replyMessage = null;
        if (replyTo) {
            replyMessage = await Message.findById(replyTo).populate('senderId');
        }

        const messageWithSender = {
            ...message.toJSON(),
            sender: profile,
            replyTo: replyMessage,
        };

        // Emit to channel room
        emitToRoom(`channel:${channelId}`, 'channel:message', {
            channelId,
            serverId,
            message: messageWithSender,
        });

        res.status(201).json({
            success: true,
            data: { message: messageWithSender },
        });
    } catch (error) {
        next(error);
    }
};

// Create channel
export const createChannel = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { serverId } = req.params;
        const { name, type = 'text', topic } = req.body;
        const userId = req.user!.userId;

        // Verify server and permission
        const server = await Server.findById(serverId);
        if (!server) {
            throw new NotFoundError('Server');
        }

        const member = server.members.find((m) => m.userId === userId);
        if (!member || !['owner', 'admin'].includes(member.role)) {
            throw new ForbiddenError('Not authorized to create channels');
        }

        // Get max position
        const maxChannel = await Channel.findOne({ serverId }).sort({ position: -1 });
        const position = (maxChannel?.position || 0) + 1;

        const channel = await Channel.create({
            serverId,
            name: name.toLowerCase().replace(/\s+/g, '-'),
            type,
            topic,
            position,
        });

        // Add to server
        server.channels.push(channel._id);
        await server.save();

        // Emit to server room
        emitToRoom(`server:${serverId}`, 'channel:created', {
            serverId,
            channel,
        });

        res.status(201).json({
            success: true,
            data: { channel },
        });
    } catch (error) {
        next(error);
    }
};

// ============== CATEGORY CONTROLLERS ==============

// Get categories for a server
export const getCategories = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { serverId } = req.params;

        const categories = await ChannelCategory.find({ serverId })
            .sort({ position: 1 });

        res.json({
            success: true,
            data: { categories },
        });
    } catch (error) {
        next(error);
    }
};

// Create category
export const createCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { serverId } = req.params;
        const { name } = req.body;
        const userId = req.user!.userId;

        // Verify server and permission
        const server = await Server.findById(serverId);
        if (!server) {
            throw new NotFoundError('Server');
        }

        const member = server.members.find((m) => m.userId === userId);
        if (!member || !['owner', 'admin'].includes(member.role)) {
            throw new ForbiddenError('Not authorized to create categories');
        }

        // Get max position
        const maxCategory = await ChannelCategory.findOne({ serverId }).sort({ position: -1 });
        const position = (maxCategory?.position || 0) + 1;

        const category = await ChannelCategory.create({
            serverId,
            name,
            position,
        });

        // Emit to server room
        emitToRoom(`server:${serverId}`, 'category:created', {
            serverId,
            category,
        });

        res.status(201).json({
            success: true,
            data: { category },
        });
    } catch (error) {
        next(error);
    }
};

// Update category
export const updateCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { serverId, categoryId } = req.params;
        const { name, isCollapsed } = req.body;
        const userId = req.user!.userId;

        // Verify server and permission
        const server = await Server.findById(serverId);
        if (!server) {
            throw new NotFoundError('Server');
        }

        const member = server.members.find((m) => m.userId === userId);
        if (!member || !['owner', 'admin'].includes(member.role)) {
            throw new ForbiddenError('Not authorized to update categories');
        }

        const category = await ChannelCategory.findByIdAndUpdate(
            categoryId,
            { name, isCollapsed },
            { new: true }
        );

        if (!category) {
            throw new NotFoundError('Category');
        }

        // Emit to server room
        emitToRoom(`server:${serverId}`, 'category:updated', {
            serverId,
            category,
        });

        res.json({
            success: true,
            data: { category },
        });
    } catch (error) {
        next(error);
    }
};

// Delete category
export const deleteCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { serverId, categoryId } = req.params;
        const userId = req.user!.userId;

        // Verify server and permission
        const server = await Server.findById(serverId);
        if (!server) {
            throw new NotFoundError('Server');
        }

        const member = server.members.find((m) => m.userId === userId);
        if (!member || !['owner', 'admin'].includes(member.role)) {
            throw new ForbiddenError('Not authorized to delete categories');
        }

        // Move all channels in category to uncategorized
        await Channel.updateMany(
            { categoryId },
            { $set: { categoryId: null } }
        );

        await ChannelCategory.findByIdAndDelete(categoryId);

        // Emit to server room
        emitToRoom(`server:${serverId}`, 'category:deleted', {
            serverId,
            categoryId,
        });

        res.json({
            success: true,
            message: 'Category deleted',
        });
    } catch (error) {
        next(error);
    }
};

// Move channel to category
export const moveChannelToCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { serverId, channelId } = req.params;
        const { categoryId } = req.body;
        const userId = req.user!.userId;

        // Verify server and permission
        const server = await Server.findById(serverId);
        if (!server) {
            throw new NotFoundError('Server');
        }

        const member = server.members.find((m) => m.userId === userId);
        if (!member || !['owner', 'admin'].includes(member.role)) {
            throw new ForbiddenError('Not authorized to move channels');
        }

        const channel = await Channel.findByIdAndUpdate(
            channelId,
            { categoryId: categoryId || null },
            { new: true }
        );

        if (!channel) {
            throw new NotFoundError('Channel');
        }

        // Emit to server room
        emitToRoom(`server:${serverId}`, 'channel:moved', {
            serverId,
            channelId,
            categoryId,
        });

        res.json({
            success: true,
            data: { channel },
        });
    } catch (error) {
        next(error);
    }
};

// ============== REACTION CONTROLLERS ==============

// Add reaction
export const addReaction = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user!.userId;

        const message = await Message.findById(messageId);
        if (!message || message.isDeleted) {
            throw new NotFoundError('Message');
        }

        // Find existing reaction
        const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

        if (reactionIndex >= 0) {
            // Check if user already reacted
            if (!message.reactions[reactionIndex].users.some((u) => u === userId)) {
                message.reactions[reactionIndex].users.push(userId);
            }
        } else {
            // Add new reaction
            message.reactions.push({
                emoji,
                users: [userId],
            });
        }

        await message.save();

        // Emit event
        const roomId = message.channelId
            ? `channel:${message.channelId}`
            : `conversation:${message.conversationId}`;

        emitToRoom(roomId, 'message:reaction:add', {
            messageId,
            emoji,
            userId: userId.toString(),
        });

        res.json({
            success: true,
            data: { reactions: message.reactions },
        });
    } catch (error) {
        next(error);
    }
};

// Remove reaction
export const removeReaction = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { messageId, emoji } = req.params;
        const userId = req.user!.userId;

        const message = await Message.findById(messageId);
        if (!message) {
            throw new NotFoundError('Message');
        }

        // Find reaction
        const reactionIndex = message.reactions.findIndex((r) => r.emoji === emoji);

        if (reactionIndex >= 0) {
            // Remove user from reaction
            message.reactions[reactionIndex].users = message.reactions[reactionIndex].users.filter(
                (u) => u !== userId
            );

            // Remove reaction if no users left
            if (message.reactions[reactionIndex].users.length === 0) {
                message.reactions.splice(reactionIndex, 1);
            }

            await message.save();
        }

        // Emit event
        const roomId = message.channelId
            ? `channel:${message.channelId}`
            : `conversation:${message.conversationId}`;

        emitToRoom(roomId, 'message:reaction:remove', {
            messageId,
            emoji,
            userId: userId.toString(),
        });

        res.json({
            success: true,
            data: { reactions: message.reactions },
        });
    } catch (error) {
        next(error);
    }
};

// Pin message
export const pinMessage = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { messageId } = req.params;
        const userId = req.user!.userId;

        const message = await Message.findById(messageId);
        if (!message || message.isDeleted) {
            throw new NotFoundError('Message');
        }

        // Toggle pin
        message.isPinned = !message.isPinned;
        await message.save();

        // Emit event
        const roomId = message.channelId
            ? `channel:${message.channelId}`
            : `conversation:${message.conversationId}`;

        emitToRoom(roomId, 'message:pinned', {
            messageId,
            isPinned: message.isPinned,
        });

        res.json({
            success: true,
            data: { isPinned: message.isPinned },
        });
    } catch (error) {
        next(error);
    }
};

// Get pinned messages
export const getPinnedMessages = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { channelId } = req.params;

        const messages = await Message.find({
            channelId,
            isPinned: true,
            isDeleted: false,
        })
            .sort({ createdAt: -1 })
            .limit(50);

        // Get sender profiles
        const senderIds = [...new Set(messages.map((m) => m.senderId.toString()))];
        const profiles = await Profile.find({ userId: { $in: senderIds } });
        const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

        const messagesWithSenders = messages.map((msg) => ({
            ...msg.toJSON(),
            sender: profileMap.get(msg.senderId.toString()),
        }));

        res.json({
            success: true,
            data: { messages: messagesWithSenders },
        });
    } catch (error) {
        next(error);
    }
};
