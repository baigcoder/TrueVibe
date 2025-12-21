import mongoose, { Schema, Document } from 'mongoose';

export interface IChannelCategory extends Document {
    _id: mongoose.Types.ObjectId;
    serverId: mongoose.Types.ObjectId;
    name: string;
    position: number;
    isCollapsed: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const channelCategorySchema = new Schema<IChannelCategory>(
    {
        serverId: {
            type: Schema.Types.ObjectId,
            ref: 'Server',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Category name is required'],
            maxlength: [50, 'Category name cannot exceed 50 characters'],
            trim: true,
        },
        position: {
            type: Number,
            default: 0,
        },
        isCollapsed: {
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

// Indexes
channelCategorySchema.index({ serverId: 1, position: 1 });

export const ChannelCategory = mongoose.model<IChannelCategory>('ChannelCategory', channelCategorySchema);
