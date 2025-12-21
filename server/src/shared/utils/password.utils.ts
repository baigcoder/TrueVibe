/**
 * Password Utilities - Industry Standard Password Validation
 */

export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'fair' | 'strong' | 'very_strong';
    score: number; // 0-100
}

interface PasswordRules {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    disallowCommonPasswords: boolean;
}

const DEFAULT_RULES: PasswordRules = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    disallowCommonPasswords: true,
};

// Common passwords to block (top 100 most common)
const COMMON_PASSWORDS = new Set([
    'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
    'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
    'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
    'qazwsx', 'michael', 'football', 'password1', 'password123', 'batman',
    'login', 'admin', 'welcome', 'hello', 'charlie', 'donald', 'loveme',
    'jessica', 'pepper', 'zaq1zaq1', 'password!', 'qwerty123', 'aa123456',
]);

/**
 * Validate password strength against configurable rules
 */
export const validatePassword = (
    password: string,
    rules: Partial<PasswordRules> = {}
): PasswordValidationResult => {
    const config = { ...DEFAULT_RULES, ...rules };
    const errors: string[] = [];
    let score = 0;

    // Length checks
    if (password.length < config.minLength) {
        errors.push(`Password must be at least ${config.minLength} characters`);
    } else {
        score += 20;
        // Bonus for longer passwords
        if (password.length >= 12) score += 10;
        if (password.length >= 16) score += 10;
    }

    if (password.length > config.maxLength) {
        errors.push(`Password must be at most ${config.maxLength} characters`);
    }

    // Character class checks
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);

    if (config.requireUppercase && !hasUppercase) {
        errors.push('Password must contain at least one uppercase letter');
    } else if (hasUppercase) {
        score += 15;
    }

    if (config.requireLowercase && !hasLowercase) {
        errors.push('Password must contain at least one lowercase letter');
    } else if (hasLowercase) {
        score += 15;
    }

    if (config.requireNumbers && !hasNumbers) {
        errors.push('Password must contain at least one number');
    } else if (hasNumbers) {
        score += 15;
    }

    if (config.requireSpecialChars && !hasSpecialChars) {
        errors.push('Password must contain at least one special character (!@#$%^&*...)');
    } else if (hasSpecialChars) {
        score += 15;
    }

    // Common password check
    if (config.disallowCommonPasswords) {
        const lowerPassword = password.toLowerCase();
        if (COMMON_PASSWORDS.has(lowerPassword)) {
            errors.push('Password is too common, please choose a more unique password');
            score = Math.max(0, score - 40);
        }
    }

    // Additional entropy checks
    const uniqueChars = new Set(password).size;
    if (uniqueChars < password.length * 0.5) {
        score = Math.max(0, score - 10); // Penalize repetitive passwords
    }

    // Determine strength level
    let strength: PasswordValidationResult['strength'];
    if (score >= 80) {
        strength = 'very_strong';
    } else if (score >= 60) {
        strength = 'strong';
    } else if (score >= 40) {
        strength = 'fair';
    } else {
        strength = 'weak';
    }

    return {
        isValid: errors.length === 0,
        errors,
        strength,
        score: Math.min(100, score),
    };
};

/**
 * Generate a secure random password
 */
export const generateSecurePassword = (length: number = 16): string => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=';
    const all = uppercase + lowercase + numbers + special;

    let password = '';

    // Ensure at least one of each required type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
        password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
};
