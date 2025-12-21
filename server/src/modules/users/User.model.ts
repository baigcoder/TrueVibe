import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    email: string;
    password?: string;
    role: 'user' | 'admin';
    status: 'active' | 'suspended' | 'pending';
    verified: boolean;
    oauthProviders: Array<{
        provider: string;
        providerId: string;
    }>;
    refreshTokens: Array<{
        token: string;
        device?: string;
        expiresAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;

    // Methods
    comparePassword(candidatePassword: string): Promise<boolean>;
    addRefreshToken(token: string, device?: string, expiresAt?: Date): void;
    removeRefreshToken(token: string): void;
}

interface IUserModel extends Model<IUser> {
    findByEmail(email: string): Promise<IUser | null>;
}

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // Don't return password by default
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        status: {
            type: String,
            enum: ['active', 'suspended', 'pending'],
            default: 'active',
        },
        verified: {
            type: Boolean,
            default: false,
        },
        oauthProviders: [{
            provider: { type: String, required: true },
            providerId: { type: String, required: true },
        }],
        refreshTokens: [{
            token: { type: String, required: true },
            device: { type: String },
            expiresAt: { type: Date, required: true },
        }],
    },
    {
        timestamps: true,
        toJSON: {
            transform: (doc, ret: Record<string, unknown>) => {
                ret.password = undefined;
                ret.refreshTokens = undefined;
                ret.__v = undefined;
                return ret;
            },
        },
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Add refresh token
userSchema.methods.addRefreshToken = function (
    token: string,
    device?: string,
    expiresAt?: Date
): void {
    const expiry = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    this.refreshTokens.push({ token, device, expiresAt: expiry });

    // Clean up expired tokens
    this.refreshTokens = this.refreshTokens.filter(
        (t: { expiresAt: Date }) => t.expiresAt > new Date()
    );
};

// Remove refresh token
userSchema.methods.removeRefreshToken = function (token: string): void {
    this.refreshTokens = this.refreshTokens.filter(
        (t: { token: string }) => t.token !== token
    );
};

// Static method to find by email
userSchema.statics.findByEmail = function (email: string) {
    return this.findOne({ email: email.toLowerCase() });
};

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
