import mongoose, { Schema, Document } from 'mongoose';

export interface IDetectionItem {
    category: string;
    detected: boolean;
    severity: 'low' | 'medium' | 'high';
    explanation: string;
    score?: number;
}

export interface ITechnicalDetail {
    metric: string;
    value: string;
    interpretation: string;
}

export interface IAIReportContent {
    verdict: 'authentic' | 'suspicious' | 'fake';
    confidence: number;
    summary: string;
    detectionBreakdown: IDetectionItem[];
    technicalDetails: ITechnicalDetail[];
    recommendations: string[];
}

export interface IAIReport extends Document {
    _id: mongoose.Types.ObjectId;
    postId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId; // Owner who requested the report
    analysisId: mongoose.Types.ObjectId;
    report: IAIReportContent;
    modelUsed: 'gemini' | 'gpt' | 'groq' | 'fallback';
    generatedAt: Date;
    createdAt: Date;
}

const detectionItemSchema = new Schema<IDetectionItem>(
    {
        category: { type: String, required: true },
        detected: { type: Boolean, required: true },
        severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
        explanation: { type: String, required: true },
        score: { type: Number },
    },
    { _id: false }
);

const technicalDetailSchema = new Schema<ITechnicalDetail>(
    {
        metric: { type: String, required: true },
        value: { type: String, required: true },
        interpretation: { type: String, required: true },
    },
    { _id: false }
);

const aiReportContentSchema = new Schema<IAIReportContent>(
    {
        verdict: {
            type: String,
            enum: ['authentic', 'suspicious', 'fake'],
            required: true,
        },
        confidence: { type: Number, required: true, min: 0, max: 1 },
        summary: { type: String, required: true },
        detectionBreakdown: [detectionItemSchema],
        technicalDetails: [technicalDetailSchema],
        recommendations: [{ type: String }],
    },
    { _id: false }
);

const aiReportSchema = new Schema<IAIReport>(
    {
        postId: {
            type: Schema.Types.ObjectId,
            ref: 'Post',
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        analysisId: {
            type: Schema.Types.ObjectId,
            ref: 'AIAnalysis',
            required: true,
        },
        report: {
            type: aiReportContentSchema,
            required: true,
        },
        modelUsed: {
            type: String,
            enum: ['gemini', 'gpt', 'groq', 'fallback'],
            required: true,
        },
        generatedAt: {
            type: Date,
            default: Date.now,
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

// Compound index: one report per post per user
aiReportSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const AIReport = mongoose.model<IAIReport>('AIReport', aiReportSchema);
