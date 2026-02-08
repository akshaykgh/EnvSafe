import express from 'express';
import { getDatabase } from '../database/init.js';
import { parseYaml } from '../services/yamlParser.js';
import { randomUUID } from 'crypto';

export const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { applicationName, environment, yamlContent } = req.body;
        
        if (!applicationName || !environment || !yamlContent) {
            return res.status(400).json({ 
                error: 'applicationName, environment, and yamlContent are required' 
            });
        }
        
        const db = getDatabase();
        
        // Parse YAML
        const parsedConfig = parseYaml(yamlContent);
        const configJson = JSON.stringify(parsedConfig);
        
        // Find or create application
        let app = db.prepare('SELECT * FROM applications WHERE name = ? AND environment = ?')
            .get(applicationName, environment);
        
        if (!app) {
            const appId = randomUUID();
            const now = new Date().toISOString();
            db.prepare(`
                INSERT INTO applications (id, name, environment, baseline_config, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(appId, applicationName, environment, configJson, now, now);
            app = { id: appId, name: applicationName, environment };
        } else {
            // Update baseline
            db.prepare(`
                UPDATE applications 
                SET baseline_config = ?, updated_at = ?
                WHERE id = ?
            `).run(configJson, new Date().toISOString(), app.id);
        }
        
        res.json({
            status: 'success',
            message: 'Baseline registered',
            configKeys: Object.keys(parsedConfig).length
        });
    } catch (error) {
        res.status(400).json({ error: `Failed to parse YAML: ${error.message}` });
    }
});
