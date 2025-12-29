import { v2 as cloudinary } from 'cloudinary';
import { config } from './index.js';

cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
});

export interface SignedUploadParams {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
    eager?: string;
}

/**
 * Quality Presets for Cloudinary transformations
 * Uses Cloudinary's 'quality' parameter with auto optimization
 */
export const QualityPresets = {
    // Original quality preserved
    original: { quality: 100 },
    // High quality for large screens (desktop)
    high: { quality: 'auto:best' },
    // Good quality with significant compression (tablets)
    medium: { quality: 'auto:good' },
    // Lower quality for mobile data saving
    low: { quality: 'auto:eco' },
    // Smallest file size (thumbnails)
    thumbnail: { quality: 'auto:low' },
} as const;

/**
 * Size Presets for responsive images
 */
export const SizePresets = {
    thumbnail: { width: 150, height: 150, crop: 'fill' as const },
    small: { width: 320, crop: 'scale' as const },
    medium: { width: 640, crop: 'scale' as const },
    large: { width: 1024, crop: 'scale' as const },
    full: { width: 1920, crop: 'limit' as const },
} as const;

/**
 * Video Quality Presets
 */
export const VideoPresets = {
    // Compressed for mobile/preview
    compressed: {
        video_codec: 'auto',
        quality: 'auto:eco',
        format: 'mp4',
        audio_codec: 'aac',
    },
    // Standard quality
    standard: {
        video_codec: 'auto',
        quality: 'auto:good',
        format: 'mp4',
        audio_codec: 'aac',  // Preserve audio
    },
    // High quality
    high: {
        video_codec: 'h265',
        quality: 'auto:best',
        format: 'mp4',
        audio_codec: 'aac',  // Preserve audio
    },
} as const;

/**
 * Generate signed upload params with eager transformations for IMAGES
 * Cloudinary will automatically generate compressed versions on upload
 */
export const generateSignedUploadParams = (
    folder: string = 'truevibe',
    includeEagerTransforms: boolean = true
): SignedUploadParams => {
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Eager transformations run on upload to pre-generate optimized versions
    const eagerTransforms = includeEagerTransforms ? [
        // Thumbnail
        { width: 150, height: 150, crop: 'fill', format: 'webp', quality: 'auto:low' },
        // Mobile optimized
        { width: 640, crop: 'scale', format: 'webp', quality: 'auto:eco' },
        // Desktop optimized
        { width: 1024, crop: 'scale', format: 'webp', quality: 'auto:good' },
    ] : [];

    const params: Record<string, unknown> = {
        timestamp,
        folder,
    };

    if (eagerTransforms.length > 0) {
        params.eager = eagerTransforms
            .map(t => Object.entries(t).map(([k, v]) => `${k}_${v}`).join(','))
            .join('|');
    }

    const signature = cloudinary.utils.api_sign_request(
        params,
        config.cloudinary.apiSecret
    );

    return {
        signature,
        timestamp,
        cloudName: config.cloudinary.cloudName,
        apiKey: config.cloudinary.apiKey,
        folder,
        eager: params.eager as string,
    };
};

/**
 * Generate signed upload params with eager transformations for VIDEOS
 * Creates compressed mp4 version for fast playback
 */
export const generateVideoUploadParams = (
    folder: string = 'truevibe'
): SignedUploadParams => {
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Video eager transformations - create compressed versions on upload
    // Format: vc_auto,q_auto:good,ac_aac,f_mp4 (video codec, quality, audio codec, format)
    const eagerTransforms = [
        // Standard quality - balanced compression for fast playback
        'vc_auto,q_auto:good,ac_aac,f_mp4',
        // Mobile/preview - smaller file for quick loading
        'vc_auto,q_auto:eco,w_640,ac_aac,f_mp4',
    ];

    const params: Record<string, unknown> = {
        timestamp,
        folder,
        resource_type: 'video',
        eager: eagerTransforms.join('|'),
        eager_async: true, // Process in background - don't block upload
    };

    const signature = cloudinary.utils.api_sign_request(
        params,
        config.cloudinary.apiSecret
    );

    return {
        signature,
        timestamp,
        cloudName: config.cloudinary.cloudName,
        apiKey: config.cloudinary.apiKey,
        folder,
        eager: params.eager as string,
    };
};

