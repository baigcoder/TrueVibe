import { Request, Response, NextFunction } from 'express';
import { Media } from './Media.model.js';
import {
    generateSignedUploadParams,
    getResponsiveImageUrl,
    getOriginalUrl,
    getCompressedVideoUrl,
    getVideoThumbnail
} from '../../config/cloudinary.js';

// Get signed upload URL for Cloudinary
export const getUploadUrl = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { folder = 'posts' } = req.body;
        const userId = req.user!.userId;

        // Don't include eager transforms - they cause signature mismatch for videos
        // and on-the-fly transformations work well enough
        const uploadParams = generateSignedUploadParams(`truevibe/${folder}/${userId}`, false);

        res.json({
            success: true,
            data: {
                ...uploadParams,
                uploadUrl: `https://api.cloudinary.com/v1_1/${uploadParams.cloudName}/auto/upload`,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Confirm upload and create media record
export const confirmUpload = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const {
            cloudinaryId,
            url,
            type,
            width,
            height,
            duration,
            sizeBytes,
            mimeType,
            thumbnailUrl,
            postId, // NEW: For background video uploads, attach to existing post
        } = req.body;

        const isVideo = type === 'video';

        // Generate optimized and original URLs using helper functions
        // Pass resource type to ensure videos use /video/upload/ path
        const generatedOriginalUrl = getOriginalUrl(cloudinaryId, isVideo ? 'video' : 'image');
        let generatedOptimizedUrl;
        let generatedThumbnailUrl = thumbnailUrl;

        if (isVideo) {
            generatedOptimizedUrl = getCompressedVideoUrl(cloudinaryId, 'standard');
            if (!generatedThumbnailUrl) {
                generatedThumbnailUrl = getVideoThumbnail(cloudinaryId);
            }
        } else {
            generatedOptimizedUrl = getResponsiveImageUrl(cloudinaryId, 'large', 'medium');
            if (!generatedThumbnailUrl) {
                generatedThumbnailUrl = getResponsiveImageUrl(cloudinaryId, 'thumbnail', 'thumbnail');
            }
        }

        const media = await Media.create({
            userId,
            type,
            cloudinaryId,
            url: generatedOptimizedUrl, // Use optimized as main URL
            optimizedUrl: generatedOptimizedUrl,
            originalUrl: generatedOriginalUrl,
            thumbnailUrl: generatedThumbnailUrl || url,
            width: width || 0,
            height: height || 0,
            duration: duration || 0,
            sizeBytes: sizeBytes || 0,
            mimeType: mimeType || '',
        });

        // NEW: If postId is provided (background video upload), attach media to the post
        if (postId) {
            const { Post } = await import('./Post.model.js');
            const { addAIAnalysisJob } = await import('../../jobs/queues.js');

            // Add media to the post's media array
            const updatedPost = await Post.findByIdAndUpdate(
                postId,
                {
                    $push: { media: media._id },
                    // If this is the first media on a pending post, keep it pending for AI analysis
                    $set: { trustLevel: 'pending' }
                },
                { new: true }
            );

            if (updatedPost) {
                console.log(`[Media] Attached ${type} ${media._id} to post ${postId}`);

                // Queue AI analysis for the newly attached video
                await addAIAnalysisJob({
                    mediaId: media._id.toString(),
                    postId: postId,
                });
                console.log(`[Media] Queued AI analysis for ${type}: ${media._id}`);
            } else {
                console.warn(`[Media] Post ${postId} not found, media created but not attached`);
            }
        }

        res.status(201).json({
            success: true,
            data: { media },
        });
    } catch (error) {
        next(error);
    }
};
