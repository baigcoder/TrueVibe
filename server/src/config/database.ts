import mongoose from 'mongoose';
import { config } from './index.js';

export const connectDatabase = async (retries = 5): Promise<void> => {
    const options = {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 45000,
    };

    while (retries > 0) {
        try {
            await mongoose.connect(config.mongodb.uri, options);
            console.log('✅ MongoDB connected successfully');

            mongoose.connection.on('error', (err) => {
                console.error('MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                console.warn('MongoDB disconnected. Attempting to reconnect...');
            });

            return; // Success
        } catch (error) {
            retries -= 1;
            console.error(`❌ MongoDB connection failed. Retries left: ${retries}`, error);

            if (retries === 0) {
                console.error('Final MongoDB connection attempt failed. Exiting...');
                process.exit(1);
            }

            // Wait for 2 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
};

export const disconnectDatabase = async (): Promise<void> => {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
};