/**
 * Get responsive image URL with specific quality/size preset
 */
export const getResponsiveImageUrl = (
    publicId: string,
    sizePreset: keyof typeof SizePresets = 'medium',
    qualityPreset: keyof typeof QualityPresets = 'medium'
): string => {
    const size = SizePresets[sizePreset];
    const quality = QualityPresets[qualityPreset];

    return cloudinary.url(publicId, {
        secure: true,
        transformation: [
            {
                ...size,
                ...quality,
                format: 'auto', // WebP on supported browsers, fallback otherwise
                fetch_format: 'auto',
            },
        ],
    });
};

/**
 * Get video URL with compression
 */
export const getCompressedVideoUrl = (
    publicId: string,
    preset: keyof typeof VideoPresets = 'standard'
): string => {
    const videoOptions = VideoPresets[preset];

    return cloudinary.url(publicId, {
        secure: true,
        resource_type: 'video',
        transformation: [videoOptions],
    });
};

/**
 * Get video thumbnail
 */
export const getVideoThumbnail = (
    publicId: string,
    options?: { width?: number; height?: number; time?: string }
): string => {
    return cloudinary.url(publicId, {
        secure: true,
        resource_type: 'video',
        format: 'jpg',
        transformation: [
            {
                width: options?.width || 640,
                height: options?.height || 360,
                crop: 'fill',
                start_offset: options?.time || '0', // Capture frame at specific time
                quality: 'auto:good',
            },
        ],
    });
};

/**
 * Generate srcset for responsive images
 * Returns multiple sizes for browser to choose from
 */
export const generateSrcSet = (publicId: string): string => {
    const widths = [320, 640, 768, 1024, 1280, 1920];

    return widths.map(w => {
        const url = cloudinary.url(publicId, {
            secure: true,
            transformation: [
                {
                    width: w,
                    crop: 'scale',
                    format: 'auto',
                    quality: 'auto:good',
                },
            ],
        });
        return `${url} ${w}w`;
    }).join(', ');
};

/**
 * Get original quality URL (no compression)
 * @param publicId - Cloudinary public ID
 * @param resourceType - 'image' or 'video' (defaults to 'image')
 */
export const getOriginalUrl = (publicId: string, resourceType: 'image' | 'video' = 'image'): string => {
    return cloudinary.url(publicId, {
        secure: true,
        resource_type: resourceType,
        transformation: [],
    });
};

/**
 * Legacy function for backwards compatibility
 */
export const getCloudinaryUrl = (
    publicId: string,
    options?: {
        width?: number;
        height?: number;
        format?: string;
        quality?: number | string;
    }
): string => {
    return cloudinary.url(publicId, {
        secure: true,
        transformation: [
            {
                width: options?.width,
                height: options?.height,
                crop: 'fill',
                format: options?.format || 'auto',
                quality: options?.quality || 'auto',
            },
        ],
    });
};

/**
 * Extract Cloudinary public_id from a URL
 * Works with URLs like: https://res.cloudinary.com/cloud_name/image/upload/v123456/folder/filename.ext
 */
export const extractPublicId = (url: string): string | null => {
    if (!url || !url.includes('cloudinary.com')) return null;

    try {
        // Match pattern: /upload/v{version}/{public_id}.{ext}
        // or /upload/{public_id}.{ext}
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^/.]+)?$/);
        if (match && match[1]) {
            return match[1];
        }
        return null;
    } catch {
        return null;
    }
};

/**
 * Delete asset from Cloudinary
 * @param publicId - The public ID of the asset
 * @param resourceType - 'image' or 'video' (defaults to 'image')
 */
export const deleteCloudinaryAsset = async (
    publicId: string,
    resourceType: 'image' | 'video' = 'image'
): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
        console.warn(`Failed to delete Cloudinary asset ${publicId}:`, error);
    }
};

/**
 * Delete media from Cloudinary by URL
 * Automatically detects resource type from URL
 */
export const deleteCloudinaryByUrl = async (url: string): Promise<void> => {
    const publicId = extractPublicId(url);
    if (!publicId) return;

    // Detect if video from URL
    const isVideo = url.includes('/video/') || url.match(/\.(mp4|mov|avi|webm)$/i);
    await deleteCloudinaryAsset(publicId, isVideo ? 'video' : 'image');
};

export { cloudinary };
