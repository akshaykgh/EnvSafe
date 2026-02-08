import crypto from 'crypto';
import { config } from '../config.js';

const HASH_ALGORITHM = 'sha256';
const HASH_PREFIX_LENGTH = 16;

/**
 * Check if a config key matches secret patterns.
 */
export function isSecret(configKey) {
    if (!configKey) return false;
    
    const lowerKey = configKey.toLowerCase();
    return config.secretPatterns.some(pattern => {
        const regex = new RegExp(pattern, 'i');
        return regex.test(lowerKey);
    });
}

/**
 * Hash a secret value using SHA-256.
 * Returns first 16 characters for readability.
 */
export function hashSecret(value) {
    if (!value) return null;
    
    const hash = crypto.createHash(HASH_ALGORITHM);
    hash.update(String(value), 'utf8');
    const fullHash = hash.digest('hex');
    return fullHash.substring(0, HASH_PREFIX_LENGTH);
}

/**
 * Sanitize config value - hash secrets, keep others as-is.
 */
export function sanitizeValue(configKey, value) {
    if (value === null || value === undefined) {
        return null;
    }
    
    const valueStr = String(value);
    if (isSecret(configKey)) {
        return `HASH:${hashSecret(valueStr)}`;
    }
    return value;
}
