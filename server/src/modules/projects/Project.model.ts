import mongoose, { Schema, Document } from 'mongoose';

export type ProjectStatus = 'draft' | 'published' | 'archived';

export interface IProjectMedia {
    url: string;
    publicId?: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    duration?: number; // For videos
}

export interface IProjectLink {
    label: string;
    url: string;
    icon?: string; // e.g., 'github', 'demo', 'website'
}

export interface IProject extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    slug: string;
    description: string;
    shortDescription?: string;
    thumbnail: IProjectMedia;
    screenshots: IProjectMedia[];
    videos: IProjectMedia[];
    links: IProjectLink[];
    techStack: string[];
    tags: string[];
    category?: string;
    status: ProjectStatus;
    featured: boolean;
    order: number;
    createdBy: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const projectMediaSchema = new Schema<IProjectMedia>(
    {
        url: { type: String, required: true },
        publicId: { type: String },
        thumbnailUrl: { type: String },
        width: { type: Number },
        height: { type: Number },
        duration: { type: Number },
    },
    { _id: false }
);

const projectLinkSchema = new Schema<IProjectLink>(
    {
        label: { type: String, required: true },
        url: { type: String, required: true },
        icon: { type: String },
    },
    { _id: false }
);

const projectSchema = new Schema<IProject>(
    {
        title: {
            type: String,
            required: [true, 'Project title is required'],
            maxlength: [200, 'Title cannot exceed 200 characters'],
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Project description is required'],
            maxlength: [10000, 'Description cannot exceed 10000 characters'],
        },
        shortDescription: {
            type: String,
            maxlength: [500, 'Short description cannot exceed 500 characters'],
        },
        thumbnail: {
            type: projectMediaSchema,
            required: [true, 'Project thumbnail is required'],
        },
        screenshots: [projectMediaSchema],
        videos: [projectMediaSchema],
        links: [projectLinkSchema],
        techStack: [{
            type: String,
            trim: true,
        }],
        tags: [{
            type: String,
            lowercase: true,
            trim: true,
        }],
        category: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
        },
        featured: {
            type: Boolean,
            default: false,
        },
        order: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: String,
            required: true,
            index: true,
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

// Indexes
projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ slug: 1 });
projectSchema.index({ featured: 1, status: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ category: 1 });

// Pre-save hook to generate slug
projectSchema.pre('save', function (next) {
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            + '-' + Date.now();
    }
    next();
});

export const Project = mongoose.model<IProject>('Project', projectSchema);
