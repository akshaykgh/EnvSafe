import crypto from 'crypto';

const HASH_ALGORITHM = 'sha256';
const HASH_PREFIX_LENGTH = 16;

/**
 * Handles secret detection and hashing.
 */
export class SecretHandler {
    constructor(secretPatterns = []) {
        this.secretPatterns = secretPatterns.map(pattern => 
            new RegExp(pattern, 'i')
        );
    }

    /**
     * Check if a config key matches secret patterns.
     */
    isSecret(configKey) {
        if (!configKey) return false;
        
        const lowerKey = configKey.toLowerCase();
        return this.secretPatterns.some(pattern => pattern.test(lowerKey));
    }

    /**
     * Hash a secret value using SHA-256.
     */
    hashSecret(value) {
        if (!value) return null;
        
        const hash = crypto.createHash(HASH_ALGORITHM);
        hash.update(String(value), 'utf8');
        const fullHash = hash.digest('hex');
        return fullHash.substring(0, HASH_PREFIX_LENGTH);
    }

    /**
     * Process a config value - hash if secret, return as-is otherwise.
     */
    processValue(configKey, value) {
        if (value === null || value === undefined) {
            return { safeValue: null, isSecret: false };
        }

        const valueStr = String(value);
        if (this.isSecret(configKey)) {
            const hash = this.hashSecret(valueStr);
            return {
                safeValue: `HASH:${hash}`,
                isSecret: true
            };
        }

        return {
            safeValue: value,
            isSecret: false
        };
    }
}
