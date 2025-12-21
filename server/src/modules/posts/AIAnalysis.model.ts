import mongoose, { Schema, Document } from 'mongoose';

export type AIClassification = 'AUTHENTIC' | 'SUSPICIOUS' | 'LIKELY_FAKE';
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface IAnalysisDetails {
    deepfakeAnalysis?: {
        fakeScore: number;
        realScore: number;
        classification: 'fake' | 'real';
    };
    faceDetection?: {
        detected: boolean;
        confidence: number;
    };
    audioAnalysis?: {
        detected: boolean;
        confidence: number;
    };
    temporalConsistency?: number;
    compressionArtifacts?: number;
    modelDetails?: Record<string, unknown>;
    modelVersion?: string;
}

export interface IAdminOverride {
    overriddenBy: string;
    previousClassification: AIClassification;
    newClassification: AIClassification;
    reason: string;
    timestamp: Date;
}

export interface IAIAnalysis extends Document {
    _id: mongoose.Types.ObjectId;
    mediaId: mongoose.Types.ObjectId;
    postId?: mongoose.Types.ObjectId;
    confidenceScore: number;
    classification: AIClassification;
    analysisDetails: IAnalysisDetails;
    processingTimeMs: number;
    modelVersion: string;
    status: AnalysisStatus;
    errorMessage?: string;
    adminOverride?: IAdminOverride;
    createdAt: Date;
}

const aiAnalysisSchema = new Schema<IAIAnalysis>(
    {
        mediaId: {
            type: Schema.Types.ObjectId,
            ref: 'Media',
            required: true,
            index: true,
        },
        postId: {
            type: Schema.Types.ObjectId,
            ref: 'Post',
            index: true,
        },
        confidenceScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
        },
        classification: {
            type: String,
            enum: ['AUTHENTIC', 'SUSPICIOUS', 'LIKELY_FAKE'],
            default: 'AUTHENTIC',
        },
        analysisDetails: {
            faceDetection: {
                detected: { type: Boolean },
                confidence: { type: Number },
            },
            audioAnalysis: {
                detected: { type: Boolean },
                confidence: { type: Number },
            },
            temporalConsistency: { type: Number },
            compressionArtifacts: { type: Number },
            modelDetails: { type: Schema.Types.Mixed },
        },
        processingTimeMs: {
            type: Number,
            default: 0,
        },
        modelVersion: {
            type: String,
            default: '1.0.0',
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending',
        },
        errorMessage: {
            type: String,
        },
        adminOverride: {
            overriddenBy: { type: String },
            previousClassification: { type: String, enum: ['AUTHENTIC', 'SUSPICIOUS', 'LIKELY_FAKE'] },
            newClassification: { type: String, enum: ['AUTHENTIC', 'SUSPICIOUS', 'LIKELY_FAKE'] },
            reason: { type: String },
            timestamp: { type: Date },
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

// Static method to classify based on score
aiAnalysisSchema.statics.getClassification = function (
    score: number
): AIClassification {
    if (score <= 20) return 'AUTHENTIC';
    if (score <= 60) return 'SUSPICIOUS';
    return 'LIKELY_FAKE';
};

// Convert classification to frontend trust level
aiAnalysisSchema.methods.getTrustLevel = function (): string {
    switch (this.classification) {
        case 'AUTHENTIC':
            return 'authentic';
        case 'SUSPICIOUS':
            return 'suspicious';
        case 'LIKELY_FAKE':
            return 'likely_fake';
        default:
            return 'pending';
    }
};

export const AIAnalysis = mongoose.model<IAIAnalysis>('AIAnalysis', aiAnalysisSchema);
