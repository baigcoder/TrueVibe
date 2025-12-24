import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from './User.model.js';
import { Profile } from './Profile.model.js';
import { Follow } from './Follow.model.js';
import { FollowRequest } from './FollowRequest.model.js';
import { Post } from '../posts/Post.model.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../shared/middleware/error.middleware.js';
import { createNotification } from '../notifications/notification.service.js';

// Get user by ID
export const getUserById = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const profile = await Profile.findOne({
            $or: [
                { userId: id },
                { handle: id.toLowerCase().replace('@', '') },
                { _id: mongoose.isValidObjectId(id) ? id : undefined }
            ],
        });

        if (!profile) {
            throw new NotFoundError('User');
        }

        // Calculate dynamic trust score
        const postsCount = await Post.countDocuments({ userId: profile.userId, isDeleted: false });
        let calculatedTrustScore = 40; // Base score
        if (profile.verified) calculatedTrustScore += 30;
        calculatedTrustScore += Math.min(postsCount * 2, 20);
        calculatedTrustScore += Math.min((profile.followers || 0) / 5, 10);

        // Update profile if trust score changed significantly (optional, for now just return it)
        const trustScore = Math.min(calculatedTrustScore, 100);
        profile.trustScore = trustScore;

        // Check privacy settings
        const isOwner = req.user?.userId === profile.userId.toString();
        const isFollowing = req.user
            ? await Follow.exists({
                followerId: req.user.userId,
                followingId: profile.userId,
            })
            : false;

        // Check if the profile user follows the current user back (for mutual follow / messaging)
        const isFollowedBy = req.user
            ? await Follow.exists({
                followerId: profile.userId,
                followingId: req.user.userId,
            })
            : false;

        // Check for pending follow request
        const hasPendingRequest = req.user
            ? await FollowRequest.exists({
                requesterId: req.user.userId,
                targetId: profile.userId,
                status: 'pending',
            })
            : false;

        // Apply privacy filtering
        let profileData = profile.toJSON();
        if (!isOwner && profile.privacy.profileVisibility === 'private') {
            profileData = {
                _id: profile._id,
                userId: profile.userId,
                name: profile.name,
                handle: profile.handle,
                avatar: profile.avatar,
                privacy: profile.privacy,
            } as typeof profileData;
        }

        res.json({
            success: true,
            data: {
                profile: profileData,
                isFollowing: !!isFollowing,
                isFollowedBy: !!isFollowedBy,
                canMessage: !!isFollowing && !!isFollowedBy,
                hasPendingRequest: !!hasPendingRequest,
                isOwner,
            },
        });
    } catch (error) {
        next(error);
    }
};


// Update profile
export const updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const updates = req.body;

        const profile = await Profile.findOneAndUpdate(
            { userId },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!profile) {
            throw new NotFoundError('Profile');
        }

        res.json({
            success: true,
            data: { profile },
        });
    } catch (error) {
        next(error);
    }
};

// Update settings
export const updateSettings = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { privacy } = req.body;

        const profile = await Profile.findOneAndUpdate(
            { userId },
            { $set: { privacy } },
            { new: true }
        );

        if (!profile) {
            throw new NotFoundError('Profile');
        }

        res.json({
            success: true,
            data: { profile },
        });
    } catch (error) {
        next(error);
    }
};

