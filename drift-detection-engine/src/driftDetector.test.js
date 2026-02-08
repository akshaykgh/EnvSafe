import { describe, it, expect, getResults } from './testFramework.js';
import { 
    detectDrift, 
    DRIFT_TYPES, 
    SEVERITY, 
    CHANGE_POLICY,
    createRule,
    getDefaultProductionRules
} from './driftDetector.js';

// Test scenarios
describe('Drift Detection Engine - Missing Config Tests', () => {
    it('should detect missing required configuration', () => {
        const declaredConfig = {
            'database.url': 'jdbc:postgresql://localhost:5432/db',
            'database.username': 'user'
        };
        
        const runtimeConfig = {
            'database.url': 'jdbc:postgresql://localhost:5432/db'
            // Missing database.username
        };
        
        const rules = [
            createRule({
                key: 'database.username',
                required: true,
                environment: '*'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        expect(drifts).toHaveLength(1);
        expect(drifts[0].type).toBe(DRIFT_TYPES.MISSING);
        expect(drifts[0].severity).toBe(SEVERITY.HIGH);
        expect(drifts[0].configKey).toBe('database.username');
    });

    it('should detect missing required config with wildcard pattern', () => {
        const declaredConfig = {};
        const runtimeConfig = {};
        
        const rules = [
            createRule({
                key: 'database.*',
                required: true,
                environment: '*'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        expect(drifts).toHaveLength(1);
        expect(drifts[0].type).toBe(DRIFT_TYPES.MISSING);
        expect(drifts[0].configKey).toBe('database.*');
    });

    it('should not flag non-required missing configs', () => {
        const declaredConfig = {};
        const runtimeConfig = {};
        
        const rules = [
            createRule({
                key: 'optional.config',
                required: false,
                environment: '*'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        expect(drifts).toHaveLength(0);
    });
});

describe('Drift Detection Engine - Overridden Config Tests', () => {
    it('should detect runtime override when changePolicy is CI_ONLY', () => {
        const declaredConfig = {
            'payment.timeout': 10000
        };
        
        const runtimeConfig = {
            'payment.timeout': 50000  // Overridden via env var
        };
        
        const rules = [
            createRule({
                key: 'payment.timeout',
                changePolicy: CHANGE_POLICY.CI_ONLY,
                environment: '*'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        expect(drifts).toHaveLength(1);
        expect(drifts[0].type).toBe(DRIFT_TYPES.OVERRIDDEN);
        expect(drifts[0].severity).toBe(SEVERITY.MEDIUM);
        expect(drifts[0].expectedValue).toBe(10000);
        expect(drifts[0].actualValue).toBe(50000);
    });

    it('should not detect override when changePolicy is RUNTIME_ALLOWED', () => {
        const declaredConfig = {
            'server.port': 8080
        };
        
        const runtimeConfig = {
            'server.port': 9090  // Overridden but allowed
        };
        
        const rules = [
            createRule({
                key: 'server.port',
                changePolicy: CHANGE_POLICY.RUNTIME_ALLOWED,
                environment: '*'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        // Should only check for other violations, not overrides
        const overrideDrifts = drifts.filter(d => d.type === DRIFT_TYPES.OVERRIDDEN);
        expect(overrideDrifts).toHaveLength(0);
    });

    it('should detect new runtime config not in declared baseline', () => {
        const declaredConfig = {
            'payment.timeout': 10000
        };
        
        const runtimeConfig = {
            'payment.timeout': 10000,
            'payment.retryCount': 5  // New config not in baseline
        };
        
        const rules = [
            createRule({
                key: 'payment.*',
                changePolicy: CHANGE_POLICY.CI_ONLY,
                environment: '*'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        const overrideDrifts = drifts.filter(d => 
            d.type === DRIFT_TYPES.OVERRIDDEN && d.configKey === 'payment.retryCount'
        );
        expect(overrideDrifts).toHaveLength(1);
    });

    it('should handle string vs number comparison correctly', () => {
        const declaredConfig = {
            'payment.timeout': '10000'  // String in declared
        };
        
        const runtimeConfig = {
            'payment.timeout': 10000  // Number at runtime
        };
        
        const rules = [
            createRule({
                key: 'payment.timeout',
                changePolicy: CHANGE_POLICY.CI_ONLY,
                environment: '*'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        // Should not detect drift (values are equivalent)
        const overrideDrifts = drifts.filter(d => d.type === DRIFT_TYPES.OVERRIDDEN);
        expect(overrideDrifts).toHaveLength(0);
    });
});

describe('Drift Detection Engine - Unsafe Config Tests', () => {
    it('should detect debug=true in production', () => {
        const declaredConfig = {
            'debug': false
        };
        
        const runtimeConfig = {
            'debug': true  // Not allowed in prod
        };
        
        const rules = [
            createRule({
                key: 'debug',
                allowedInProd: false,
                changePolicy: CHANGE_POLICY.CI_ONLY,
                environment: 'prod'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        const unsafeDrifts = drifts.filter(d => d.type === DRIFT_TYPES.UNSAFE);
        expect(unsafeDrifts).toHaveLength(1);
        expect(unsafeDrifts[0].severity).toBe(SEVERITY.CRITICAL);
        expect(unsafeDrifts[0].configKey).toBe('debug');
    });

    it('should detect value below minimum', () => {
        const declaredConfig = {
            'payment.timeout': 10000
        };
        
        const runtimeConfig = {
            'payment.timeout': 500  // Below minimum of 1000
        };
        
        const rules = [
            createRule({
                key: 'payment.timeout',
                minValue: 1000,
                maxValue: 30000,
                environment: 'prod'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        const unsafeDrifts = drifts.filter(d => 
            d.type === DRIFT_TYPES.UNSAFE && 
            d.explanation.includes('below the minimum')
        );
        expect(unsafeDrifts).toHaveLength(1);
        expect(unsafeDrifts[0].severity).toBe(SEVERITY.HIGH);
    });

    it('should detect value above maximum', () => {
        const declaredConfig = {
            'payment.timeout': 10000
        };
        
        const runtimeConfig = {
            'payment.timeout': 60000  // Above maximum of 30000
        };
        
        const rules = [
            createRule({
                key: 'payment.timeout',
                minValue: 1000,
                maxValue: 30000,
                environment: 'prod'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        const unsafeDrifts = drifts.filter(d => 
            d.type === DRIFT_TYPES.UNSAFE && 
            d.explanation.includes('exceeds the maximum')
        );
        expect(unsafeDrifts).toHaveLength(1);
        expect(unsafeDrifts[0].severity).toBe(SEVERITY.HIGH);
    });

    it('should allow debug in non-production environments', () => {
        const declaredConfig = {
            'debug': false
        };
        
        const runtimeConfig = {
            'debug': true
        };
        
        const rules = [
            createRule({
                key: 'debug',
                allowedInProd: false,
                environment: 'prod'  // Rule only applies to prod
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'staging');
        
        const unsafeDrifts = drifts.filter(d => d.type === DRIFT_TYPES.UNSAFE);
        expect(unsafeDrifts).toHaveLength(0);
    });
});

describe('Drift Detection Engine - Production Scenarios', () => {
    it('should detect multiple drifts in production incident scenario', () => {
        // Scenario: Production incident - engineer sets emergency overrides
        const declaredConfig = {
            'payment.timeout': 10000,
            'payment.retryCount': 3,
            'debug': false,
            'database.url': 'jdbc:postgresql://prod-db:5432/payments'
        };
        
        const runtimeConfig = {
            'payment.timeout': 120000,  // Emergency override (also exceeds max)
            'payment.retryCount': 3,
            'debug': true,  // Accidentally enabled
            'database.url': 'jdbc:postgresql://prod-db:5432/payments',
            'logging.level.root': 'DEBUG'  // New override
        };
        
        const rules = getDefaultProductionRules();
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        // Should detect:
        // 1. payment.timeout override (OVERRIDDEN)
        // 2. payment.timeout exceeds max (UNSAFE)
        // 3. debug=true in prod (UNSAFE, CRITICAL)
        // 4. logging.level.root override (if rule says CI_ONLY)
        
        expect(drifts.length).toBeGreaterThan(0);
        
        const criticalDrifts = drifts.filter(d => d.severity === SEVERITY.CRITICAL);
        expect(criticalDrifts.length).toBeGreaterThan(0);
        
        const debugDrift = drifts.find(d => d.configKey === 'debug' && d.type === DRIFT_TYPES.UNSAFE);
        expect(debugDrift).toBeDefined();
        expect(debugDrift.severity).toBe(SEVERITY.CRITICAL);
    });

    it('should detect missing database configuration', () => {
        const declaredConfig = {
            'database.url': 'jdbc:postgresql://localhost:5432/db',
            'database.username': 'user',
            'database.password': 'secret'
        };
        
        const runtimeConfig = {
            'database.url': 'jdbc:postgresql://localhost:5432/db'
            // Missing username and password
        };
        
        // Use specific rules for each required database config
        const rules = [
            createRule({
                key: 'database.username',
                required: true,
                environment: '*'
            }),
            createRule({
                key: 'database.password',
                required: true,
                environment: '*'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        // Should detect missing database.username and database.password
        expect(drifts.length).toBeGreaterThanOrEqual(2);
        
        const missingDrifts = drifts.filter(d => d.type === DRIFT_TYPES.MISSING);
        expect(missingDrifts.length).toBeGreaterThanOrEqual(2);
        
        // Verify specific missing configs
        const missingKeys = missingDrifts.map(d => d.configKey);
        expect(missingKeys).toContain('database.username');
        expect(missingKeys).toContain('database.password');
    });

    it('should handle empty declared config (new service)', () => {
        const declaredConfig = {};  // New service, no baseline yet
        
        const runtimeConfig = {
            'server.port': 8080,
            'payment.timeout': 50000  // High value
        };
        
        const rules = [
            createRule({
                key: 'payment.timeout',
                minValue: 1000,
                maxValue: 30000,
                changePolicy: CHANGE_POLICY.CI_ONLY,
                environment: 'prod'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        // Should detect:
        // 1. payment.timeout override (new config not in baseline)
        // 2. payment.timeout exceeds max
        
        expect(drifts.length).toBeGreaterThan(0);
    });

    it('should respect environment-specific rules', () => {
        const declaredConfig = {
            'debug': false
        };
        
        const runtimeConfig = {
            'debug': true
        };
        
        const rules = [
            createRule({
                key: 'debug',
                allowedInProd: false,
                environment: 'prod'  // Only applies to prod
            }),
            createRule({
                key: 'debug',
                allowedInProd: true,
                environment: 'staging'  // Allowed in staging
            })
        ];
        
        // Test in staging - should not detect unsafe
        const stagingDrifts = detectDrift(declaredConfig, runtimeConfig, rules, 'staging');
        const stagingUnsafe = stagingDrifts.filter(d => d.type === DRIFT_TYPES.UNSAFE);
        expect(stagingUnsafe).toHaveLength(0);
        
        // Test in prod - should detect unsafe
        const prodDrifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        const prodUnsafe = prodDrifts.filter(d => d.type === DRIFT_TYPES.UNSAFE);
        expect(prodUnsafe).toHaveLength(1);
    });
});

describe('Drift Detection Engine - Edge Cases', () => {
    it('should handle null and undefined values', () => {
        const declaredConfig = {
            'config.key': 'value'
        };
        
        const runtimeConfig = {
            'config.key': null
        };
        
        const rules = [
            createRule({
                key: 'config.key',
                changePolicy: CHANGE_POLICY.CI_ONLY,
                environment: '*'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        // Should detect override (null differs from 'value')
        expect(drifts.length).toBeGreaterThan(0);
    });

    it('should handle wildcard pattern matching', () => {
        const declaredConfig = {};
        const runtimeConfig = {
            'payment.timeout': 50000,
            'payment.retryCount': 5,
            'payment.enabled': true
        };
        
        const rules = [
            createRule({
                key: 'payment.*',
                changePolicy: CHANGE_POLICY.CI_ONLY,
                environment: '*'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        // Should detect all payment.* configs as overrides
        expect(drifts.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle no rules provided', () => {
        const declaredConfig = {
            'some.config': 'value'
        };
        
        const runtimeConfig = {
            'some.config': 'different'
        };
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, [], 'prod');
        
        // Should return empty array (no rules to check)
        expect(drifts).toHaveLength(0);
    });

    it('should handle empty configs', () => {
        const declaredConfig = {};
        const runtimeConfig = {};
        
        const rules = [
            createRule({
                key: 'required.config',
                required: true,
                environment: '*'
            })
        ];
        
        const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');
        
        // Should detect missing required config
        expect(drifts).toHaveLength(1);
        expect(drifts[0].type).toBe(DRIFT_TYPES.MISSING);
    });
});

// Run tests
const results = getResults();
console.log(`\n\n=== Test Results ===`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);

if (results.failures.length > 0) {
    console.log(`\nFailures:`);
    results.failures.forEach(f => {
        console.log(`  - ${f.name}: ${f.error}`);
    });
}

process.exit(results.failed > 0 ? 1 : 0);
