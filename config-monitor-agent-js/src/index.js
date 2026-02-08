/**
 * Config Monitor Agent - Main Entry Point
 * 
 * Usage:
 *   import { ConfigMonitorAgent } from 'config-monitor-agent';
 *   
 *   const agent = new ConfigMonitorAgent({
 *     serverUrl: 'http://localhost:8080',
 *     applicationName: 'my-service',
 *     environment: 'prod',
 *     collectionIntervalMillis: 60000
 *   });
 *   
 *   agent.start();
 */

import { ConfigCollector } from './collector.js';
import { ConfigSnapshotSender } from './sender.js';

export class ConfigMonitorAgent {
    constructor(options = {}) {
        this.options = {
            serverUrl: options.serverUrl || 'http://localhost:8080',
            applicationName: options.applicationName,
            environment: options.environment || 'default',
            collectionIntervalMillis: options.collectionIntervalMillis || 60000,
            initialDelayMillis: options.initialDelayMillis || 10000,
            enabled: options.enabled !== false,
            secretPatterns: options.secretPatterns || [
                '.*password.*',
                '.*secret.*',
                '.*key.*',
                '.*token.*',
                '.*credential.*',
                '.*api[_-]?key.*',
                '.*auth[_-]?token.*'
            ]
        };

        if (!this.options.applicationName) {
            throw new Error('applicationName is required');
        }

        this.collector = new ConfigCollector(this.options.secretPatterns);
        this.sender = new ConfigSnapshotSender(
            this.collector,
            this.options
        );

        this.intervalId = null;
        this.timeoutId = null;
    }

    /**
     * Start the agent - begins collecting and sending config snapshots.
     */
    start() {
        if (!this.options.enabled) {
            console.log('Config monitor agent is disabled');
            return;
        }

        // Initial delay before first collection
        this.timeoutId = setTimeout(() => {
            this.sendSnapshot();
            
            // Then set up periodic collection
            this.intervalId = setInterval(() => {
                this.sendSnapshot();
            }, this.options.collectionIntervalMillis);
        }, this.options.initialDelayMillis);

        console.log(`Config monitor agent started for ${this.options.applicationName}`);
    }

    /**
     * Stop the agent.
     */
    stop() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('Config monitor agent stopped');
    }

    /**
     * Manually trigger a snapshot collection and send.
     */
    async sendSnapshot() {
        try {
            await this.sender.send();
        } catch (error) {
            console.error('Error sending config snapshot:', error.message);
        }
    }

    /**
     * Get statistics about snapshot sending.
     */
    getStats() {
        return this.sender.getStats();
    }
}

// Export individual components as well
export { ConfigCollector } from './collector.js';
export { ConfigSnapshotSender } from './sender.js';
export { SecretHandler } from './secretHandler.js';
