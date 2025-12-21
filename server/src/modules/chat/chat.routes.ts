import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/supabase.middleware.js';
import * as chatController from './chat.controller.js';
import * as serverController from './server.controller.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import * as schemas from './chat.schema.js';

const router = Router();

// Apply auth to all routes
router.use(requireAuth);

// ============== DM CONVERSATIONS ==============
router.get('/conversations', chatController.getConversations);
router.post('/conversations', validate(schemas.createConversationSchema), chatController.createConversation);
router.get('/conversations/:id', chatController.getConversation);
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations/:id/messages', validate(schemas.sendMessageSchema), chatController.sendMessage);
router.put('/conversations/:id/read', chatController.markAsRead);
router.put('/conversations/:id/messages/:messageId', chatController.updateMessage);
router.delete('/conversations/:id/messages/:messageId', chatController.deleteMessage);

// ============== SERVERS (Discord-like) ==============
router.get('/servers', serverController.getServers);
router.get('/servers/discover', serverController.discoverServers);
router.post('/servers', validate(schemas.createServerSchema), serverController.createServer);
router.get('/servers/:id', serverController.getServer);
router.post('/servers/:id/join', validate(schemas.joinServerSchema), serverController.joinServer);
router.post('/servers/:id/leave', serverController.leaveServer);
router.delete('/servers/:id', serverController.deleteServer);

// Join via invite code
router.post('/invite/:inviteCode', async (req, res, next) => {
    try {
        const { Server } = await import('./Server.model.js');
        const server = await Server.findOne({ inviteCode: req.params.inviteCode });
        if (!server) {
            return res.status(404).json({ success: false, error: 'Invalid invite code' });
        }
        (req.params as any).id = server._id.toString();
        return serverController.joinServer(req, res, next);
    } catch (error) {
        next(error);
    }
});

// ============== CHANNELS ==============
router.get('/servers/:serverId/channels', async (req, res, next) => {
    try {
        const { Channel } = await import('./Channel.model.js');
        const channels = await Channel.find({ serverId: req.params.serverId }).sort({ position: 1 });
        res.json({ success: true, data: { channels } });
    } catch (error) {
        next(error);
    }
});
router.post('/servers/:serverId/channels', validate(schemas.createChannelSchema), serverController.createChannel);

// ============== CATEGORIES ==============
router.get('/servers/:serverId/categories', serverController.getCategories);
router.post('/servers/:serverId/categories', serverController.createCategory);
router.put('/servers/:serverId/categories/:categoryId', serverController.updateCategory);
router.delete('/servers/:serverId/categories/:categoryId', serverController.deleteCategory);
router.post('/servers/:serverId/channels/:channelId/move', serverController.moveChannelToCategory);

router.get('/servers/:serverId/channels/:channelId/messages', serverController.getChannelMessages);
router.post('/servers/:serverId/channels/:channelId/messages', validate(schemas.sendChannelMessageSchema), serverController.sendChannelMessage);
router.get('/servers/:serverId/channels/:channelId/pinned', serverController.getPinnedMessages);

// ============== REACTIONS ==============
router.post('/messages/:messageId/reactions', validate(schemas.addReactionSchema), serverController.addReaction);
router.delete('/messages/:messageId/reactions/:emoji', validate(schemas.removeReactionSchema), serverController.removeReaction);
router.post('/messages/:messageId/pin', serverController.pinMessage);

export default router;
