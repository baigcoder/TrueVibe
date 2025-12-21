import { Router } from 'express';
import * as voiceRoomController from './voiceRoom.controller.js';
import { authenticate } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// Create a new voice room
router.post('/', authenticate, voiceRoomController.createRoom);

// Get current user's active rooms
router.get('/my-rooms', authenticate, voiceRoomController.getMyRooms);

// Get room by ID
router.get('/:roomId', authenticate, voiceRoomController.getRoom);

// Join a room (instant join for public rooms, or request for private rooms)
router.post('/:roomId/join', authenticate, voiceRoomController.joinRoom);

// Request to join a room (for rooms requiring approval)
router.post('/:roomId/request', authenticate, voiceRoomController.requestToJoin);

// Approve a join request (admin only)
router.post('/:roomId/approve/:userId', authenticate, voiceRoomController.approveJoinRequest);

// Reject a join request (admin only)
router.post('/:roomId/reject/:userId', authenticate, voiceRoomController.rejectJoinRequest);

// Leave a room
router.post('/:roomId/leave', authenticate, voiceRoomController.leaveRoom);

// Close a room (creator only)
router.delete('/:roomId', authenticate, voiceRoomController.closeRoom);

// Invite followers to a room
router.post('/:roomId/invite', authenticate, voiceRoomController.inviteFollowers);

// ============== SPEAKER MANAGEMENT ==============
// Toggle hand to request speaking
router.post('/:roomId/toggle-hand', authenticate, voiceRoomController.toggleHand);

// Promote to speaker (admin only)
router.post('/:roomId/promote/:userId', authenticate, voiceRoomController.promoteToSpeaker);

// Demote to listener (admin only)
router.post('/:roomId/demote/:userId', authenticate, voiceRoomController.demoteToListener);

// ============== REACTIONS ==============
// Send reaction
router.post('/:roomId/reaction', authenticate, voiceRoomController.sendReaction);

// ============== SCHEDULED ROOMS ==============
// Get scheduled rooms
router.get('/scheduled', authenticate, voiceRoomController.getScheduledRooms);

export default router;

