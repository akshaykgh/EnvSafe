import { SecretHandler } from './secretHandler.js';

/**
 * Collects effective configuration from process environment.
 * Differentiates between different sources (env vars, config files, etc.).
 */
export class ConfigCollector {
    constructor(secretPatterns = []) {
        this.secretHandler = new SecretHandler(secretPatterns);
    }

    /**
     * Collect all effective configuration from process environment.
     * Returns a map of config entries with source information.
     */
    collectRuntimeConfig() {
        const config = {};
        
        // Collect from process.env (environment variables)
        for (const [key, value] of Object.entries(process.env)) {
            // Skip Node.js internal variables
            if (key.startsWith('NODE_') && key !== 'NODE_ENV') {
                continue;
            }
            
            // Skip npm internal variables
            if (key.startsWith('npm_')) {
                continue;
            }
            
            // Process value (hash secrets)
            const processed = this.secretHandler.processValue(key, value);
            
            config[key] = {
                key,
                value: value, // Original value (for local use)
                safeValue: processed.safeValue, // Safe value for transmission
                source: 'ENVIRONMENT_VARIABLE',
                isSecret: processed.isSecret
            };
        }
        
        // If using a config library (like node-config, dotenv, etc.),
        // you can extend this to collect from those sources as well
        
        return config;
    }

    /**
     * Collect configuration from a custom source (e.g., config file).
     * Useful for integrating with config libraries.
     */
    collectFromSource(configObject, sourceName = 'CONFIG_FILE') {
        const entries = {};
        
        for (const [key, value] of Object.entries(configObject)) {
            const processed = this.secretHandler.processValue(key, value);
            
            entries[key] = {
                key,
                value,
                safeValue: processed.safeValue,
                source: sourceName,
                isSecret: processed.isSecret
            };
        }
        
        return entries;
    }

    /**
     * Merge multiple config sources with precedence.
     * Later sources override earlier ones.
     */
    mergeConfigSources(...sources) {
        const merged = {};
        
        for (const source of sources) {
            Object.assign(merged, source);
        }
        
        return merged;
    }

    /**
     * Convert config entries to a simple map for API transmission.
     * Secrets are replaced with their hash.
     */
    toSimpleMap(configEntries) {
        const result = {};
        for (const entry of Object.values(configEntries)) {
            result[entry.key] = entry.safeValue;
        }
        return result;
    }

    /**
     * Get source statistics from config entries.
     */
    getSourceStats(configEntries) {
        const stats = {};
        for (const entry of Object.values(configEntries)) {
            stats[entry.source] = (stats[entry.source] || 0) + 1;
        }
        return stats;
    }
}
