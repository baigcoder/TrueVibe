import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { VoiceRoom, generateRoomId } from './VoiceRoom.model.js';
import { Profile } from '../users/Profile.model.js';
import { Channel } from './Channel.model.js';
import { getIO } from '../../socket/index.js';

// Create a new voice room
export const createRoom = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { name, type = 'voice', maxParticipants = 10, serverId, channelId, requireApproval = true } = req.body;

        if (!name || name.trim().length === 0) {
            res.status(400).json({ success: false, error: 'Room name is required' });
            return;
        }

        // Lookup the user's Profile ObjectId from the Supabase userId
        const userProfile = await Profile.findOne({
            $or: [{ supabaseId: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
        });

        if (!userProfile) {
            res.status(404).json({ success: false, error: 'User profile not found' });
            return;
        }

        const profileId = userProfile._id;

        // Generate unique room ID
        let roomId = generateRoomId();
        let attempts = 0;
        while (attempts < 5) {
            const existing = await VoiceRoom.findOne({ roomId });
            if (!existing) break;
            roomId = generateRoomId();
            attempts++;
        }

        const room = await VoiceRoom.create({
            roomId,
            serverId,
            channelId,
            name: name.trim(),
            creatorId: profileId,
            admins: [profileId],
            participants: [profileId],
            pendingRequests: [],
            requireApproval,
            type,
            maxParticipants: Math.min(Math.max(maxParticipants, 2), 20),
            isActive: true,
        });

        const populatedRoom = await VoiceRoom.findById(room._id)
            .populate('creatorId', 'name handle avatar')
            .populate('admins', 'name handle avatar')
            .populate('participants', 'name handle avatar');

        res.status(201).json({
            success: true,
            data: { room: populatedRoom },
        });
    } catch (error) {
        next(error);
    }
};

// Get room by ID
export const getRoom = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { roomId } = req.params;

        const room = await VoiceRoom.findOne({
            $or: [{ roomId }, { channelId: mongoose.isValidObjectId(roomId) ? roomId : null }],
            isActive: true
        })
            .populate('creatorId', 'name handle avatar')
            .populate('participants', 'name handle avatar');

        if (!room) {
            res.status(404).json({ success: false, error: 'Room not found or inactive' });
            return;
        }

        res.json({
            success: true,
            data: { room },
        });
    } catch (error) {
        next(error);
    }
};

// Join a room
export const joinRoom = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { roomId } = req.params;

        // Lookup the user's Profile ObjectId from the Supabase userId
        const userProfile = await Profile.findOne({
            $or: [{ supabaseId: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
        });

        if (!userProfile) {
            res.status(404).json({ success: false, error: 'User profile not found' });
            return;
        }

        const profileId = userProfile._id;

        let room = await VoiceRoom.findOne({
            $or: [{ roomId }, { channelId: mongoose.isValidObjectId(roomId) ? roomId : null }],
            isActive: true
        });

        // If not found and roomId is a valid channelId, create a room for it
        if (!room && mongoose.isValidObjectId(roomId)) {
            const channel = await Channel.findById(roomId);
            if (channel && channel.type === 'voice') {
                room = await VoiceRoom.create({
                    channelId: channel._id,
                    serverId: channel.serverId,
                    name: channel.name,
                    creatorId: profileId,
                    admins: [profileId],
                    participants: [profileId],
                    pendingRequests: [],
                    requireApproval: false, // Server voice channels don't require approval
                    type: 'voice',
                    isActive: true,
                });
            }
        }

        if (!room) {
            res.status(404).json({ success: false, error: 'Room not found or inactive' });
            return;
        }

        // If room requires approval and user is not admin/creator, redirect to request
        if (room.requireApproval &&
            !room.admins.some(a => a.toString() === profileId.toString()) &&
            room.creatorId.toString() !== profileId.toString()) {

            if (!room.participants.some(p => p.toString() === profileId.toString())) {
                res.status(403).json({
                    success: false,
                    error: 'This room requires approval. Use /request endpoint.',
                    requireApproval: true
                });
                return;
            }
        }

        if (room.participants.length >= room.maxParticipants) {
            res.status(400).json({ success: false, error: 'Room is full' });
            return;
        }

        // Add user to participants if not already there
        if (!room.participants.some(p => p.toString() === profileId.toString())) {
            room.participants.push(profileId);

            // For live rooms, default to listener unless they are creator/admin
            if (room.type === 'live') {
                const isStaff = room.admins.some(a => a.toString() === profileId.toString()) ||
                    room.creatorId.toString() === profileId.toString();

                if (isStaff) {
                    if (!room.speakers.some(s => s.toString() === profileId.toString())) {
                        room.speakers.push(profileId);
                    }
                } else {
                    if (!room.listeners.some(l => l.toString() === profileId.toString())) {
                        room.listeners.push(profileId);
                    }
                }
            }

            await room.save();
        }

        const populatedRoom = await VoiceRoom.findById(room._id)
            .populate('creatorId', 'name handle avatar')
            .populate('admins', 'name handle avatar')
            .populate('participants', 'name handle avatar');

        res.json({
            success: true,
            data: { room: populatedRoom },
        });
    } catch (error) {
        next(error);
    }
};

