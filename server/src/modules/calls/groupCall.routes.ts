import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/supabase.middleware.js';
import { GroupCall, generateRoomId, generateInviteCode } from './GroupCall.model.js';
import { Profile } from '../users/Profile.model.js';

const router = Router();

// Create a group call
router.post('/create', requireAuth, async (req, res, next) => {
    try {
        const hostId = req.auth!.userId;
        const { title, callType = 'video', maxParticipants = 8, isPrivate = true } = req.body;

        const roomId = generateRoomId();
        const inviteCode = isPrivate ? generateInviteCode() : undefined;

        const groupCall = await GroupCall.create({
            roomId,
            hostId,
            title,
            callType,
            maxParticipants,
            isPrivate,
            inviteCode,
            participants: [{
                userId: hostId,
                role: 'host',
                joinedAt: new Date(),
            }],
        });

        res.status(201).json({
            success: true,
            data: {
                groupCall,
                roomId,
                inviteCode,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Join a group call by room ID
router.post('/:roomId/join', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { roomId } = req.params;
        const { inviteCode } = req.body;

        const groupCall = await GroupCall.findOne({ roomId, status: { $ne: 'ended' } });

        if (!groupCall) {
            return res.status(404).json({
                success: false,
                error: { message: 'Group call not found or has ended' },
            });
        }

        // Check invite code for private calls
        if (groupCall.isPrivate && groupCall.inviteCode !== inviteCode) {
            return res.status(403).json({
                success: false,
                error: { message: 'Invalid invite code' },
            });
        }

        // Check if already in call
        const existingParticipant = groupCall.participants.find(p => p.userId === userId && !p.leftAt);
        if (existingParticipant) {
            return res.json({
                success: true,
                data: { groupCall },
                message: 'Already in call',
            });
        }

        // Check max participants
        const activeParticipants = groupCall.participants.filter(p => !p.leftAt);
        if (activeParticipants.length >= groupCall.maxParticipants) {
            return res.status(400).json({
                success: false,
                error: { message: 'Call is full' },
            });
        }

        // Add participant
        groupCall.participants.push({
            userId,
            role: 'participant',
            joinedAt: new Date(),
            isMuted: false,
            isVideoOff: false,
        });

        // Start call if this is second participant
        if (groupCall.status === 'waiting' && groupCall.participants.filter(p => !p.leftAt).length >= 2) {
            groupCall.status = 'active';
            groupCall.startedAt = new Date();
        }

        await groupCall.save();

        res.json({
            success: true,
            data: { groupCall },
        });
    } catch (error) {
        next(error);
    }
});

// Leave a group call
router.post('/:roomId/leave', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { roomId } = req.params;

        const groupCall = await GroupCall.findOne({ roomId });

        if (!groupCall) {
            return res.status(404).json({
                success: false,
                error: { message: 'Group call not found' },
            });
        }

        // Mark participant as left
        const participant = groupCall.participants.find(p => p.userId === userId && !p.leftAt);
        if (participant) {
            participant.leftAt = new Date();
        }

        // Check if call should end (no active participants or host left)
        const activeParticipants = groupCall.participants.filter(p => !p.leftAt);
        if (activeParticipants.length === 0 || (userId === groupCall.hostId && activeParticipants.length === 0)) {
            groupCall.status = 'ended';
            groupCall.endedAt = new Date();
            if (groupCall.startedAt) {
                groupCall.duration = Math.floor((groupCall.endedAt.getTime() - groupCall.startedAt.getTime()) / 1000);
            }
        }

        await groupCall.save();

        res.json({
            success: true,
            data: { groupCall },
        });
    } catch (error) {
        next(error);
    }
});

// Get group call details
router.get('/:roomId', requireAuth, async (req, res, next) => {
    try {
        const { roomId } = req.params;

        const groupCall = await GroupCall.findOne({ roomId });

        if (!groupCall) {
            return res.status(404).json({
                success: false,
                error: { message: 'Group call not found' },
            });
        }

        // Get participant profiles
        const participantIds = groupCall.participants.map(p => p.userId);
        const profiles = await Profile.find({
            $or: [
                { userId: { $in: participantIds } },
                { supabaseId: { $in: participantIds } },
            ]
        });

        const profileMap = new Map();
        profiles.forEach(p => {
            profileMap.set(p.userId?.toString(), p);
            if (p.supabaseId) profileMap.set(p.supabaseId, p);
        });

        const participantsWithProfiles = groupCall.participants.map(p => ({
            userId: p.userId,
            joinedAt: p.joinedAt,
            leftAt: p.leftAt,
            role: p.role,
            isMuted: p.isMuted,
            isVideoOff: p.isVideoOff,
            profile: profileMap.get(p.userId) || null,
        }));

        res.json({
            success: true,
            data: {
                groupCall: {
                    ...groupCall.toObject(),
                    participants: participantsWithProfiles,
                },
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                ],
            },
        });
    } catch (error) {
        next(error);
    }
});

// Update participant state (mute/video)
router.patch('/:roomId/state', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { roomId } = req.params;
        const { isMuted, isVideoOff } = req.body;

        const groupCall = await GroupCall.findOne({ roomId, status: { $ne: 'ended' } });

        if (!groupCall) {
            return res.status(404).json({
                success: false,
                error: { message: 'Group call not found' },
            });
        }

        const participant = groupCall.participants.find(p => p.userId === userId && !p.leftAt);
        if (participant) {
            if (isMuted !== undefined) participant.isMuted = isMuted;
            if (isVideoOff !== undefined) participant.isVideoOff = isVideoOff;
            await groupCall.save();
        }

        res.json({
            success: true,
            data: { groupCall },
        });
    } catch (error) {
        next(error);
    }
});

// End call (host only)
router.post('/:roomId/end', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { roomId } = req.params;

        const groupCall = await GroupCall.findOne({ roomId });

        if (!groupCall) {
            return res.status(404).json({
                success: false,
                error: { message: 'Group call not found' },
            });
        }

        if (groupCall.hostId !== userId) {
            return res.status(403).json({
                success: false,
                error: { message: 'Only the host can end the call' },
            });
        }

        groupCall.status = 'ended';
        groupCall.endedAt = new Date();
        if (groupCall.startedAt) {
            groupCall.duration = Math.floor((groupCall.endedAt.getTime() - groupCall.startedAt.getTime()) / 1000);
        }

        // Mark all participants as left
        groupCall.participants.forEach(p => {
            if (!p.leftAt) p.leftAt = new Date();
        });

        await groupCall.save();

        res.json({
            success: true,
            data: { groupCall },
        });
    } catch (error) {
        next(error);
    }
});

// Get my active group calls
router.get('/', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;

        const activeCall = await GroupCall.findOne({
            'participants.userId': userId,
            status: { $ne: 'ended' },
        });

        res.json({
            success: true,
            data: { activeCall },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
