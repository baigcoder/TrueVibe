/**
 * Production-safe Logger
 * Only logs in development environment
 */

const isDev = import.meta.env.DEV;

export const logger = {
    log: (...args: unknown[]) => {
        if (isDev) console.log(...args);
    },
    info: (...args: unknown[]) => {
        if (isDev) console.info(...args);
    },
    warn: (...args: unknown[]) => {
        if (isDev) console.warn(...args);
    },
    error: (...args: unknown[]) => {
        // Always log errors, but sanitize in production
        if (isDev) {
            console.error(...args);
        } else {
            console.error('An error occurred');
        }
    },
    debug: (...args: unknown[]) => {
        if (isDev) console.debug(...args);
    },
};

// Silence all console in production
if (!isDev) {
    console.log = () => { };
    console.info = () => { };
    console.debug = () => { };
    console.warn = () => { };
    // Keep console.error for critical issues but sanitize
}

export default logger;
