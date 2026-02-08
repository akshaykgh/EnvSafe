/**
 * Configuration Drift Detection Engine
 * 
 * Detects differences between declared configuration (Git baseline) and
 * actual runtime configuration, applying config rules to identify violations.
 */

/**
 * Drift types
 */
export const DRIFT_TYPES = {
    MISSING: 'MISSING',           // Required config is missing
    OVERRIDDEN: 'OVERRIDDEN',     // Runtime value differs from declared
    UNSAFE: 'UNSAFE'              // Value violates safety rules
};

/**
 * Severity levels
 */
export const SEVERITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
};

/**
 * Change policies
 */
export const CHANGE_POLICY = {
    CI_ONLY: 'CI_ONLY',           // Changes only allowed via CI/CD (Git)
    RUNTIME_ALLOWED: 'RUNTIME_ALLOWED' // Runtime overrides are acceptable
};

/**
 * Drift object structure
 * @typedef {Object} Drift
 * @property {string} type - One of DRIFT_TYPES
 * @property {string} severity - One of SEVERITY
 * @property {string} configKey - Configuration key that has drifted
 * @property {any} expectedValue - Expected value from declared config (or null)
 * @property {any} actualValue - Actual runtime value (or null)
 * @property {string} explanation - Human-readable explanation
 * @property {string} ruleKey - Config rule key that triggered this drift (if applicable)
 */

/**
 * Config rule structure
 * @typedef {Object} ConfigRule
 * @property {string} key - Config key pattern (supports wildcards like "payment.*")
 * @property {boolean} required - Whether this config is required
 * @property {boolean} allowedInProd - Whether allowed in production
 * @property {number|null} minValue - Minimum numeric value (null if not numeric)
 * @property {number|null} maxValue - Maximum numeric value (null if not numeric)
 * @property {string} changePolicy - One of CHANGE_POLICY
 * @property {string} environment - Environment this rule applies to ("prod", "staging", "*" for all)
 */

/**
 * Detect configuration drift
 * 
 * @param {Object} declaredConfig - Baseline config from Git (flat key-value map)
 * @param {Object} runtimeConfig - Actual runtime config (flat key-value map)
 * @param {ConfigRule[]} configRules - Array of configuration rules
 * @param {string} environment - Current environment (e.g., "prod", "staging")
 * @returns {Drift[]} Array of detected drifts
 */
export function detectDrift(declaredConfig, runtimeConfig, configRules = [], environment = 'prod') {
    const drifts = [];
    
    // Filter rules applicable to this environment
    const applicableRules = configRules.filter(rule => 
        rule.environment === '*' || rule.environment === environment
    );
    
    // 1. Detect MISSING required configs
    drifts.push(...detectMissingConfigs(runtimeConfig, applicableRules));
    
    // 2. Detect OVERRIDDEN configs (runtime differs from declared)
    drifts.push(...detectOverriddenConfigs(declaredConfig, runtimeConfig, applicableRules));
    
    // 3. Detect UNSAFE configs (rule violations)
    drifts.push(...detectUnsafeConfigs(runtimeConfig, applicableRules, environment));
    
    return drifts;
}

/**
 * Detect missing required configuration keys
 */
function detectMissingConfigs(runtimeConfig, rules) {
    const drifts = [];
    
    for (const rule of rules) {
        if (!rule.required) continue;
        
        // Check if any runtime config key matches this rule pattern
        const found = Object.keys(runtimeConfig).some(key => 
            matchesPattern(key, rule.key)
        );
        
        if (!found) {
            drifts.push({
                type: DRIFT_TYPES.MISSING,
                severity: SEVERITY.HIGH,
                configKey: rule.key,
                expectedValue: '(required)',
                actualValue: null,
                explanation: `Required configuration key "${rule.key}" is missing from runtime configuration`,
                ruleKey: rule.key
            });
        }
    }
    
    return drifts;
}

/**
 * Detect overridden configuration values
 * Runtime value differs from declared baseline when changePolicy is CI_ONLY
 */
function detectOverriddenConfigs(declaredConfig, runtimeConfig, rules) {
    const drifts = [];
    
    // Check runtime configs that differ from declared
    for (const [key, runtimeValue] of Object.entries(runtimeConfig)) {
        const declaredValue = declaredConfig[key];
        const rule = findMatchingRule(key, rules);
        
        // Skip if no rule or rule allows runtime changes
        if (!rule || rule.changePolicy === CHANGE_POLICY.RUNTIME_ALLOWED) {
            continue;
        }
        
        // Case 1: Key exists in runtime but not in declared (new override)
        if (declaredValue === undefined) {
            if (rule.changePolicy === CHANGE_POLICY.CI_ONLY) {
                drifts.push({
                    type: DRIFT_TYPES.OVERRIDDEN,
                    severity: SEVERITY.MEDIUM,
                    configKey: key,
                    expectedValue: null,
                    actualValue: runtimeValue,
                    explanation: `Runtime override detected: "${key}" is not in declared configuration but is present at runtime`,
                    ruleKey: rule.key
                });
            }
        }
        // Case 2: Value differs from declared
        else if (String(declaredValue) !== String(runtimeValue)) {
            if (rule.changePolicy === CHANGE_POLICY.CI_ONLY) {
                drifts.push({
                    type: DRIFT_TYPES.OVERRIDDEN,
                    severity: SEVERITY.MEDIUM,
                    configKey: key,
                    expectedValue: declaredValue,
                    actualValue: runtimeValue,
                    explanation: `Runtime override detected: "${key}" has value "${runtimeValue}" but declared value is "${declaredValue}"`,
                    ruleKey: rule.key
                });
            }
        }
    }
    
    return drifts;
}

