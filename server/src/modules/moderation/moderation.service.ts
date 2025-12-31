// Configurable list of blocked words/patterns for content moderation
// Organized by category for maintenance and selective enforcement

import { logger } from '../../shared/utils/logger.js';

// NOTE: This list contains offensive words for content filtering purposes only
// Keep this list up-to-date with community standards

// Slurs and highly offensive terms (immediate block)
const SLURS: string[] = [
    // Racial slurs
    'n1gger', 'n1gga', 'nigger', 'nigga', 'spic', 'wetback', 'beaner', 'chink', 'gook', 'kike', 'heeb',
    'paki', 'raghead', 'towelhead', 'camel jockey', 'darkie', 'coon', 'jigaboo', 'sambo', 'jungle bunny',
    // Homophobic slurs
    'faggot', 'fag', 'dyke', 'tranny', 'shemale',
    // Ableist slurs
    'retard', 'retarded', 'tard',
    // Misogynistic slurs (severe)
    'cunt', 'bitch' // Note: 'bitch' may need contextual analysis
];

// Hate speech and extremism
const HATE_SPEECH: string[] = [
    'white power', 'heil hitler', 'white supremacy', 'white nationalist', 'sieg heil',
    'race war', 'ethnic cleansing', 'kill all', 'death to', 'gas the',
    '1488', '88', '14 words', // Neo-Nazi codes
];

// Harassment and threats
const HARASSMENT: string[] = [
    'kys', 'kill yourself', 'you should die', 'go die', 'drink bleach',
    'neck yourself', 'end your life', 'off yourself', 'rope yourself',
    'hope you die', 'wish you were dead', 'nobody loves you',
];

// Violence and gore
const VIOLENCE: string[] = [
    'gore', 'snuff', 'murder porn', 'rape video', 'beheading', 'execution video',
    'child porn', 'cp', 'jailbait', 'kiddie', 'pedo', 'pedophile',
];

// Illegal activities  
const ILLEGAL: string[] = [
    'hitman for hire', 'murder for hire', 'buy drugs', 'sell cocaine',
    'sell meth', 'buy heroin', 'fentanyl', 'dark web market',
];

// Spam and scam patterns
const SCAM_KEYWORDS: string[] = [
    'free money', 'get rich quick', 'double your bitcoin', 'send btc',
    'nigerian prince', 'wire transfer', 'western union', 'gift card payment',
    'account suspended', 'verify your account', 'click here now',
];

// Combine all into main export
export const BLOCKED_WORDS = [
    ...SLURS,
    ...HATE_SPEECH,
    ...HARASSMENT,
    ...VIOLENCE,
    ...ILLEGAL,
    ...SCAM_KEYWORDS,
];

export const SPAM_PATTERNS = [
    // URL shortener spam
    /(?:https?:\/\/)?(?:www\.)?(?:bit\.ly|goo\.gl|t\.co|tinyurl\.com|ow\.ly|is\.gd|buff\.ly|adf\.ly|tr\.im|tiny\.cc)/gi,
    // Repeated characters (more than 5)
    /(.)\1{5,}/g,
    // Contact info spam
    /(?:whatsapp|telegram|signal|dm\s+me|inbox\s+me|text\s+me|call\s+me)/gi,
    // Money/crypto scam patterns
    /(?:earn|make|get)\s+\$?\d+(?:k|K)?\s*(?:daily|weekly|monthly|a day|a week|per day)/gi,
    /(?:bitcoin|btc|crypto|nft|ethereum|eth)\s+(?:giveaway|free|double|airdrop)/gi,
    /(?:invest|deposit)\s+\$?\d+\s+(?:get|receive|earn)\s+\$?\d+/gi,
    // Phishing patterns
    /(?:verify|confirm|update)\s+(?:your)?\s*(?:account|password|payment)/gi,
    /(?:account|password)\s+(?:expired|suspended|locked)/gi,
    // Excessive emojis (more than 10 in a row)
    /(?:[\u{1F300}-\u{1F9FF}][\s]*){10,}/gu,
    // Fake urgency
    /(?:act now|limited time|only \d+ left|expires in|last chance)/gi,
    // Link spam (many URLs)
    /(https?:\/\/[^\s]+\s*){5,}/gi,
    // Adult content spam
    /(?:onlyfans|fansly|cam\s?girl|porn\s?link|xxx\s?video)/gi,
];

export const SENSITIVE_TOPICS = [
    // Topics that may need content warnings
    'suicide',
    'self-harm',
    'self harm',
    'cutting',
    'eating disorder',
    'anorexia',
    'bulimia',
    'sexual assault',
    'rape',
    'domestic violence',
    'child abuse',
    'animal abuse',
    'mass shooting',
    'terrorism',
    'genocide',
];

