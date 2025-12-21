import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
    _id: mongoose.Types.ObjectId;
    postId?: mongoose.Types.ObjectId;
    shortId?: mongoose.Types.ObjectId;
    userId: string;
    parentId?: mongoose.Types.ObjectId;
    content: string;
    likes: string[];
    likesCount: number;
    repliesCount: number;
    flagged: boolean;
    flagReason?: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
    {
        postId: {
            type: Schema.Types.ObjectId,
            ref: 'Post',
            required: false,
            index: true,
        },
        shortId: {
            type: Schema.Types.ObjectId,
            ref: 'Short',
            required: false,
            index: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        parentId: {
            type: Schema.Types.ObjectId,
            ref: 'Comment',
            default: null,
            index: true,
        },
        content: {
            type: String,
            required: [true, 'Comment content is required'],
            maxlength: [1000, 'Comment cannot exceed 1000 characters'],
            trim: true,
        },
        likes: [{
            type: String,
        }],
        likesCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        repliesCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        flagged: {
            type: Boolean,
            default: false,
        },
        flagReason: {
            type: String,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (doc, ret: Record<string, unknown>) => {
                ret.__v = undefined;
                return ret;
            },
        },
    }
);

// Compound indexes for efficient nested comment queries
commentSchema.index({ postId: 1, parentId: 1, createdAt: -1 });
commentSchema.index({ shortId: 1, parentId: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
