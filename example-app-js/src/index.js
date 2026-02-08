import express from 'express';
import { ConfigMonitorAgent } from 'config-monitor-agent';

const app = express();
const PORT = process.env.PORT || 8081;

// Configuration (can come from env vars, config files, etc.)
const config = {
    payment: {
        timeout: parseInt(process.env.PAYMENT_TIMEOUT || '10000'),
        retryCount: parseInt(process.env.PAYMENT_RETRY_COUNT || '3'),
        enabled: process.env.PAYMENT_ENABLED !== 'false'
    },
    database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/payments',
        username: process.env.DATABASE_USERNAME || 'payment_user',
        password: process.env.DATABASE_PASSWORD || 'default_password'
    },
    debug: process.env.DEBUG === 'true',
    logging: {
        level: process.env.LOGGING_LEVEL || 'INFO'
    }
};

// Initialize Config Monitor Agent
const agent = new ConfigMonitorAgent({
    serverUrl: process.env.CONFIG_MONITOR_SERVER_URL || 'http://localhost:8080',
    applicationName: 'payment-service',
    environment: process.env.NODE_ENV || 'prod',
    collectionIntervalMillis: 30000, // 30 seconds
    enabled: true
});

// Start the agent
agent.start();

// Express routes
app.get('/api/payments/config', (req, res) => {
    res.json({
        payment: config.payment,
        database: {
            ...config.database,
            password: '***' // Don't expose password
        },
        debug: config.debug,
        logging: config.logging
    });
});

app.get('/api/payments/health', (req, res) => {
    res.json({ status: 'UP' });
});

app.get('/api/payments/agent-stats', (req, res) => {
    res.json(agent.getStats());
});

// Start server
app.listen(PORT, () => {
    console.log(`Example app running on http://localhost:${PORT}`);
    console.log(`Config monitor agent started for payment-service`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down...');
    agent.stop();
    process.exit(0);
});