// Follow user
export const followUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const followerId = req.user!.userId;
        const { id: followingId } = req.params;

        if (followerId === followingId) {
            throw new ForbiddenError('Cannot follow yourself');
        }

        // Check if user exists
        const userToFollow = await Profile.findOne({ userId: followingId });
        if (!userToFollow) {
            throw new NotFoundError('User to follow');
        }

        // Check if already following
        const existingFollow = await Follow.findOne({ followerId, followingId });
        if (existingFollow) {
            throw new ConflictError('Already following this user');
        }

        // Check for existing pending request
        const existingRequest = await FollowRequest.findOne({
            requesterId: followerId,
            targetId: followingId,
            status: 'pending'
        });
        if (existingRequest) {
            throw new ConflictError('Follow request already pending');
        }

        const follower = await Profile.findOne({ userId: followerId });
        console.log(`[FOLLOW] User ${followerId} attempting to follow ${followingId}`);
        console.log(`[FOLLOW] Target privacy: ${userToFollow.privacy?.profileVisibility}`);

        // Always create follow request - approval required (Instagram-like flow)
        console.log(`[FOLLOW] Creating follow request (approval required)`);

        await FollowRequest.create({
            requesterId: followerId,
            targetId: followingId,
            status: 'pending'
        });

        res.json({
            success: true,
            status: 'requested',
            message: 'Follow request sent',
        });

        // Notify target user about follow request
        console.log(`[FOLLOW] Creating notification for follow request`);
        createNotification({
            userId: followingId,
            type: 'follow',
            title: 'Follow Request',
            body: `${follower?.name || 'Someone'} wants to follow you`,
            senderId: followerId,
            link: `/app/profile/${followerId}`,
        });
    } catch (error) {
        next(error);
    }
};




// Unfollow user
export const unfollowUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const followerId = req.user!.userId;
        const { id: followingId } = req.params;

        const follow = await Follow.findOneAndDelete({ followerId, followingId });

        if (!follow) {
            throw new NotFoundError('Follow relationship');
        }

        // Update counts
        await Promise.all([
            Profile.findOneAndUpdate({ userId: followerId }, { $inc: { following: -1 } }),
            Profile.findOneAndUpdate({ userId: followingId }, { $inc: { followers: -1 } }),
        ]);

        res.json({
            success: true,
            message: 'Successfully unfollowed user',
        });
    } catch (error) {
        next(error);
    }
};


// Search users
export const searchUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { q, limit = '20' } = req.query;

        if (!q) {
            res.json({ success: true, data: { users: [] } });
            return;
        }

        const searchRegex = new RegExp(String(q), 'i');

        const profiles = await Profile.find({
            $or: [{ name: searchRegex }, { handle: searchRegex }],
        })
            .limit(parseInt(limit as string, 10))
            .select('userId name handle avatar trustScore');

        // Map to include 'id' field for frontend compatibility
        const users = profiles.map(p => ({
            id: p.userId,  // Frontend expects 'id'
            _id: p._id,
            userId: p.userId,
            name: p.name,
            handle: p.handle,
            avatar: p.avatar,
            trustScore: p.trustScore,
        }));

        res.json({
            success: true,
            data: { users },
        });
    } catch (error) {
        next(error);
    }
};


