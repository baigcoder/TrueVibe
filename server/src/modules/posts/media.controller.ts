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
        } = req.body;

        const isVideo = type === 'video';

        // Generate optimized and original URLs using helper functions
        const generatedOriginalUrl = getOriginalUrl(cloudinaryId);
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

        res.status(201).json({
            success: true,
            data: { media },
        });
    } catch (error) {
        next(error);
    }
};
