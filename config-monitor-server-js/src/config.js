import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 8080,
    database: {
        type: process.env.DB_TYPE || 'sqlite',
        path: process.env.DB_PATH || './data/configmonitor.db'
    },
    driftCheckInterval: parseInt(process.env.DRIFT_CHECK_INTERVAL_SECONDS || '60'),
    secretPatterns: process.env.SECRET_PATTERNS 
        ? process.env.SECRET_PATTERNS.split(',')
        : [
            '.*password.*',
            '.*secret.*',
            '.*key.*',
            '.*token.*',
            '.*credential.*',
            '.*api[_-]?key.*',
            '.*auth[_-]?token.*'
        ]
};