// Leave a room
export const leaveRoom = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { roomId } = req.params;

        // Lookup user profile
        const userProfile = await Profile.findOne({
            $or: [{ supabaseId: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
        });

        if (!userProfile) {
            res.status(404).json({ success: false, error: 'User profile not found' });
            return;
        }

        const profileId = userProfile._id;

        const room = await VoiceRoom.findOne({ roomId, isActive: true });

        if (!room) {
            res.status(404).json({ success: false, error: 'Room not found' });
            return;
        }

        // Remove user from participants
        room.participants = room.participants.filter(p => p.toString() !== profileId.toString());

        // If no participants left or creator left, close the room
        if (room.participants.length === 0 || room.creatorId.toString() === profileId.toString()) {
            room.isActive = false;
        }

        await room.save();

        res.json({
            success: true,
            data: { message: 'Left room successfully' },
        });
    } catch (error) {
        next(error);
    }
};

// Close and permanently delete a room (creator only)
export const closeRoom = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { roomId } = req.params;

        const room = await VoiceRoom.findOne({
            $or: [{ roomId }, { _id: mongoose.isValidObjectId(roomId) ? roomId : null }]
        });

        if (!room) {
            res.status(404).json({ success: false, error: 'Room not found' });
            return;
        }

        // Lookup user's Profile ObjectId from Supabase userId
        const userProfile = await Profile.findOne({
            $or: [{ supabaseId: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
        });

        if (!userProfile) {
            res.status(404).json({ success: false, error: 'User profile not found' });
            return;
        }

        // Check if user is creator or admin
        const isAdmin = room.admins?.some(a => a.toString() === userProfile._id.toString()) ||
            room.creatorId.toString() === userProfile._id.toString();

        if (!isAdmin) {
            res.status(403).json({ success: false, error: 'Only the room admin can delete the room' });
            return;
        }

        // Notify all participants before deleting
        const io = getIO();
        room.participants.forEach(participantId => {
            io.to(`user:${participantId.toString()}`).emit('voiceroom:room-deleted', {
                roomId: room.roomId || room._id.toString(),
                roomName: room.name,
            });
        });

        // Permanently delete the room from the database
        await VoiceRoom.findByIdAndDelete(room._id);

        res.json({
            success: true,
            data: { message: 'Room deleted permanently' },
        });
    } catch (error) {
        next(error);
    }
};


// Get active rooms for a user (rooms they created or are in)
export const getMyRooms = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;

        // Lookup profile for current user
        const userProfile = await Profile.findOne({
            $or: [{ supabaseId: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
        });

        if (!userProfile) {
            res.json({ success: true, data: { rooms: [] } });
            return;
        }

        const rooms = await VoiceRoom.find({
            isActive: true,
            $or: [
                { creatorId: userProfile._id },
                { participants: userProfile._id }
            ]
        })
            .populate('creatorId', 'name handle avatar')
            .populate('participants', 'name handle avatar')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { rooms },
        });
    } catch (error) {
        next(error);
    }
};

// Send room invite to followers
export const inviteFollowers = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { roomId } = req.params;
        const { userIds } = req.body; // Array of user IDs to invite

        const room = await VoiceRoom.findOne({ roomId, isActive: true })
            .populate('creatorId', 'name handle avatar');

        if (!room) {
            res.status(404).json({ success: false, error: 'Room not found' });
            return;
        }

        // This would typically trigger notifications to the invited users
        // For now, we just return success
        // TODO: Integrate with notification system

        res.json({
            success: true,
            data: {
                message: `Invited ${userIds?.length || 0} users to the room`,
                inviteLink: `/chat/room/${roomId}`
            },
        });
    } catch (error) {
        next(error);
    }
};

