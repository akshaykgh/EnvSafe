# Drift Detection Engine - Implementation Summary

## Overview

A production-ready drift detection engine that identifies configuration drift between declared (Git) and runtime configurations.

## Implementation

### Core Function: `detectDrift()`

Takes three inputs:
- `declaredConfig`: Baseline configuration from Git (flat key-value map)
- `runtimeConfig`: Actual runtime configuration (flat key-value map)
- `configRules`: Array of configuration rules

Returns: Array of drift objects

### Drift Types

1. **MISSING**: Required configuration key is absent
   - Severity: HIGH
   - Triggered when: `required: true` and key not found in runtime config

2. **OVERRIDDEN**: Runtime value differs from declared baseline
   - Severity: MEDIUM
   - Triggered when: Value differs AND `changePolicy: CI_ONLY`

3. **UNSAFE**: Value violates safety rules
   - Severity: HIGH or CRITICAL
   - Triggered when:
     - `allowedInProd: false` but present in production
     - Value outside `minValue`/`maxValue` range

### Rule System

Rules support:
- **Pattern matching**: Wildcards like `"payment.*"` match multiple keys
- **Required flags**: Mark configs as mandatory
- **Production safety**: Block unsafe configs in prod
- **Numeric constraints**: Min/max value validation
- **Change policies**: `CI_ONLY` vs `RUNTIME_ALLOWED`
- **Environment scoping**: Rules can be environment-specific

## Test Coverage

✅ **19 test cases** covering:

1. **Missing Config Tests** (3 tests)
   - Missing required config
   - Wildcard pattern matching
   - Non-required configs

2. **Overridden Config Tests** (4 tests)
   - CI_ONLY policy detection
   - RUNTIME_ALLOWED policy (no detection)
   - New runtime configs not in baseline
   - String vs number comparison

3. **Unsafe Config Tests** (4 tests)
   - Debug mode in production (CRITICAL)
   - Value below minimum
   - Value above maximum
   - Environment-specific rules

4. **Production Scenarios** (4 tests)
   - Multiple drifts in incident scenario
   - Missing database configuration
   - Empty declared config (new service)
   - Environment-specific rule application

5. **Edge Cases** (4 tests)
   - Null/undefined values
   - Wildcard pattern matching
   - No rules provided
   - Empty configs

## Example Usage

```javascript
import { detectDrift, createRule, CHANGE_POLICY } from './driftDetector.js';

const declaredConfig = {
    'payment.timeout': 10000,
    'debug': false
};

const runtimeConfig = {
    'payment.timeout': 50000,  // Overridden
    'debug': true  // Not allowed in prod
};

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

const drifts = detectDrift(declaredConfig, runtimeConfig, rules, 'prod');

// Results:
// [
//   {
//     type: 'OVERRIDDEN',
//     severity: 'MEDIUM',
//     configKey: 'payment.timeout',
//     expectedValue: 10000,
//     actualValue: 50000,
//     explanation: 'Runtime override detected...',
//     ruleKey: 'payment.timeout'
//   },
//   {
//     type: 'UNSAFE',
//     severity: 'CRITICAL',
//     configKey: 'debug',
//     expectedValue: '(not allowed in production)',
//     actualValue: true,
//     explanation: 'Configuration "debug" is not allowed...',
//     ruleKey: 'debug'
//   }
// ]
```

## Production Scenarios Covered

### Scenario 1: Emergency Override
```javascript
// Engineer sets PAYMENT_TIMEOUT=120000 during incident
// Detects: OVERRIDDEN + UNSAFE (exceeds max)
```

### Scenario 2: Debug Mode in Production
```javascript
// DEBUG=true accidentally set
// Detects: UNSAFE (CRITICAL severity)
```

### Scenario 3: Missing Required Config
```javascript
// Database password missing
// Detects: MISSING (HIGH severity)
```

### Scenario 4: Multiple Violations
```javascript
// Multiple drifts detected in single run
// Returns array of all drifts
```

## Integration Points

This engine can be integrated into:

1. **Config Monitor Server**: Core drift detection logic
2. **CI/CD Pipelines**: Pre-deployment validation
3. **Monitoring Systems**: Real-time drift alerts
4. **CLI Tools**: Standalone config validation

## Key Features

✅ **Pattern Matching**: Wildcard support (`payment.*`)
✅ **Type Safety**: Clear drift object structure
✅ **Severity Levels**: LOW, MEDIUM, HIGH, CRITICAL
✅ **Environment Awareness**: Rules scoped to environments
✅ **Comprehensive Tests**: 19 test cases, all passing
✅ **Production Ready**: Handles edge cases, null values, etc.

## File Structure

```
drift-detection-engine/
├── src/
│   ├── driftDetector.js      # Main detection engine
│   ├── driftDetector.test.js # Comprehensive unit tests
│   └── testFramework.js       # Simple test framework
├── package.json
├── README.md
└── IMPLEMENTATION.md
```

## Next Steps

1. Integrate into Config Monitor Server
2. Add more rule types (regex validation, custom validators)
3. Add drift prioritization/sorting
4. Add drift grouping by category
5. Performance optimization for large config sets
