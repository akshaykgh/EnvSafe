import { getDatabase } from '../database/init.js';
import { randomUUID } from 'crypto';

const DRIFT_TYPES = {
    MISSING: 'MISSING',
    OVERRIDE: 'OVERRIDE',
    RULE_VIOLATION: 'RULE_VIOLATION'
};

const SEVERITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
};

const DRIFT_STATUS = {
    ACTIVE: 'ACTIVE',
    ACKNOWLEDGED: 'ACKNOWLEDGED',
    RESOLVED: 'RESOLVED'
};

/**
 * Detect drift between baseline and runtime configuration.
 */
export function detectDrift(applicationId, baselineConfig, runtimeConfig) {
    const db = getDatabase();
    const drifts = [];
    
    // Parse baseline config
    const baseline = baselineConfig ? JSON.parse(baselineConfig) : {};
    
    // Get rules for this environment
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
    const rules = db.prepare(`
        SELECT * FROM config_rules 
        WHERE environment = ? OR environment = '*'
    `).all(app.environment);
    
    // Check for missing required configs
    drifts.push(...detectMissingRequired(runtimeConfig, rules, applicationId));
    
    // Check for runtime overrides
    drifts.push(...detectRuntimeOverrides(baseline, runtimeConfig, rules, applicationId));
    
    // Check for rule violations
    drifts.push(...detectRuleViolations(runtimeConfig, rules, applicationId, app.environment));
    
    // Save new drifts
    const insertDrift = db.prepare(`
        INSERT INTO config_drifts (
            id, application_id, config_key, expected_value, actual_value,
            drift_type, severity, first_detected_at, status, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const checkExisting = db.prepare(`
        SELECT id FROM config_drifts 
        WHERE application_id = ? AND config_key = ? AND status = 'ACTIVE'
    `);
    
    for (const drift of drifts) {
        const existing = checkExisting.get(drift.applicationId, drift.configKey);
        if (!existing) {
            insertDrift.run(
                drift.id,
                drift.applicationId,
                drift.configKey,
                drift.expectedValue,
                drift.actualValue,
                drift.driftType,
                drift.severity,
                drift.firstDetectedAt,
                drift.status,
                drift.description
            );
        }
    }
    
    return drifts;
}

function detectMissingRequired(runtimeConfig, rules, applicationId) {
    const drifts = [];
    
    for (const rule of rules) {
        if (!rule.required) continue;
        
        const found = Object.keys(runtimeConfig).some(key => 
            matchesPattern(key, rule.config_key)
        );
        
        if (!found) {
            drifts.push({
                id: randomUUID(),
                applicationId,
                configKey: rule.config_key,
                expectedValue: '(required)',
                actualValue: null,
                driftType: DRIFT_TYPES.MISSING,
                severity: SEVERITY.HIGH,
                firstDetectedAt: new Date().toISOString(),
                status: DRIFT_STATUS.ACTIVE,
                description: `Required configuration key is missing: ${rule.config_key}`
            });
        }
    }
    
    return drifts;
}

function detectRuntimeOverrides(baselineConfig, runtimeConfig, rules, applicationId) {
    const drifts = [];
    
    for (const [key, runtimeValue] of Object.entries(runtimeConfig)) {
        const baselineValue = baselineConfig[key];
        
        if (baselineValue === undefined) {
            // New runtime config not in baseline
            const rule = findMatchingRule(key, rules);
            if (rule && rule.change_policy === 'CI_ONLY') {
                drifts.push({
                    id: randomUUID(),
                    applicationId,
                    configKey: key,
                    expectedValue: null,
                    actualValue: String(runtimeValue),
                    driftType: DRIFT_TYPES.OVERRIDE,
                    severity: SEVERITY.MEDIUM,
                    firstDetectedAt: new Date().toISOString(),
                    status: DRIFT_STATUS.ACTIVE,
                    description: `Runtime override detected for key not in baseline: ${key}`
                });
            }
        } else if (String(baselineValue) !== String(runtimeValue)) {
            // Value differs from baseline
            const rule = findMatchingRule(key, rules);
            if (rule && rule.change_policy === 'CI_ONLY') {
                drifts.push({
                    id: randomUUID(),
                    applicationId,
                    configKey: key,
                    expectedValue: String(baselineValue),
                    actualValue: String(runtimeValue),
                    driftType: DRIFT_TYPES.OVERRIDE,
                    severity: SEVERITY.MEDIUM,
                    firstDetectedAt: new Date().toISOString(),
                    status: DRIFT_STATUS.ACTIVE,
                    description: `Runtime value differs from baseline for: ${key}`
                });
            }
        }
    }
    
    return drifts;
}

function detectRuleViolations(runtimeConfig, rules, applicationId, environment) {
    const drifts = [];
    
    for (const [key, value] of Object.entries(runtimeConfig)) {
        const rule = findMatchingRule(key, rules);
        if (!rule) continue;
        
        // Check allowedInProd
        if (environment.toLowerCase() === 'prod' && 
            !rule.allowed_in_prod && value != null) {
            drifts.push({
                id: randomUUID(),
                applicationId,
                configKey: key,
                expectedValue: '(not allowed in prod)',
                actualValue: String(value),
                driftType: DRIFT_TYPES.RULE_VIOLATION,
                severity: SEVERITY.CRITICAL,
                firstDetectedAt: new Date().toISOString(),
                status: DRIFT_STATUS.ACTIVE,
                description: `Configuration not allowed in production: ${key}`
            });
        }
        
        // Check min/max values
        if (value != null && (rule.min_value !== null || rule.max_value !== null)) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                if (rule.min_value !== null && numValue < rule.min_value) {
                    drifts.push({
                        id: randomUUID(),
                        applicationId,
                        configKey: key,
                        expectedValue: `min: ${rule.min_value}`,
                        actualValue: String(value),
                        driftType: DRIFT_TYPES.RULE_VIOLATION,
                        severity: SEVERITY.HIGH,
                        firstDetectedAt: new Date().toISOString(),
                        status: DRIFT_STATUS.ACTIVE,
                        description: `Value ${numValue} is below minimum ${rule.min_value}`
                    });
                }
                if (rule.max_value !== null && numValue > rule.max_value) {
                    drifts.push({
                        id: randomUUID(),
                        applicationId,
                        configKey: key,
                        expectedValue: `max: ${rule.max_value}`,
                        actualValue: String(value),
                        driftType: DRIFT_TYPES.RULE_VIOLATION,
                        severity: SEVERITY.HIGH,
                        firstDetectedAt: new Date().toISOString(),
                        status: DRIFT_STATUS.ACTIVE,
                        description: `Value ${numValue} exceeds maximum ${rule.max_value}`
                    });
                }
            }
        }
    }
    
    return drifts;
}

function findMatchingRule(configKey, rules) {
    return rules.find(rule => matchesPattern(configKey, rule.config_key));
}

function matchesPattern(key, pattern) {
    if (pattern === key) return true;
    // Simple wildcard matching: convert pattern to regex
    const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    return regex.test(key);
}