// Request to join a room (for rooms requiring approval)
export const requestToJoin = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { roomId } = req.params;

        // Get user profile for request info
        const userProfile = await Profile.findOne({
            $or: [{ supabaseId: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
        });

        if (!userProfile) {
            res.status(404).json({ success: false, error: 'User profile not found' });
            return;
        }

        const room = await VoiceRoom.findOne({
            $or: [{ roomId }, { channelId: mongoose.isValidObjectId(roomId) ? roomId : null }],
            isActive: true
        });

        if (!room) {
            res.status(404).json({ success: false, error: 'Room not found or inactive' });
            return;
        }

        // Check if already a participant
        if (room.participants.some(p => p.toString() === userProfile._id.toString())) {
            res.status(400).json({ success: false, error: 'Already in the room' });
            return;
        }

        // Check if already pending
        if (room.pendingRequests.some(r => r.userId.toString() === userProfile._id.toString())) {
            res.status(400).json({ success: false, error: 'Join request already pending' });
            return;
        }

        // If room doesn't require approval, join directly
        if (!room.requireApproval) {
            if (room.participants.length >= room.maxParticipants) {
                res.status(400).json({ success: false, error: 'Room is full' });
                return;
            }
            room.participants.push(userProfile._id);
            await room.save();

            const populatedRoom = await VoiceRoom.findById(room._id)
                .populate('creatorId', 'name handle avatar')
                .populate('admins', 'name handle avatar')
                .populate('participants', 'name handle avatar');

            res.json({
                success: true,
                data: { room: populatedRoom, status: 'joined' },
            });
            return;
        }

        // Add to pending requests
        room.pendingRequests.push({
            userId: userProfile._id,
            name: userProfile.name,
            avatar: userProfile.avatar,
            requestedAt: new Date(),
        });
        await room.save();

        // Notify admins via socket
        const io = getIO();
        room.admins.forEach(adminId => {
            io.to(`user:${adminId.toString()}`).emit('voiceroom:join-request', {
                roomId: room.roomId || room._id.toString(),
                user: {
                    id: userProfile._id,
                    name: userProfile.name,
                    avatar: userProfile.avatar,
                },
            });
        });

        res.json({
            success: true,
            data: { status: 'pending', message: 'Join request sent. Waiting for admin approval.' },
        });
    } catch (error) {
        next(error);
    }
};

// Approve a join request (admin only)
export const approveJoinRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const adminUserId = req.user!.userId;
        const { roomId, userId: targetUserId } = req.params;

        const room = await VoiceRoom.findOne({
            $or: [{ roomId }, { channelId: mongoose.isValidObjectId(roomId) ? roomId : null }],
            isActive: true
        });

        if (!room) {
            res.status(404).json({ success: false, error: 'Room not found' });
            return;
        }

        // Lookup admin's Profile ObjectId from Supabase userId
        const adminProfile = await Profile.findOne({
            $or: [{ supabaseId: adminUserId }, { _id: mongoose.isValidObjectId(adminUserId) ? adminUserId : null }]
        });

        if (!adminProfile) {
            res.status(404).json({ success: false, error: 'Admin profile not found' });
            return;
        }

        // Check if requester is an admin
        const isAdmin = room.admins.some(a => a.toString() === adminProfile._id.toString()) ||
            room.creatorId.toString() === adminProfile._id.toString();

        if (!isAdmin) {
            res.status(403).json({ success: false, error: 'Only admins can approve join requests' });
            return;
        }

        // Find pending request
        const requestIndex = room.pendingRequests.findIndex(
            r => r.userId.toString() === targetUserId
        );

        if (requestIndex === -1) {
            res.status(404).json({ success: false, error: 'Join request not found' });
            return;
        }

        if (room.participants.length >= room.maxParticipants) {
            res.status(400).json({ success: false, error: 'Room is full' });
            return;
        }

        // Move from pending to participants
        const request = room.pendingRequests[requestIndex];
        room.pendingRequests.splice(requestIndex, 1);
        room.participants.push(request.userId);
        await room.save();

        // Notify the approved user via socket
        const io = getIO();
        io.to(`user:${targetUserId}`).emit('voiceroom:request-approved', {
            roomId: room.roomId || room._id.toString(),
            roomName: room.name,
        });

        const populatedRoom = await VoiceRoom.findById(room._id)
            .populate('creatorId', 'name handle avatar')
            .populate('admins', 'name handle avatar')
            .populate('participants', 'name handle avatar');

        res.json({
            success: true,
            data: { room: populatedRoom },
        });
    } catch (error) {
        next(error);
    }
};

