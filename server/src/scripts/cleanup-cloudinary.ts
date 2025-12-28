/**
 * Cloudinary Cleanup Script
 * Deletes ALL assets from Cloudinary for TrueVibe
 * 
 * Run with: npx tsx server/src/scripts/cleanup-cloudinary.ts
 */

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function deleteAllResources() {
    console.log('🗑️  Starting Cloudinary cleanup...\n');

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    console.log(`📦 Cloud Name: ${cloudName}`);
    console.log('─'.repeat(50));

    let totalDeleted = 0;

    // Delete all resources by type
    const resourceTypes = ['image', 'video', 'raw'] as const;

    for (const resourceType of resourceTypes) {
        console.log(`\n📁 Processing ${resourceType}s...`);

        try {
            let hasMore = true;
            let nextCursor: string | undefined;

            while (hasMore) {
                // Get resources
                const result = await cloudinary.api.resources({
                    resource_type: resourceType,
                    max_results: 500,
                    next_cursor: nextCursor,
                });

                if (result.resources && result.resources.length > 0) {
                    const publicIds = result.resources.map((r: any) => r.public_id);

                    console.log(`   Found ${publicIds.length} ${resourceType}(s)`);

                    // Delete in batches of 100
                    for (let i = 0; i < publicIds.length; i += 100) {
                        const batch = publicIds.slice(i, i + 100);
                        await cloudinary.api.delete_resources(batch, {
                            resource_type: resourceType,
                        });
                        totalDeleted += batch.length;
                        console.log(`   ✓ Deleted ${batch.length} ${resourceType}(s)`);
                    }

                    nextCursor = result.next_cursor;
                    hasMore = !!nextCursor;
                } else {
                    console.log(`   No ${resourceType}s found`);
                    hasMore = false;
                }
            }
        } catch (error: any) {
            if (error.error?.message?.includes('not found')) {
                console.log(`   No ${resourceType}s to delete`);
            } else {
                console.error(`   ❌ Error deleting ${resourceType}s:`, error.message);
            }
        }
    }

    // Delete all folders
    console.log('\n📂 Cleaning up folders...');
    try {
        const folders = await cloudinary.api.root_folders();
        for (const folder of folders.folders || []) {
            console.log(`   Deleting folder: ${folder.name}`);
            try {
                await cloudinary.api.delete_folder(folder.path);
                console.log(`   ✓ Deleted folder: ${folder.name}`);
            } catch (e: any) {
                console.log(`   ⚠️ Could not delete folder ${folder.name}: ${e.message}`);
            }
        }
    } catch (error: any) {
        console.log('   No folders to delete or error:', error.message);
    }

    console.log('\n' + '─'.repeat(50));
    console.log(`✅ Cleanup complete! Deleted ${totalDeleted} total resources.`);
    console.log('─'.repeat(50));
}

// Run the cleanup
deleteAllResources().catch(console.error);
