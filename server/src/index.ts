import http from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { getRedisClient } from './config/redis.js';
import { initializeSocketIO } from './socket/index.js';
// Import workers to start BullMQ job processors
import './jobs/worker.js';

const startServer = async (): Promise<void> => {
    try {
        // Connect to databases
        await connectDatabase();
        getRedisClient(); // Initialize Redis connection

        // Create Express app
        const app = createApp();

        // Create HTTP server
        const server = http.createServer(app);

        // Initialize Socket.IO
        initializeSocketIO(server);

        // Start server
        server.listen(config.port, () => {
            console.log(`
🚀 TrueVibe Server is running!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Environment: ${config.env}
🌐 URL: http://localhost:${config.port}
📚 API: http://localhost:${config.port}/api/v1
💓 Health: http://localhost:${config.port}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
        });

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
