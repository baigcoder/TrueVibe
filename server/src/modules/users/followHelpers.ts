import { Follow } from './Follow.model.js';

/**
 * Get IDs of users who have mutual follow relationship with the given user (friends)
 * A friend means BOTH users follow each other
 */
export async function getFriendIds(userId: string): Promise<string[]> {
    // Find users the current user follows
    const following = await Follow.find({ followerId: userId }).select('followingId');
    const followingIds = following.map(f => f.followingId);

    if (followingIds.length === 0) {
        return [];
    }

    // Find which of those users follow back (mutual follows = friends)
    const mutualFollows = await Follow.find({
        followerId: { $in: followingIds },
        followingId: userId
    }).select('followerId');

    return mutualFollows.map(f => f.followerId);
}

/**
 * Check if two users are friends (mutual follow)
 */
export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
    const [follow1, follow2] = await Promise.all([
        Follow.exists({ followerId: userId1, followingId: userId2 }),
        Follow.exists({ followerId: userId2, followingId: userId1 }),
    ]);

    return !!(follow1 && follow2);
}
