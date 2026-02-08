import express from 'express';
import { getDatabase } from '../database/init.js';
import { sanitizeValue } from '../services/secretHandler.js';
import { detectDrift } from '../services/driftDetection.js';
import { randomUUID } from 'crypto';

export const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { applicationName, environment, config } = req.body;
        
        if (!applicationName || !environment || !config) {
            return res.status(400).json({ 
                error: 'applicationName, environment, and config are required' 
            });
        }
        
        const db = getDatabase();
        
        // Find or create application
        let app = db.prepare('SELECT * FROM applications WHERE name = ? AND environment = ?')
            .get(applicationName, environment);
        
        if (!app) {
            const appId = randomUUID();
            const now = new Date().toISOString();
            db.prepare(`
                INSERT INTO applications (id, name, environment, baseline_config, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(appId, applicationName, environment, null, now, now);
            app = { id: appId, name: applicationName, environment };
        }
        
        // Sanitize config values (hash secrets)
        const sanitizedConfig = {};
        for (const [key, value] of Object.entries(config)) {
            sanitizedConfig[key] = sanitizeValue(key, value);
        }
        
        // Save snapshot
        const snapshotId = randomUUID();
        db.prepare(`
            INSERT INTO config_snapshots (id, application_id, timestamp, config, environment)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            snapshotId,
            app.id,
            new Date().toISOString(),
            JSON.stringify(sanitizedConfig),
            environment
        );
        
        // Detect drift
        detectDrift(app.id, app.baseline_config, sanitizedConfig);
        
        res.json({ status: 'success', message: 'Snapshot received' });
    } catch (error) {
        console.error('Error processing snapshot:', error);
        res.status(500).json({ error: error.message });
    }
});