// Get suggested users for the current user
export const getSuggestedUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { limit = '10' } = req.query;
        const limitNum = parseInt(limit as string, 10);

        // Get current user's following list
        const following = await Follow.find({ followerId: userId }).select('followingId');
        const followingIds = following.map(f => f.followingId);

        // Get users followed by people I follow (friends of friends)
        const friendsOfFriends = await Follow.aggregate([
            { $match: { followerId: { $in: followingIds } } },
            { $group: { _id: '$followingId', mutualCount: { $sum: 1 } } },
            { $match: { _id: { $nin: [...followingIds, userId] } } },
            { $sort: { mutualCount: -1 } },
            { $limit: limitNum * 2 },
        ]);

        const fofIds = friendsOfFriends.map(f => f._id);
        const mutualCountMap = new Map(friendsOfFriends.map(f => [f._id.toString(), f.mutualCount]));

        // Get high trust score users not followed
        const highTrustUsers = await Profile.find({
            userId: { $nin: [...followingIds, userId, ...fofIds] },
            trustScore: { $gte: 70 },
        })
            .sort({ trustScore: -1, followers: -1 })
            .limit(limitNum)
            .select('userId');

        const highTrustIds = highTrustUsers.map(u => u.userId);

        // Combine all candidate IDs
        let allCandidateIds = [...new Set([...fofIds, ...highTrustIds])];

        // =============================================
        // FALLBACK: If no suggestions, fetch recent users
        // =============================================
        if (allCandidateIds.length === 0) {
            const recentUsers = await Profile.find({
                userId: { $nin: [...followingIds, userId] },
            })
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .select('userId');

            allCandidateIds = recentUsers.map(u => u.userId);
        }

        // Fetch profiles
        const profiles = await Profile.find({
            userId: { $in: allCandidateIds },
        })
            .limit(limitNum)
            .select('userId name handle avatar trustScore followers bio');

        // Add mutual followers count to response
        const suggestions = profiles
            // FINAL FILTER: Absolutely exclude current user
            .filter(profile => profile.userId.toString() !== userId.toString())
            .map(profile => ({
                ...profile.toObject(),
                mutualFollowers: mutualCountMap.get(profile.userId.toString()) || 0,
            }));

        // Sort by mutual followers, then trust score
        suggestions.sort((a, b) => {
            if (b.mutualFollowers !== a.mutualFollowers) {
                return b.mutualFollowers - a.mutualFollowers;
            }
            return (b.trustScore || 0) - (a.trustScore || 0);
        });

        res.json({
            success: true,
            data: { suggestions: suggestions.slice(0, limitNum) },
        });

    } catch (error) {
        next(error);
    }
};

// Get pending follow requests for current user
export const getFollowRequests = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { cursor, limit = '20' } = req.query;

        const query: Record<string, unknown> = {
            targetId: userId,
            status: 'pending',
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const requests = await FollowRequest.find(query)
            .sort({ _id: -1 })
            .limit(parseInt(limit as string, 10) + 1);

        const hasMore = requests.length > parseInt(limit as string, 10);
        const results = hasMore ? requests.slice(0, -1) : requests;

        // Get profiles for requesters
        const requesterIds = results.map(r => r.requesterId);
        const profiles = await Profile.find({ userId: { $in: requesterIds } })
            .select('userId name handle avatar trustScore');

        const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));

        const requestsWithProfiles = results.map(request => ({
            _id: request._id,
            requester: profileMap.get(request.requesterId.toString()),
            status: request.status,
            createdAt: request.createdAt,
        }));

        res.json({
            success: true,
            data: {
                requests: requestsWithProfiles,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Accept a follow request
export const acceptFollowRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { id: requestId } = req.params;

        const request = await FollowRequest.findOne({
            _id: requestId,
            targetId: userId,
            status: 'pending',
        });

        if (!request) {
            throw new NotFoundError('Follow request');
        }

        // Update request status
        request.status = 'accepted';
        await request.save();

        // Create the follow relationship
        await Follow.create({
            followerId: request.requesterId,
            followingId: userId,
        });

        // Update counts
        await Promise.all([
            Profile.findOneAndUpdate({ userId: request.requesterId }, { $inc: { following: 1 } }),
            Profile.findOneAndUpdate({ userId }, { $inc: { followers: 1 } }),
        ]);

        // Get requester info for response
        const requesterProfile = await Profile.findOne({ userId: request.requesterId });
        const targetUser = await Profile.findOne({ userId });

        res.json({
            success: true,
            message: 'Follow request accepted',
            data: {
                followerId: request.requesterId,
                requester: requesterProfile ? {
                    userId: requesterProfile.userId,
                    name: requesterProfile.name,
                    handle: requesterProfile.handle,
                    avatar: requesterProfile.avatar,
                } : null,
            }
        });

        // Notify the requester
        createNotification({
            userId: request.requesterId,
            type: 'follow',
            title: 'Request Accepted',
            body: `${targetUser?.name || 'Someone'} accepted your follow request`,
            senderId: userId,
            link: `/app/profile/${userId}`,
        });

        // Also emit a specific follow:accepted event for realtime navigation
        const { emitToUser } = await import('../../socket/index.js');
        emitToUser(request.requesterId, 'follow:accepted', {
            acceptedBy: userId,
            acceptedByProfile: targetUser ? {
                userId: targetUser.userId,
                name: targetUser.name,
                handle: targetUser.handle,
                avatar: targetUser.avatar,
            } : null,
        });
    } catch (error) {
        next(error);
    }
};


// Reject a follow request
export const rejectFollowRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { id: requestId } = req.params;

        const request = await FollowRequest.findOneAndUpdate(
            { _id: requestId, targetId: userId, status: 'pending' },
            { status: 'rejected' },
            { new: true }
        );

        if (!request) {
            throw new NotFoundError('Follow request');
        }

        res.json({
            success: true,
            message: 'Follow request rejected',
        });
    } catch (error) {
        next(error);
    }
};

