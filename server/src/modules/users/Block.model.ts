import mongoose, { Schema, Document } from 'mongoose';

export interface IBlock extends Document {
    _id: mongoose.Types.ObjectId;
    blockerId: string;  // User who blocked
    blockedId: string;  // User who was blocked
    reason?: string;    // Optional reason for blocking
    createdAt: Date;
}

const blockSchema = new Schema<IBlock>(
    {
        blockerId: {
            type: String,
            required: true,
            index: true,
        },
        blockedId: {
            type: String,
            required: true,
            index: true,
        },
        reason: {
            type: String,
            maxlength: 500,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        toJSON: {
            transform: (doc, ret: Record<string, unknown>) => {
                ret.__v = undefined;
                return ret;
            },
        },
    }
);

// Compound index to ensure a user can only block another user once
blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

// Static method to check if user A has blocked user B
blockSchema.statics.isBlocked = async function (
    blockerId: string,
    blockedId: string
): Promise<boolean> {
    const block = await this.findOne({ blockerId, blockedId });
    return !!block;
};

// Static method to check if either user has blocked the other
blockSchema.statics.isEitherBlocked = async function (
    userId1: string,
    userId2: string
): Promise<boolean> {
    const block = await this.findOne({
        $or: [
            { blockerId: userId1, blockedId: userId2 },
            { blockerId: userId2, blockedId: userId1 },
        ],
    });
    return !!block;
};

// Static method to get all blocked user IDs for a user
blockSchema.statics.getBlockedIds = async function (
    userId: string
): Promise<string[]> {
    const blocks = await this.find({ blockerId: userId }).select('blockedId');
    return blocks.map((b: IBlock) => b.blockedId);
};

// Static method to get all users who have blocked this user
blockSchema.statics.getBlockedByIds = async function (
    userId: string
): Promise<string[]> {
    const blocks = await this.find({ blockedId: userId }).select('blockerId');
    return blocks.map((b: IBlock) => b.blockerId);
};

// Static method to get all IDs that should be filtered (blocked by me + blocked me)
blockSchema.statics.getAllBlockRelatedIds = async function (
    userId: string
): Promise<string[]> {
    const blocks = await this.find({
        $or: [{ blockerId: userId }, { blockedId: userId }],
    });

    const ids = new Set<string>();
    blocks.forEach((b: IBlock) => {
        if (b.blockerId !== userId) ids.add(b.blockerId);
        if (b.blockedId !== userId) ids.add(b.blockedId);
    });

    return Array.from(ids);
};

export interface IBlockModel extends mongoose.Model<IBlock> {
    isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
    isEitherBlocked(userId1: string, userId2: string): Promise<boolean>;
    getBlockedIds(userId: string): Promise<string[]>;
    getBlockedByIds(userId: string): Promise<string[]>;
    getAllBlockRelatedIds(userId: string): Promise<string[]>;
}

export const Block = mongoose.model<IBlock, IBlockModel>('Block', blockSchema);
