import http from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { getRedisClient } from './config/redis.js';
import { initializeSocketIO } from './socket/index.js';
// Import workers to start BullMQ job processors
import './jobs/worker.js';

console.log('🔵 Server script initialized. Checking environment...');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   PORT:', process.env.PORT);

const startServer = async (): Promise<void> => {
    console.log('🏁 Starting server initialization sequence...');
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
            console.log(`
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
        console.log('🔌 Connecting to MongoDB...');
        await connectDatabase();

        console.log('🔌 Connecting to Redis...');
        getRedisClient(); // Initialize Redis connection

        console.log('✅ All services initialized successfully.');

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);
            server.close(() => {
                console.log('HTTP server closed.');
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