// Cancel a sent follow request
export const cancelFollowRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { id: targetUserId } = req.params;

        const request = await FollowRequest.findOneAndDelete({
            requesterId: userId,
            targetId: targetUserId,
            status: 'pending',
        });

        if (!request) {
            throw new NotFoundError('Follow request');
        }

        res.json({
            success: true,
            message: 'Follow request cancelled',
        });
    } catch (error) {
        next(error);
    }
};

// Get followers of a user
export const getFollowers = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { cursor, limit = '20' } = req.query;

        // Find the target user's profile
        const targetProfile = await Profile.findOne({
            $or: [
                { userId: id },
                { handle: id.toLowerCase().replace('@', '') },
                { _id: mongoose.isValidObjectId(id) ? id : undefined }
            ],
        });

        if (!targetProfile) {
            throw new NotFoundError('User');
        }

        const query: Record<string, unknown> = { followingId: targetProfile.userId };
        if (cursor) {
            query._id = { $lt: cursor };
        }

        const follows = await Follow.find(query)
            .sort({ _id: -1 })
            .limit(parseInt(limit as string, 10) + 1);

        const hasMore = follows.length > parseInt(limit as string, 10);
        const results = hasMore ? follows.slice(0, -1) : follows;

        // Get profiles for followers
        const followerIds = results.map(f => f.followerId);
        const profiles = await Profile.find({ userId: { $in: followerIds } })
            .select('userId name handle avatar trustScore verified');

        const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));

        const followers = results.map(follow => ({
            _id: follow._id,
            user: profileMap.get(follow.followerId.toString()),
            followedAt: follow.createdAt,
        }));

        res.json({
            success: true,
            data: {
                followers,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
                total: await Follow.countDocuments({ followingId: targetProfile.userId }),
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get users that a user is following
export const getFollowing = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { cursor, limit = '20' } = req.query;

        // Find the target user's profile
        const targetProfile = await Profile.findOne({
            $or: [
                { userId: id },
                { handle: id.toLowerCase().replace('@', '') },
                { _id: mongoose.isValidObjectId(id) ? id : undefined }
            ],
        });

        if (!targetProfile) {
            throw new NotFoundError('User');
        }

        const query: Record<string, unknown> = { followerId: targetProfile.userId };
        if (cursor) {
            query._id = { $lt: cursor };
        }

        const follows = await Follow.find(query)
            .sort({ _id: -1 })
            .limit(parseInt(limit as string, 10) + 1);

        const hasMore = follows.length > parseInt(limit as string, 10);
        const results = hasMore ? follows.slice(0, -1) : follows;

        // Get profiles for following
        const followingIds = results.map(f => f.followingId);
        const profiles = await Profile.find({ userId: { $in: followingIds } })
            .select('userId name handle avatar trustScore verified');

        const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));

        const following = results.map(follow => ({
            _id: follow._id,
            user: profileMap.get(follow.followingId.toString()),
            followedAt: follow.createdAt,
        }));

        res.json({
            success: true,
            data: {
                following,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
                total: await Follow.countDocuments({ followerId: targetProfile.userId }),
            },
        });
    } catch (error) {
        next(error);
    }
};