// Reject a join request (admin only)
export const rejectJoinRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const adminUserId = req.user!.userId;
        const { roomId, userId: targetUserId } = req.params;

        const room = await VoiceRoom.findOne({
            $or: [{ roomId }, { channelId: mongoose.isValidObjectId(roomId) ? roomId : null }],
            isActive: true
        });

        if (!room) {
            res.status(404).json({ success: false, error: 'Room not found' });
            return;
        }

        // Lookup admin's Profile ObjectId from Supabase userId
        const adminProfile = await Profile.findOne({
            $or: [{ supabaseId: adminUserId }, { _id: mongoose.isValidObjectId(adminUserId) ? adminUserId : null }]
        });

        if (!adminProfile) {
            res.status(404).json({ success: false, error: 'Admin profile not found' });
            return;
        }

        // Check if requester is an admin
        const isAdmin = room.admins.some(a => a.toString() === adminProfile._id.toString()) ||
            room.creatorId.toString() === adminProfile._id.toString();

        if (!isAdmin) {
            res.status(403).json({ success: false, error: 'Only admins can reject join requests' });
            return;
        }

        // Find and remove pending request
        const requestIndex = room.pendingRequests.findIndex(
            r => r.userId.toString() === targetUserId
        );

        if (requestIndex === -1) {
            res.status(404).json({ success: false, error: 'Join request not found' });
            return;
        }

        room.pendingRequests.splice(requestIndex, 1);
        await room.save();

        // Notify the rejected user via socket
        const io = getIO();
        io.to(`user:${targetUserId}`).emit('voiceroom:request-rejected', {
            roomId: room.roomId || room._id.toString(),
        });

        res.json({
            success: true,
            data: { message: 'Join request rejected' },
        });
    } catch (error) {
        next(error);
    }
};

// Raise hand to request speaking
export const raiseHand = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { roomId } = req.params;

        const userProfile = await Profile.findOne({
            $or: [{ supabaseId: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
        });

        if (!userProfile) {
            res.status(404).json({ success: false, error: 'User profile not found' });
            return;
        }

        const room = await VoiceRoom.findOne({
            $or: [{ roomId }, { _id: mongoose.isValidObjectId(roomId) ? roomId : null }],
            isActive: true
        });

        if (!room) {
            res.status(404).json({ success: false, error: 'Room not found' });
            return;
        }

        // Check if already has raised hand
        if (room.raisedHands.some(h => h.userId.toString() === userProfile._id.toString())) {
            res.status(400).json({ success: false, error: 'Hand already raised' });
            return;
        }

        room.raisedHands.push({
            userId: userProfile._id,
            name: userProfile.name || 'Unknown',
            avatar: userProfile.avatar,
            raisedAt: new Date(),
        });
        await room.save();

        // Notify room admins
        const io = getIO();
        room.admins.forEach(adminId => {
            io.to(`user:${adminId.toString()}`).emit('voiceroom:hand-raised', {
                roomId: room.roomId || room._id.toString(),
                user: {
                    id: userProfile._id,
                    name: userProfile.name,
                    avatar: userProfile.avatar,
                },
            });
        });

        res.json({
            success: true,
            data: { message: 'Hand raised' },
        });
    } catch (error) {
        next(error);
    }
};


// ============ STAGE MANAGEMENT ============

/**
 * Raise or lower hand to speak
 */
