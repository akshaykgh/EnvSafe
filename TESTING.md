# Testing Guide - Configuration Drift Monitor

This guide covers all testing approaches for the Configuration Drift Monitor project.

## Table of Contents

1. [Unit Tests](#unit-tests)
2. [Integration Tests](#integration-tests)
3. [End-to-End Testing](#end-to-end-testing)
4. [API Testing](#api-testing)
5. [Scenario-Based Testing](#scenario-based-testing)
6. [Test Scripts](#test-scripts)

## Unit Tests

### 1. Drift Detection Engine Tests

The drift detection engine has comprehensive unit tests.

**Run Tests:**
```bash
cd drift-detection-engine
npm test
```

**Expected Output:**
```
✓ 19 tests passed
```

**Test Coverage:**
- Missing config detection
- Override detection
- Safety violations
- Production scenarios
- Edge cases

### 2. Server Components (Node.js)

**Run Integration Tests:**
```bash
# From project root
./scripts/run-tests.sh
```

**Create Unit Tests:**

Example test for drift detection:
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class DriftDetectionServiceTest {

    @Autowired
    private DriftDetectionService driftDetectionService;

    @Test
    void testDetectMissingRequiredConfig() {
        // Test implementation
    }

    @Test
    void testDetectRuntimeOverride() {
        // Test implementation
    }
}
```

### 3. JavaScript Components

**Run JavaScript Tests:**
```bash
# Server tests (if available)
cd config-monitor-server-js
npm test

# Agent tests (if available)
cd config-monitor-agent-js
npm test
```

## Integration Tests

### 1. Full Stack Integration Test (Java)

**Prerequisites:**
- Config Monitor Server running
- Database initialized

**Test Script:**
```bash
#!/bin/bash
# scripts/integration-test.sh

set -e

echo "Starting Integration Tests..."

# 1. Start server (if not running)
# cd config-monitor-server-js && npm start &

# 2. Wait for server to be ready
sleep 10

# 3. Register baseline
echo "Registering baseline..."
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "test-service",
    "environment": "test",
    "yamlContent": "payment:\n  timeout: 10000\ndebug: false"
  }'

# 4. Submit config snapshot
echo "Submitting snapshot..."
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "test-service",
    "environment": "test",
    "config": {
      "payment.timeout": 50000,
      "debug": true
    }
  }'

# 5. Check for drifts
echo "Checking drifts..."
DRIFTS=$(curl -s http://localhost:8080/api/v1/drifts?applicationName=test-service)

if [ -z "$DRIFTS" ] || [ "$DRIFTS" = "[]" ]; then
    echo "❌ No drifts detected (expected drifts)"
    exit 1
else
    echo "✅ Drifts detected: $DRIFTS"
fi

echo "Integration test completed successfully!"
```

### 2. Agent Integration Test

**Test the agent with a real Node.js app:**

```bash
cd example-app-js
npm install
npm start

# Wait for agent to send snapshots (30-60 seconds)
# Check server logs for received snapshots
```

## End-to-End Testing

### Scenario 1: Basic Drift Detection

**Steps:**

1. **Start Server:**
```bash
cd config-monitor-server-js
npm install
npm start
```

2. **Register Baseline:**
```bash
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "yamlContent": "payment:\n  timeout: 10000\n  retry-count: 3\ndebug: false"
  }'
```

3. **Start Example App:**
```bash
cd example-app-js
npm install
npm start
```

4. **Wait for Snapshot** (30-60 seconds)

5. **Check Drifts:**
```bash
curl http://localhost:8080/api/v1/drifts | jq '.'
```

**Expected:** No drifts initially (config matches baseline)

### Scenario 2: Simulate Runtime Override

**Steps:**

1. **Stop Example App** (Ctrl+C)

2. **Set Environment Variable:**
```bash
export PAYMENT_TIMEOUT=50000
```

3. **Restart Example App:**
```bash
cd example-app
npm start
```

4. **Wait for Snapshot** (30-60 seconds)

5. **Check Drifts:**
```bash
curl http://localhost:8080/api/v1/drifts?applicationName=payment-service | jq '.'
```

**Expected:** 
- Drift detected for `payment.timeout`
- Type: `OVERRIDDEN`
- Severity: `MEDIUM`

### Scenario 3: Production Safety Violation

**Steps:**

1. **Set Debug Mode:**
```bash
export DEBUG=true
```

2. **Restart Example App:**
```bash
cd example-app-js
npm start
```

3. **Wait for Snapshot**

4. **Check Drifts:**
```bash
curl http://localhost:8080/api/v1/drifts | jq '.[] | select(.configKey == "debug")'
```

**Expected:**
- Drift detected for `debug`
- Type: `RULE_VIOLATION` or `UNSAFE`
- Severity: `CRITICAL`

### Scenario 4: CI/CD Check

**Steps:**

1. **Create Active Drift** (use Scenario 2 or 3)

2. **Run CI Check:**
```bash
curl http://localhost:8080/api/v1/ci-check?applicationName=payment-service
```

**Expected:** 
```json
{
  "status": "fail",
  "message": "Unresolved configuration drifts detected",
  "driftCount": 1
}
```

3. **Resolve Drift:**
```bash
DRIFT_ID=$(curl -s http://localhost:8080/api/v1/drifts | jq -r '.[0].id')
curl -X POST http://localhost:8080/api/v1/drifts/$DRIFT_ID/resolve
```

4. **Run CI Check Again:**
```bash
curl http://localhost:8080/api/v1/ci-check?applicationName=payment-service
```

**Expected:**
```json
{
  "status": "pass",
  "message": "No unresolved configuration drifts"
}
```

## API Testing

### Using curl

**Test All Endpoints:**

```bash
# Health check
curl http://localhost:8080/health

# Register baseline
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d @test-data/baseline.json

# Submit snapshot
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d @test-data/snapshot.json

# Get drifts
curl http://localhost:8080/api/v1/drifts

# Acknowledge drift
curl -X POST http://localhost:8080/api/v1/drifts/{id}/acknowledge

# Resolve drift
curl -X POST http://localhost:8080/api/v1/drifts/{id}/resolve

# CI check
curl http://localhost:8080/api/v1/ci-check?applicationName=payment-service
```

### Using Postman/Insomnia

Import the API collection (create `test-data/api-collection.json`):

```json
{
  "info": {
    "name": "Config Monitor API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Register Baseline",
      "request": {
        "method": "POST",
        "url": "http://localhost:8080/api/v1/baselines",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"applicationName\": \"payment-service\",\n  \"environment\": \"prod\",\n  \"yamlContent\": \"payment:\\n  timeout: 10000\"\n}"
        }
      }
    }
  ]
}
```

## Scenario-Based Testing

### Test Data Files

Create test data files:

**`test-data/baseline.json`:**
```json
{
  "applicationName": "payment-service",
  "environment": "prod",
  "yamlContent": "payment:\n  timeout: 10000\n  retry-count: 3\ndebug: false\ndatabase:\n  url: jdbc:postgresql://prod-db:5432/payments"
}
```

**`test-data/snapshot-override.json`:**
```json
{
  "applicationName": "payment-service",
  "environment": "prod",
  "config": {
    "payment.timeout": 50000,
    "payment.retry-count": 3,
    "debug": false
  }
}
```

**`test-data/snapshot-unsafe.json`:**
```json
{
  "applicationName": "payment-service",
  "environment": "prod",
  "config": {
    "payment.timeout": 10000,
    "debug": true
  }
}
```

### Automated Test Script

**`scripts/run-tests.sh`:**
```bash
#!/bin/bash

set -e

SERVER_URL="http://localhost:8080"
APP_NAME="test-service"

echo "=== Configuration Drift Monitor - Test Suite ==="

# Test 1: Register baseline
echo "Test 1: Register baseline..."
curl -s -X POST $SERVER_URL/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d "{\"applicationName\":\"$APP_NAME\",\"environment\":\"test\",\"yamlContent\":\"payment:\\n  timeout: 10000\"}" \
  | jq -e '.status == "success"' || exit 1

# Test 2: Submit snapshot (no drift)
echo "Test 2: Submit snapshot (no drift)..."
curl -s -X POST $SERVER_URL/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d "{\"applicationName\":\"$APP_NAME\",\"environment\":\"test\",\"config\":{\"payment.timeout\":10000}}" \
  | jq -e '.status == "success"' || exit 1

sleep 2

# Test 3: Check no drifts
echo "Test 3: Verify no drifts..."
DRIFTS=$(curl -s "$SERVER_URL/api/v1/drifts?applicationName=$APP_NAME&status=ACTIVE")
if [ "$DRIFTS" != "[]" ]; then
    echo "Unexpected drifts: $DRIFTS"
    exit 1
fi

# Test 4: Submit snapshot with override
echo "Test 4: Submit snapshot with override..."
curl -s -X POST $SERVER_URL/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d "{\"applicationName\":\"$APP_NAME\",\"environment\":\"test\",\"config\":{\"payment.timeout\":50000}}" \
  | jq -e '.status == "success"' || exit 1

sleep 2

# Test 5: Verify drift detected
echo "Test 5: Verify drift detected..."
DRIFTS=$(curl -s "$SERVER_URL/api/v1/drifts?applicationName=$APP_NAME&status=ACTIVE")
if [ "$DRIFTS" = "[]" ]; then
    echo "Expected drift not detected"
    exit 1
fi

echo "✅ All tests passed!"
```

## Test Scripts

### Quick Test Script

**`scripts/quick-test.sh`:**
```bash
#!/bin/bash

# Quick smoke test
echo "Testing Config Monitor..."

# Check server is running
curl -s http://localhost:8080/health | jq -e '.status == "UP"' || {
    echo "❌ Server not running"
    exit 1
}

# Test baseline registration
curl -s -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{"applicationName":"test","environment":"test","yamlContent":"key: value"}' \
  | jq -e '.status == "success"' || {
    echo "❌ Baseline registration failed"
    exit 1
}

echo "✅ Quick test passed!"
```

### JavaScript Version Tests

**`scripts/test-js.sh`:**
```bash
#!/bin/bash

# Test JavaScript implementation

echo "Testing JavaScript components..."

# Test drift detection engine
cd drift-detection-engine
npm test || exit 1

# Test server (if tests exist)
cd ../config-monitor-server-js
# npm test || exit 1

echo "✅ JavaScript tests passed!"
```

## Manual Testing Checklist

### Server Functionality

- [ ] Server starts successfully
- [ ] Health endpoint responds
- [ ] Baseline registration works
- [ ] Config snapshot submission works
- [ ] Drift detection works
- [ ] Drift acknowledgment works
- [ ] Drift resolution works
- [ ] CI check endpoint works

### Agent Functionality

- [ ] Agent collects config from Spring Environment
- [ ] Agent hashes secrets correctly
- [ ] Agent sends snapshots periodically
- [ ] Agent handles server failures gracefully
- [ ] Agent differentiates sources (YAML vs env vars)

### Dashboard Functionality

- [ ] Dashboard loads
- [ ] Drifts are displayed
- [ ] Filtering works (by app, status)
- [ ] Acknowledge button works
- [ ] Resolve button works
- [ ] Auto-refresh works

### Integration

- [ ] Agent → Server communication works
- [ ] Server → Dashboard communication works
- [ ] End-to-end flow works
- [ ] Multiple applications supported
- [ ] Multiple environments supported

## Performance Testing

### Load Test

```bash
# Install Apache Bench
# brew install httpd (macOS)
# apt-get install apache2-utils (Linux)

# Test baseline registration
ab -n 100 -c 10 -p test-data/baseline.json \
   -T application/json \
   http://localhost:8080/api/v1/baselines

# Test snapshot submission
ab -n 1000 -c 50 -p test-data/snapshot.json \
   -T application/json \
   http://localhost:8080/api/v1/config-snapshots
```

## Debugging Tests

### Enable Debug Logging

**Java:**
```yaml
# application-test.yml
logging:
  level:
    com.envsafe: DEBUG
```

**JavaScript:**
```bash
DEBUG=* node src/index.js
```

### Check Database

**H2 Console (Java):**
```
http://localhost:8080/h2-console
JDBC URL: jdbc:h2:mem:configmonitor
```

**SQLite (JavaScript):**
```bash
sqlite3 config-monitor-server-js/data/configmonitor.db
.tables
SELECT * FROM config_drifts;
```

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-java@v2
        with:
          java-version: '17'
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Test Java
        run: npm test
      - name: Test JavaScript
        run: |
          cd drift-detection-engine
          npm test
```

## Summary

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test full user workflows
- **API Tests**: Test REST endpoints
- **Scenario Tests**: Test real-world use cases

Run tests regularly during development and before deployment!