/**
 * Detect unsafe configuration values (rule violations)
 */
function detectUnsafeConfigs(runtimeConfig, rules, environment) {
    const drifts = [];
    
    for (const [key, value] of Object.entries(runtimeConfig)) {
        const rule = findMatchingRule(key, rules);
        if (!rule) continue;
        
        // Check if not allowed in production
        if (environment.toLowerCase() === 'prod' && 
            !rule.allowedInProd && 
            value != null && 
            value !== false && 
            value !== 'false' && 
            value !== '0') {
            drifts.push({
                type: DRIFT_TYPES.UNSAFE,
                severity: SEVERITY.CRITICAL,
                configKey: key,
                expectedValue: '(not allowed in production)',
                actualValue: value,
                explanation: `Configuration "${key}" is not allowed in production environment. Current value: "${value}"`,
                ruleKey: rule.key
            });
        }
        
        // Check numeric constraints
        if (value != null && (rule.minValue !== null || rule.maxValue !== null)) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                if (rule.minValue !== null && numValue < rule.minValue) {
                    drifts.push({
                        type: DRIFT_TYPES.UNSAFE,
                        severity: SEVERITY.HIGH,
                        configKey: key,
                        expectedValue: `min: ${rule.minValue}`,
                        actualValue: value,
                        explanation: `Configuration "${key}" has value ${numValue} which is below the minimum allowed value of ${rule.minValue}`,
                        ruleKey: rule.key
                    });
                }
                
                if (rule.maxValue !== null && numValue > rule.maxValue) {
                    drifts.push({
                        type: DRIFT_TYPES.UNSAFE,
                        severity: SEVERITY.HIGH,
                        configKey: key,
                        expectedValue: `max: ${rule.maxValue}`,
                        actualValue: value,
                        explanation: `Configuration "${key}" has value ${numValue} which exceeds the maximum allowed value of ${rule.maxValue}`,
                        ruleKey: rule.key
                    });
                }
            }
        }
    }
    
    return drifts;
}

/**
 * Find matching rule for a config key
 */
function findMatchingRule(configKey, rules) {
    return rules.find(rule => matchesPattern(configKey, rule.key));
}

/**
 * Check if a config key matches a rule pattern
 * Supports wildcards: "payment.*" matches "payment.timeout", "payment.retry", etc.
 */
function matchesPattern(key, pattern) {
    if (pattern === key) return true;
    
    // Convert pattern to regex
    // Escape dots, convert * to .*
    const regexPattern = '^' + pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*') + '$';
    
    const regex = new RegExp(regexPattern);
    return regex.test(key);
}

/**
 * Helper: Create a config rule
 */
export function createRule(options) {
    return {
        key: options.key,
        required: options.required || false,
        allowedInProd: options.allowedInProd !== false, // Default true
        minValue: options.minValue ?? null,
        maxValue: options.maxValue ?? null,
        changePolicy: options.changePolicy || CHANGE_POLICY.RUNTIME_ALLOWED,
        environment: options.environment || '*'
    };
}

/**
 * Helper: Get default production rules
 */
export function getDefaultProductionRules() {
    return [
        createRule({
            key: 'server.port',
            required: false,
            allowedInProd: true,
            changePolicy: CHANGE_POLICY.RUNTIME_ALLOWED,
            environment: '*'
        }),
        createRule({
            key: 'spring.profiles.active',
            required: true,
            allowedInProd: true,
            changePolicy: CHANGE_POLICY.CI_ONLY,
            environment: '*'
        }),
        createRule({
            key: 'debug',
            required: false,
            allowedInProd: false,
            changePolicy: CHANGE_POLICY.CI_ONLY,
            environment: 'prod'
        }),
        createRule({
            key: 'logging.level.*',
            required: false,
            allowedInProd: true,
            changePolicy: CHANGE_POLICY.RUNTIME_ALLOWED,
            environment: '*'
        }),
        createRule({
            key: 'payment.timeout',
            required: false,
            allowedInProd: true,
            minValue: 1000,
            maxValue: 30000,
            changePolicy: CHANGE_POLICY.CI_ONLY,
            environment: 'prod'
        }),
        createRule({
            key: 'database.*',
            required: true,
            allowedInProd: true,
            changePolicy: CHANGE_POLICY.CI_ONLY,
            environment: '*'
        })
    ];
}
