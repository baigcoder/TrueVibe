import http from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { initializeSocketIO } from './socket/index.js';
// Import workers to start BullMQ job processors
import './jobs/worker.js';

const isProd = process.env.NODE_ENV === 'production';

// Production-safe logging
function debugLog(...args: unknown[]): void {
    if (!isProd) console.log(...args);
}

// Validate required environment variables
function validateEnvVars(): void {
    const requiredVars = [
        'MONGODB_URI',
        'SUPABASE_JWT_SECRET',
    ];

    const optionalButRecommended = [
        'CLOUDINARY_URL',
        'CLOUDINARY_CLOUD_NAME',
        'AI_SERVICE_URL',
    ];

    const missing: string[] = [];
    const missingRecommended: string[] = [];

    for (const envVar of requiredVars) {
        if (!process.env[envVar]) {
            missing.push(envVar);
        }
    }

    for (const envVar of optionalButRecommended) {
        if (!process.env[envVar]) {
            missingRecommended.push(envVar);
        }
    }

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(v => console.error(`   - ${v}`));
        if (isProd) {
            console.error('Cannot start server in production without required env vars.');
            process.exit(1);
        } else {
            console.warn('⚠️ Running in development mode with missing env vars.');
        }
    }

    if (missingRecommended.length > 0 && !isProd) {
        debugLog('⚠️ Missing recommended environment variables:');
        missingRecommended.forEach(v => debugLog(`   - ${v}`));
    }
}

// Run validation
validateEnvVars();

debugLog('🔵 Server script initialized. Checking environment...');
debugLog('   NODE_ENV:', process.env.NODE_ENV);
debugLog('   PORT:', process.env.PORT);

const startServer = async (): Promise<void> => {
    debugLog('🏁 Starting server initialization sequence...');
    try {
        // 1. Create Express app
        const app = createApp();

        // 2. Create HTTP server
        const server = http.createServer(app);

        // 3. Initialize Socket.IO
        initializeSocketIO(server);

        // 4. Start listening IMMEDIATELY so healthchecks pass
        const port = config.port;
        const host = '0.0.0.0';

        server.listen(port, host, () => {
            // Always log when server starts (critical for debugging)
            console.log(`🚀 Server listening on http://${host}:${port} [${config.env}]`);
            debugLog(`
🚀 TrueVibe Server is LISTENING!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Environment: ${config.env}
🌐 URL: http://${host}:${port}
📚 API: http://${host}:${port}/api/v1
💓 Health: http://${host}:${port}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            `);
        });

        // 5. Connect to databases in the background/after listening
        debugLog('🔌 Connecting to MongoDB...');
        await connectDatabase();

        debugLog('✅ All services initialized successfully.');

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            debugLog(`\n${signal} received. Shutting down gracefully...`);
            server.close(() => {
                debugLog('HTTP server closed.');
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

