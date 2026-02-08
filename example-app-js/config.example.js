// Example configuration file (config.js)
// This represents the "baseline" configuration in Git

export default {
    payment: {
        timeout: 10000,  // Production timeout
        retryCount: 3,
        enabled: true
    },
    database: {
        url: 'postgresql://prod-db:5432/payments',
        username: '${DB_USERNAME}', // Placeholder
        password: '${DB_PASSWORD}'   // Placeholder
    },
    debug: false,  // Never enabled in production
    logging: {
        level: 'WARN'
    }
};
