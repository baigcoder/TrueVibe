import mongoose, { Schema, Document } from 'mongoose';

export interface ICallLog extends Document {
    _id: mongoose.Types.ObjectId;
    callerId: string;
    receiverId: string;
    callType: 'audio' | 'video';
    status: 'completed' | 'missed' | 'rejected' | 'no_answer';
    startedAt?: Date;
    endedAt?: Date;
    duration?: number; // in seconds
    createdAt: Date;
    updatedAt: Date;
}

const callLogSchema = new Schema<ICallLog>(
    {
        callerId: {
            type: String,
            required: true,
            index: true,
        },
        receiverId: {
            type: String,
            required: true,
            index: true,
        },
        callType: {
            type: String,
            enum: ['audio', 'video'],
            required: true,
        },
        status: {
            type: String,
            enum: ['completed', 'missed', 'rejected', 'no_answer'],
            required: true,
        },
        startedAt: {
            type: Date,
        },
        endedAt: {
            type: Date,
        },
        duration: {
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

// Compound index for efficient queries
callLogSchema.index({ callerId: 1, createdAt: -1 });
callLogSchema.index({ receiverId: 1, createdAt: -1 });

export const CallLog = mongoose.model<ICallLog>('CallLog', callLogSchema);
