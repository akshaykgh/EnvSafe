import express from 'express';
import { getDatabase } from '../database/init.js';

export const router = express.Router();

router.get('/', (req, res) => {
    try {
        const { applicationName } = req.query;
        const db = getDatabase();
        
        let query = 'SELECT d.* FROM config_drifts d';
        const params = [];
        
        if (applicationName) {
            query += ' JOIN applications a ON d.application_id = a.id WHERE a.name = ? AND d.status = ?';
            params.push(applicationName, 'ACTIVE');
        } else {
            query += ' WHERE d.status = ?';
            params.push('ACTIVE');
        }
        
        const activeDrifts = db.prepare(query).all(...params);
        
        if (activeDrifts.length > 0) {
            return res.status(200).json({
                status: 'fail',
                message: 'Unresolved configuration drifts detected',
                driftCount: activeDrifts.length,
                drifts: activeDrifts.map(d => ({
                    key: d.config_key,
                    type: d.drift_type,
                    severity: d.severity
                }))
            });
        }
        
        res.json({
            status: 'pass',
            message: 'No unresolved configuration drifts'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
