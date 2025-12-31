import mongoose, { Schema, Document } from 'mongoose';

export interface ICollection extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    name: string;
    description?: string;
    coverImage?: string;
    isPrivate: boolean;
    posts: mongoose.Types.ObjectId[];
    postsCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const collectionSchema = new Schema<ICollection>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: [100, 'Collection name cannot exceed 100 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Collection description cannot exceed 500 characters'],
        },
        coverImage: {
            type: String,
        },
        isPrivate: {
            type: Boolean,
            default: true,
        },
        posts: [{
            type: Schema.Types.ObjectId,
            ref: 'Post',
        }],
        postsCount: {
            type: Number,
            default: 0,
            min: 0,
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

// Compound index for user's collections
collectionSchema.index({ userId: 1, name: 1 }, { unique: true });
collectionSchema.index({ userId: 1, createdAt: -1 });

// Pre-save hook to update posts count
collectionSchema.pre('save', function (next) {
    if (this.isModified('posts')) {
        this.postsCount = this.posts.length;
    }
    next();
});

// Static method to add post to collection
collectionSchema.statics.addPost = async function (
    collectionId: string,
    userId: string,
    postId: mongoose.Types.ObjectId
): Promise<ICollection | null> {
    return this.findOneAndUpdate(
        { _id: collectionId, userId },
        {
            $addToSet: { posts: postId },
            $inc: { postsCount: 1 }
        },
        { new: true }
    );
};

// Static method to remove post from collection
collectionSchema.statics.removePost = async function (
    collectionId: string,
    userId: string,
    postId: mongoose.Types.ObjectId
): Promise<ICollection | null> {
    return this.findOneAndUpdate(
        { _id: collectionId, userId },
        {
            $pull: { posts: postId },
            $inc: { postsCount: -1 }
        },
        { new: true }
    );
};

// Static method to get default "All Saved" collection or create it
collectionSchema.statics.getOrCreateDefault = async function (
    userId: string
): Promise<ICollection> {
    let collection = await this.findOne({ userId, name: 'All Saved' });
    if (!collection) {
        collection = await this.create({
            userId,
            name: 'All Saved',
            description: 'All your saved posts',
            isPrivate: true,
        });
    }
    return collection;
};

export interface ICollectionModel extends mongoose.Model<ICollection> {
    addPost(collectionId: string, userId: string, postId: mongoose.Types.ObjectId): Promise<ICollection | null>;
    removePost(collectionId: string, userId: string, postId: mongoose.Types.ObjectId): Promise<ICollection | null>;
    getOrCreateDefault(userId: string): Promise<ICollection>;
}

export const Collection = mongoose.model<ICollection, ICollectionModel>('Collection', collectionSchema);
