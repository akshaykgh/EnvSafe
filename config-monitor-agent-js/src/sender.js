import axios from 'axios';

/**
 * Sends configuration snapshots to the Config Monitor Server.
 */
export class ConfigSnapshotSender {
    constructor(collector, options) {
        this.collector = collector;
        this.options = options;
        this.stats = {
            successCount: 0,
            failureCount: 0,
            lastSuccessTime: null,
            lastFailureTime: null
        };
    }

    /**
     * Send a configuration snapshot to the server.
     */
    async send() {
        if (!this.options.enabled) {
            return;
        }

        try {
            // Collect configuration
            const configEntries = this.collector.collectRuntimeConfig();
            
            if (Object.keys(configEntries).length === 0) {
                console.debug('No configuration collected, skipping snapshot');
                return;
            }

            // Convert to simple map for transmission
            const configMap = this.collector.toSimpleMap(configEntries);
            
            // Get source statistics
            const sourceStats = this.collector.getSourceStats(configEntries);

            // Build request payload
            const payload = {
                applicationName: this.options.applicationName,
                environment: this.options.environment,
                config: configMap,
                sourceStats
            };

            // Send with retry logic
            await this.sendWithRetry(payload);
            
            this.stats.successCount++;
            this.stats.lastSuccessTime = new Date().toISOString();
            console.debug('Config snapshot sent successfully');
        } catch (error) {
            this.stats.failureCount++;
            this.stats.lastFailureTime = new Date().toISOString();
            console.warn(`Failed to send config snapshot: ${error.message}`);
            // Don't throw - failures are non-blocking
        }
    }

    /**
     * Send snapshot with retry logic using exponential backoff.
     */
    async sendWithRetry(payload, retries = 3) {
        let lastError;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await axios.post(
                    `${this.options.serverUrl}/api/v1/config-snapshots`,
                    payload,
                    {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 10000 // 10 second timeout
                    }
                );
                return response.data;
            } catch (error) {
                lastError = error;
                
                if (attempt < retries) {
                    // Exponential backoff: 1s, 2s, 4s
                    const delay = Math.pow(2, attempt) * 1000;
                    console.debug(`Retrying config snapshot send (attempt ${attempt + 1}/${retries + 1}) after ${delay}ms`);
                    await this.sleep(delay);
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Sleep utility for retry delays.
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get statistics about snapshot sending.
     */
    getStats() {
        return { ...this.stats };
    }
}
