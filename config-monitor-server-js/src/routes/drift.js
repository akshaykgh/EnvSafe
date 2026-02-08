import express from 'express';
import { getDatabase } from '../database/init.js';

export const router = express.Router();

router.get('/', (req, res) => {
    try {
        const { applicationName, status } = req.query;
        const db = getDatabase();
        
        let query = 'SELECT d.*, a.name as application_name FROM config_drifts d JOIN applications a ON d.application_id = a.id WHERE 1=1';
        const params = [];
        
        if (applicationName) {
            query += ' AND a.name = ?';
            params.push(applicationName);
        }
        
        if (status) {
            query += ' AND d.status = ?';
            params.push(status.toUpperCase());
        }
        
        query += ' ORDER BY d.first_detected_at DESC';
        
        const drifts = db.prepare(query).all(...params);
        
        const response = drifts.map(drift => ({
            id: drift.id,
            applicationName: drift.application_name,
            configKey: drift.config_key,
            expectedValue: drift.expected_value,
            actualValue: drift.actual_value,
            driftType: drift.drift_type,
            severity: drift.severity,
            firstDetectedAt: drift.first_detected_at,
            status: drift.status,
            acknowledgedAt: drift.acknowledged_at,
            resolvedAt: drift.resolved_at,
            description: drift.description
        }));
        
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get configuration comparison for an application
router.get('/config-comparison/:applicationName', (req, res) => {
    try {
        const { applicationName } = req.params;
        const db = getDatabase();
        
        // Get application
        const app = db.prepare('SELECT * FROM applications WHERE name = ?').get(applicationName);
        if (!app) {
            return res.status(404).json({ error: 'Application not found' });
        }
        
        // Get latest snapshot
        const latestSnapshot = db.prepare(`
            SELECT * FROM config_snapshots 
            WHERE application_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 1
        `).get(app.id);
        
        // Parse configs
        const baselineConfig = app.baseline_config ? JSON.parse(app.baseline_config) : {};
        const runtimeConfig = latestSnapshot ? JSON.parse(latestSnapshot.config) : {};
        
        res.json({
            applicationName: app.name,
            environment: app.environment,
            baselineConfig,
            runtimeConfig,
            snapshotTimestamp: latestSnapshot?.timestamp || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/acknowledge', (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();
        
        db.prepare(`
            UPDATE config_drifts 
            SET status = 'ACKNOWLEDGED', acknowledged_at = ?
            WHERE id = ?
        `).run(new Date().toISOString(), id);
        
        const drift = db.prepare('SELECT * FROM config_drifts WHERE id = ?').get(id);
        if (!drift) {
            return res.status(404).json({ error: 'Drift not found' });
        }
        
        res.json({ status: 'success', message: 'Drift acknowledged' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/resolve', (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();
        
        db.prepare(`
            UPDATE config_drifts 
            SET status = 'RESOLVED', resolved_at = ?
            WHERE id = ?
        `).run(new Date().toISOString(), id);
        
        const drift = db.prepare('SELECT * FROM config_drifts WHERE id = ?').get(id);
        if (!drift) {
            return res.status(404).json({ error: 'Drift not found' });
        }
        
        res.json({ status: 'success', message: 'Drift resolved' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
