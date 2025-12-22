import mongoose, { Schema, Document } from 'mongoose';

export interface IProfile extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId | string;
    clerkId?: string;  // Clerk user ID (deprecated)
    supabaseId?: string;  // Supabase user ID
    name: string;
    handle: string;
    avatar: string;
    coverImage: string;
    bio: string;
    location: string;
    website: string;
    followers: number;
    following: number;
    trustScore: number;
    verified: boolean;
    privacy: {
        profileVisibility: 'public' | 'followers' | 'private';
        showTrustScore: boolean;
        allowMessages: 'everyone' | 'followers' | 'none';
    };
    createdAt: Date;
    updatedAt: Date;
    // Spotify Integration
    spotifyAccessToken?: string;
    spotifyRefreshToken?: string;
    spotifyTokenExpiry?: Date;
    spotifyUserId?: string;
    spotifyDisplayName?: string;
    spotifyConnected?: boolean;
}

const profileSchema = new Schema<IProfile>(
    {
        userId: {
            type: Schema.Types.Mixed,  // Support both ObjectId and string (clerkId)
            required: true,
            index: true,
        },
        clerkId: {
            type: String,
            sparse: true,
            unique: true,
            index: true,
        },
        supabaseId: {
            type: String,
            sparse: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        handle: {
            type: String,
            required: [true, 'Handle is required'],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
            match: [/^[a-z0-9_]+$/, 'Handle can only contain lowercase letters, numbers, and underscores'],
            minlength: [3, 'Handle must be at least 3 characters'],
            maxlength: [30, 'Handle cannot exceed 30 characters'],
        },
        avatar: {
            type: String,
            default: '',
        },
        coverImage: {
            type: String,
            default: '',
        },
        bio: {
            type: String,
            default: '',
            maxlength: [500, 'Bio cannot exceed 500 characters'],
        },
        location: {
            type: String,
            default: '',
            maxlength: [100, 'Location cannot exceed 100 characters'],
        },
        website: {
            type: String,
            default: '',
            maxlength: [200, 'Website URL cannot exceed 200 characters'],
        },
        followers: {
            type: Number,
            default: 0,
            min: 0,
        },
        following: {
            type: Number,
            default: 0,
            min: 0,
        },
        trustScore: {
            type: Number,
            default: 50,
            min: 0,
            max: 100,
        },
        verified: {
            type: Boolean,
            default: false,
        },
        privacy: {
            profileVisibility: {
                type: String,
                enum: ['public', 'followers', 'private'],
                default: 'public',
            },
            showTrustScore: {
                type: Boolean,
                default: true,
            },
            allowMessages: {
                type: String,
                enum: ['everyone', 'followers', 'none'],
                default: 'everyone',
            },
        },
        // Spotify Integration
        spotifyAccessToken: String,
        spotifyRefreshToken: String,
        spotifyTokenExpiry: Date,
        spotifyUserId: String,
        spotifyDisplayName: String,
        spotifyConnected: {
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

// Virtual for formatted handle with @
profileSchema.virtual('displayHandle').get(function () {
    return `@${this.handle}`;
});

export const Profile = mongoose.model<IProfile>('Profile', profileSchema);
