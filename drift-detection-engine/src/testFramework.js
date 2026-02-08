/**
 * Simple test framework for Node.js
 * Provides describe, it, expect functions
 */

let passed = 0;
let failed = 0;
const failures = [];

export function describe(name, fn) {
    console.log(`\n${name}`);
    const beforeFailed = failed;
    try {
        fn();
    } catch (error) {
        console.error(`  Error in describe block: ${error.message}`);
    }
    if (failed === beforeFailed) {
        console.log(`  ✓ All tests passed`);
    }
}

export function it(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (error) {
        console.log(`  ✗ ${name}`);
        console.log(`    ${error.message}`);
        failed++;
        failures.push({ name, error: error.message });
    }
}

export function expect(actual) {
    return {
        toBe: (expected) => {
            if (actual !== expected) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        },
        toEqual: (expected) => {
            const actualStr = JSON.stringify(actual, null, 2);
            const expectedStr = JSON.stringify(expected, null, 2);
            if (actualStr !== expectedStr) {
                throw new Error(`Expected:\n${expectedStr}\nGot:\n${actualStr}`);
            }
        },
        toHaveLength: (expected) => {
            if (actual.length !== expected) {
                throw new Error(`Expected length ${expected}, got ${actual.length}`);
            }
        },
        toContain: (expected) => {
            if (!actual.includes(expected)) {
                throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
            }
        },
        toBeDefined: () => {
            if (actual === undefined) {
                throw new Error(`Expected value to be defined, got undefined`);
            }
        },
        toBeGreaterThan: (expected) => {
            if (actual <= expected) {
                throw new Error(`Expected ${actual} to be greater than ${expected}`);
            }
        },
        toBeGreaterThanOrEqual: (expected) => {
            if (actual < expected) {
                throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
            }
        }
    };
}

export function getResults() {
    return { passed, failed, failures };
}
