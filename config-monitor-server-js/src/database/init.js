import Database from 'better-sqlite3';
import { config } from '../config.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db = null;

export function getDatabase() {
    if (!db) {
        const dbPath = config.database.path;
        const dbDir = dirname(dbPath);
        
        // Create directory if it doesn't exist
        try {
            mkdirSync(dbDir, { recursive: true });
        } catch (err) {
            // Directory might already exist
        }
        
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
    }
    return db;
}

export async function initializeDatabase() {
    const db = getDatabase();
    
    // Create tables
    db.exec(`
        CREATE TABLE IF NOT EXISTS applications (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            environment TEXT NOT NULL,
            baseline_config TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS config_snapshots (
            id TEXT PRIMARY KEY,
            application_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            config TEXT NOT NULL,
            environment TEXT NOT NULL,
            FOREIGN KEY (application_id) REFERENCES applications(id)
        );

        CREATE TABLE IF NOT EXISTS config_drifts (
            id TEXT PRIMARY KEY,
            application_id TEXT NOT NULL,
            config_key TEXT NOT NULL,
            expected_value TEXT,
            actual_value TEXT,
            drift_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            first_detected_at TEXT NOT NULL,
            status TEXT NOT NULL,
            acknowledged_at TEXT,
            resolved_at TEXT,
            description TEXT,
            FOREIGN KEY (application_id) REFERENCES applications(id)
        );

        CREATE TABLE IF NOT EXISTS config_rules (
            id TEXT PRIMARY KEY,
            config_key TEXT NOT NULL,
            required INTEGER NOT NULL DEFAULT 0,
            allowed_in_prod INTEGER NOT NULL DEFAULT 1,
            min_value REAL,
            max_value REAL,
            change_policy TEXT NOT NULL DEFAULT 'RUNTIME_ALLOWED',
            environment TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_snapshots_app ON config_snapshots(application_id);
        CREATE INDEX IF NOT EXISTS idx_drifts_app ON config_drifts(application_id);
        CREATE INDEX IF NOT EXISTS idx_drifts_status ON config_drifts(status);
        CREATE INDEX IF NOT EXISTS idx_rules_env ON config_rules(environment);
    `);

    // Initialize default rules
    const ruleCount = db.prepare('SELECT COUNT(*) as count FROM config_rules').get();
    if (ruleCount.count === 0) {
        const insertRule = db.prepare(`
            INSERT INTO config_rules (id, config_key, required, allowed_in_prod, min_value, max_value, change_policy, environment)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const defaultRules = [
            ['rule-1', 'server.port', 0, 1, null, null, 'RUNTIME_ALLOWED', '*'],
            ['rule-2', 'spring.profiles.active', 1, 1, null, null, 'CI_ONLY', '*'],
            ['rule-3', 'debug', 0, 0, null, null, 'CI_ONLY', 'prod'],
            ['rule-4', 'logging.level.*', 0, 1, null, null, 'RUNTIME_ALLOWED', '*'],
            ['rule-5', 'payment.timeout', 0, 1, 1000, 30000, 'CI_ONLY', 'prod'],
            ['rule-6', 'database.*', 1, 1, null, null, 'CI_ONLY', '*']
        ];

        const insertMany = db.transaction((rules) => {
            for (const rule of rules) {
                insertRule.run(...rule);
            }
        });

        insertMany(defaultRules);
        console.log('Default rules initialized');
    }

    return db;
}