export const toggleHand = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { roomId } = req.params;

        const userProfile = await Profile.findOne({
            $or: [{ supabaseId: userId }, { _id: mongoose.isValidObjectId(userId) ? userId : null }]
        });

        if (!userProfile) {
            res.status(404).json({ success: false, error: 'User profile not found' });
            return;
        }

        const room = await VoiceRoom.findOne({
            $or: [{ roomId }, { channelId: mongoose.isValidObjectId(roomId) ? roomId : null }],
            isActive: true
        });

        if (!room) {
            res.status(404).json({ success: false, error: 'Room not found' });
            return;
        }

        const profileId = userProfile._id;
        const handIndex = room.raisedHands.findIndex(h => h.userId.toString() === profileId.toString());

        if (handIndex > -1) {
            // Lower hand
            room.raisedHands.splice(handIndex, 1);
        } else {
            // Raise hand
            room.raisedHands.push({
                userId: profileId,
                name: userProfile.name,
                avatar: userProfile.avatar,
                raisedAt: new Date(),
            });
        }

        await room.save();

        // Notify room via socket
        const io = getIO();
        io.to(`room:${roomId}`).emit('voiceroom:hand-toggled', {
            userId: profileId,
            name: userProfile.name,
            isRaised: handIndex === -1,
        });

        res.json({
            success: true,
            data: { isRaised: handIndex === -1 },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Promote a listener to speaker (Admin only)
 */
export const promoteToSpeaker = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const adminUserId = req.user!.userId;
        const { roomId, userId: targetUserId } = req.params;

        const room = await VoiceRoom.findOne({
            $or: [{ roomId }, { channelId: mongoose.isValidObjectId(roomId) ? roomId : null }],
            isActive: true
        });

        if (!room) {
            res.status(404).json({ success: false, error: 'Room not found' });
            return;
        }

        // Check if requester is admin
        const adminProfile = await Profile.findOne({
            $or: [{ supabaseId: adminUserId }, { _id: mongoose.isValidObjectId(adminUserId) ? adminUserId : null }]
        });

        if (!adminProfile || (!room.admins.some(a => a.toString() === adminProfile._id.toString()) && room.creatorId.toString() !== adminProfile._id.toString())) {
            res.status(403).json({ success: false, error: 'Unauthorized: Admin only' });
            return;
        }

        // Move from listeners to speakers
        room.listeners = room.listeners.filter(l => l.toString() !== targetUserId);
        if (!room.speakers.some(s => s.toString() === targetUserId)) {
            room.speakers.push(new mongoose.Types.ObjectId(targetUserId) as any);
        }

        // Remove from raised hands
        room.raisedHands = room.raisedHands.filter(h => h.userId.toString() !== targetUserId);

        await room.save();

        // Notify room via socket
        const io = getIO();
        io.to(`room:${roomId}`).emit('voiceroom:user-promoted', { userId: targetUserId });

        res.json({ success: true, data: { message: 'User promoted to speaker' } });
    } catch (error) {
        next(error);
    }
};

/**
 * Demote a speaker to listener (Admin only)
 */
export const demoteToListener = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const adminUserId = req.user!.userId;
        const { roomId, userId: targetUserId } = req.params;

        const room = await VoiceRoom.findOne({
            $or: [{ roomId }, { channelId: mongoose.isValidObjectId(roomId) ? roomId : null }],
            isActive: true
        });

        if (!room) {
            res.status(404).json({ success: false, error: 'Room not found' });
            return;
        }

        // Check if requester is admin
        const adminProfile = await Profile.findOne({
            $or: [{ supabaseId: adminUserId }, { _id: mongoose.isValidObjectId(adminUserId) ? adminUserId : null }]
        });

        if (!adminProfile || (!room.admins.some(a => a.toString() === adminProfile._id.toString()) && room.creatorId.toString() !== adminProfile._id.toString())) {
            res.status(403).json({ success: false, error: 'Unauthorized: Admin only' });
            return;
        }

        // Move from speakers to listeners
        room.speakers = room.speakers.filter(s => s.toString() !== targetUserId);
        if (!room.listeners.some(l => l.toString() === targetUserId)) {
            room.listeners.push(new mongoose.Types.ObjectId(targetUserId) as any);
        }

        await room.save();

        // Notify room via socket
        const io = getIO();
        io.to(`room:${roomId}`).emit('voiceroom:user-demoted', { userId: targetUserId });

        res.json({ success: true, data: { message: 'User demoted to listener' } });
    } catch (error) {
        next(error);
    }
};

// Send reaction (any participant)
export const sendReaction = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { roomId } = req.params;
        const { emoji } = req.body;

        const room = await VoiceRoom.findOne({
            $or: [{ roomId }, { _id: mongoose.isValidObjectId(roomId) ? roomId : null }],
            isActive: true
        });

        if (!room) {
            res.status(404).json({ success: false, error: 'Room not found' });
            return;
        }

        // Broadcast reaction to all participants
        const io = getIO();
        io.to(`room:${room.roomId || room._id.toString()}`).emit('voiceroom:reaction', {
            emoji,
            timestamp: Date.now(),
        });

        res.json({
            success: true,
            data: { message: 'Reaction sent' },
        });
    } catch (error) {
        next(error);
    }
};

// Get scheduled rooms
export const getScheduledRooms = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const rooms = await VoiceRoom.find({
            isScheduled: true,
            scheduledFor: { $gte: new Date() },
        })
            .populate('creatorId', 'name handle avatar')
            .sort({ scheduledFor: 1 })
            .limit(20);

        res.json({
            success: true,
            data: { rooms },
        });
    } catch (error) {
        next(error);
    }
};