export interface ModerationResult {
    isAllowed: boolean;
    flags: {
        hasBlockedWords: boolean;
        isSpam: boolean;
        hasSensitiveContent: boolean;
        overallRisk: 'low' | 'medium' | 'high';
    };
    blockedWords: string[];
    reason?: string;
}

/**
 * Check content against moderation rules
 */
export function moderateContent(content: string): ModerationResult {
    const lowerContent = content.toLowerCase();
    const result: ModerationResult = {
        isAllowed: true,
        flags: {
            hasBlockedWords: false,
            isSpam: false,
            hasSensitiveContent: false,
            overallRisk: 'low',
        },
        blockedWords: [],
    };

    // Check for blocked words
    const foundBlockedWords = BLOCKED_WORDS.filter(word =>
        lowerContent.includes(word.toLowerCase())
    );
    if (foundBlockedWords.length > 0) {
        result.flags.hasBlockedWords = true;
        result.blockedWords = foundBlockedWords;
    }

    // Check for spam patterns
    for (const pattern of SPAM_PATTERNS) {
        if (pattern.test(content)) {
            result.flags.isSpam = true;
            break;
        }
    }

    // Check for sensitive content
    const hasSensitive = SENSITIVE_TOPICS.some(topic =>
        lowerContent.includes(topic.toLowerCase())
    );
    if (hasSensitive) {
        result.flags.hasSensitiveContent = true;
    }

    // Calculate overall risk
    let riskScore = 0;
    if (result.flags.hasBlockedWords) riskScore += 3;
    if (result.flags.isSpam) riskScore += 2;
    if (result.flags.hasSensitiveContent) riskScore += 1;

    if (riskScore >= 3) {
        result.flags.overallRisk = 'high';
        result.isAllowed = false;
        result.reason = 'Content flagged for review due to policy violations';
    } else if (riskScore >= 1) {
        result.flags.overallRisk = 'medium';
        // Still allowed but flagged
    }

    return result;
}

/**
 * Moderate content with structured logging
 * Use this version for production logging of moderation actions
 */
export function moderateContentWithLogging(
    content: string,
    context: {
        userId?: string;
        contentType?: 'post' | 'comment' | 'message' | 'username' | 'bio';
        contentId?: string;
    } = {}
): ModerationResult {
    const result = moderateContent(content);

    // Log moderation actions for audit trail
    if (result.flags.overallRisk !== 'low') {
        const contentSnippet = content.length > 100
            ? content.substring(0, 100) + '...'
            : content;

        logger.warn('[Moderation] Content flagged', {
            userId: context.userId || 'anonymous',
            contentType: context.contentType || 'unknown',
            contentId: context.contentId,
            riskLevel: result.flags.overallRisk,
            isAllowed: result.isAllowed,
            flags: {
                hasBlockedWords: result.flags.hasBlockedWords,
                isSpam: result.flags.isSpam,
                hasSensitiveContent: result.flags.hasSensitiveContent,
            },
            blockedWordsCount: result.blockedWords.length,
            // Only log snippet for medium risk, not for high risk (contains bad words)
            contentSnippet: result.flags.overallRisk === 'medium' ? contentSnippet : '[REDACTED]',
            timestamp: new Date().toISOString(),
        });
    }

    // Log blocked content separately for review queue
    if (!result.isAllowed) {
        logger.error('[Moderation] Content blocked', {
            userId: context.userId || 'anonymous',
            contentType: context.contentType || 'unknown',
            contentId: context.contentId,
            reason: result.reason,
            blockedWordsCount: result.blockedWords.length,
            timestamp: new Date().toISOString(),
        });
    }

    return result;
}

/**
 * Check if username is appropriate
 */
export function moderateUsername(username: string): boolean {
    const lower = username.toLowerCase();

    // Check against blocked words
    for (const word of BLOCKED_WORDS) {
        if (lower.includes(word)) {
            return false;
        }
    }

    // Check for impersonation patterns
    const impersonationPatterns = [
        /admin/i,
        /moderator/i,
        /support/i,
        /official/i,
        /truevibe/i,
    ];

    for (const pattern of impersonationPatterns) {
        if (pattern.test(username)) {
            return false;
        }
    }

    return true;
}

/**
 * Sanitize content (remove potentially dangerous content)
 */
export function sanitizeContent(content: string): string {
    // Remove zero-width characters
    let sanitized = content.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Normalize excessive whitespace
    sanitized = sanitized.replace(/\s{3,}/g, '  ');

    // Normalize excessive newlines
    sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');

    return sanitized.trim();
}
