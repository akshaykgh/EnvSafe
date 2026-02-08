# Configuration Drift Detection Engine

A production-ready drift detection engine that identifies differences between declared configuration (Git baseline) and actual runtime configuration.

## Features

✅ **Three Drift Types**:
- `MISSING`: Required configuration is absent
- `OVERRIDDEN`: Runtime value differs from declared (when `changePolicy=CI_ONLY`)
- `UNSAFE`: Value violates safety rules (not allowed in prod, out of range, etc.)

✅ **Rule-Based Detection**:
- Required configs
- Production safety rules (`allowedInProd`)
- Numeric constraints (`minValue`, `maxValue`)
- Change policies (`CI_ONLY` vs `RUNTIME_ALLOWED`)
- Environment-specific rules

✅ **Comprehensive Unit Tests**:
- Missing config scenarios
- Override detection
- Safety violations
- Production incident scenarios
- Edge cases

## Usage

```javascript
import { detectDrift, createRule, CHANGE_POLICY, SEVERITY } from './driftDetector.js';

// Declared config (from Git)
const declaredConfig = {
    'payment.timeout': 10000,
    'debug': false
};

// Runtime config (actual values)
const runtimeConfig = {
    'payment.timeout': 50000,  // Overridden
    'debug': true  // Not allowed in prod
};

// Config rules
const rules = [
    createRule({
        key: 'payment.timeout',
        minValue: 1000,
        maxValue: 30000,
        changePolicy: CHANGE_POLICY.CI_ONLY,
        environment: 'prod'
    }),
    createRule({
        key: 'debug',
        allowedInProd: false,
        changePolicy: CHANGE_POLICY.CI_ONLY,
        environment: 'prod'
    })
];

// Detect drift
const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');

// Results
drifts.forEach(drift => {
    console.log(`${drift.type}: ${drift.configKey}`);
    console.log(`  Severity: ${drift.severity}`);
    console.log(`  ${drift.explanation}`);
});
```

## API

### `detectDrift(declaredConfig, runtimeConfig, configRules, environment)`

Detects all configuration drifts.

**Parameters**:
- `declaredConfig` (Object): Baseline config from Git (flat key-value map)
- `runtimeConfig` (Object): Actual runtime config (flat key-value map)
- `configRules` (Array<ConfigRule>): Array of configuration rules
- `environment` (string): Current environment (e.g., "prod", "staging")

**Returns**: Array of drift objects

### `createRule(options)`

Helper to create a config rule.

**Options**:
- `key` (string): Config key pattern (supports wildcards like `"payment.*"`)
- `required` (boolean): Whether config is required (default: `false`)
- `allowedInProd` (boolean): Whether allowed in production (default: `true`)
- `minValue` (number|null): Minimum numeric value
- `maxValue` (number|null): Maximum numeric value
- `changePolicy` (string): `CI_ONLY` or `RUNTIME_ALLOWED` (default: `RUNTIME_ALLOWED`)
- `environment` (string): Environment this rule applies to (default: `"*"`)

### Drift Object Structure

```javascript
{
    type: 'MISSING' | 'OVERRIDDEN' | 'UNSAFE',
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    configKey: string,
    expectedValue: any,  // Expected value or description
    actualValue: any,    // Actual runtime value
    explanation: string, // Human-readable explanation
    ruleKey: string      // Config rule key that triggered this
}
```

## Running Tests

```bash
npm test
```

## Test Scenarios

### 1. Missing Required Config
```javascript
// Required config missing → MISSING drift
```

### 2. Runtime Override
```javascript
// Runtime differs from declared + CI_ONLY → OVERRIDDEN drift
```

### 3. Production Safety Violation
```javascript
// debug=true in prod + allowedInProd=false → UNSAFE drift (CRITICAL)
```

### 4. Numeric Constraint Violation
```javascript
// Value exceeds max → UNSAFE drift (HIGH)
```

### 5. Production Incident Scenario
```javascript
// Multiple drifts: overrides + safety violations
```

## Example Output

```javascript
[
    {
        type: 'OVERRIDDEN',
        severity: 'MEDIUM',
        configKey: 'payment.timeout',
        expectedValue: 10000,
        actualValue: 50000,
        explanation: 'Runtime override detected: "payment.timeout" has value "50000" but declared value is "10000"',
        ruleKey: 'payment.timeout'
    },
    {
        type: 'UNSAFE',
        severity: 'CRITICAL',
        configKey: 'debug',
        expectedValue: '(not allowed in production)',
        actualValue: true,
        explanation: 'Configuration "debug" is not allowed in production environment. Current value: "true"',
        ruleKey: 'debug'
    }
]
```

## Integration

This engine can be integrated into:

1. **Config Monitor Server**: Use in drift detection service
2. **CI/CD Pipelines**: Check for drifts before deployment
3. **Monitoring Systems**: Alert on critical drifts
4. **Standalone Tools**: CLI tools for config validation

## Pattern Matching

Rules support wildcard patterns:

- `"payment.*"` matches `"payment.timeout"`, `"payment.retryCount"`, etc.
- `"database.*"` matches all database configs
- Exact match: `"server.port"` matches only `"server.port"`

## Environment-Specific Rules

Rules can be scoped to specific environments:

```javascript
createRule({
    key: 'debug',
    allowedInProd: false,
    environment: 'prod'  // Only applies to prod
})
```

Use `environment: '*'` for rules that apply to all environments.

## License

MIT
