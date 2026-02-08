# How to Test - Configuration Drift Monitor

Complete testing guide for the JavaScript implementation.

## 🚀 Quick Test (5 Minutes)

### Step 1: Start the Server

**Terminal 1:**
```bash
cd config-monitor-server-js
npm install
npm start
```

Wait for: `Config Monitor Server running on http://localhost:8080`

### Step 2: Run Quick Smoke Test

**Terminal 2:**
```bash
# Make sure you have jq installed (brew install jq on macOS)
./scripts/quick-test.sh
```

**Expected Output:**
```
🔍 Quick Smoke Test - Config Monitor
Server: http://localhost:8080

Checking server health... ✅
Testing baseline registration... ✅
Testing snapshot submission... ✅
Testing drift retrieval... ✅
Testing CI check endpoint... ✅

✅ All smoke tests passed!
```

## 🧪 Unit Tests

### Test Drift Detection Engine

```bash
cd drift-detection-engine
npm install
npm test
```

**Expected Output:**
```
Drift Detection Engine - Missing Config Tests
  ✓ should detect missing required configuration
  ✓ should detect missing required config with wildcard pattern
  ✓ should not flag non-required missing configs
  ✓ All tests passed

... (more test suites)

=== Test Results ===
Passed: 19
Failed: 0
```

## 🔗 Integration Tests

### Full Stack Test

**Prerequisites:**
- Server running on port 8080

**Run Test Suite:**
```bash
./scripts/run-tests.sh
```

**What It Tests:**
1. ✅ Server health check
2. ✅ Baseline registration
3. ✅ Snapshot submission (no drift)
4. ✅ Verify no drifts initially
5. ✅ Submit snapshot with override
6. ✅ Verify drift detected
7. ✅ Submit snapshot with unsafe config
8. ✅ CI check fails with active drifts
9. ✅ Resolve drift
10. ✅ CI check passes after resolve

**Expected Output:**
```
=== Configuration Drift Monitor - Test Suite ===
Server URL: http://localhost:8080
Test Application: test-service-1234567890

Testing: Server health check... ✓
Testing: Register baseline... ✓
Testing: Submit snapshot (no drift)... ✓
Testing: Verify no drifts initially... ✓
Testing: Submit snapshot with override... ✓
Testing: Verify drift detected... ✓
Testing: Submit snapshot with unsafe config... ✓
Testing: CI check fails with active drifts... ✓
Testing: Resolve drift... ✓
Testing: CI check passes after resolve... ✓

=== Test Results ===
Passed: 10
Failed: 0

✅ All tests passed!
```

## 🎨 UI Testing

### Step 1: Start Server and Dashboard

**Terminal 1 - Server:**
```bash
cd config-monitor-server-js
npm start
```

**Terminal 2 - Dashboard:**
```bash
cd config-monitor-ui
npm install
npm run dev
```

**Terminal 3 - Create Test Data:**
```bash
./scripts/test-ui.sh
```

### Step 2: Open Dashboard

Open browser: **http://localhost:3000**

**What to Test:**
1. ✅ Dashboard loads
2. ✅ Drifts are displayed
3. ✅ Filter by application works
4. ✅ Filter by status works
5. ✅ Acknowledge button works
6. ✅ Resolve button works
7. ✅ Auto-refresh works (every 30 seconds)

## 📋 Manual Testing Steps

### Test 1: Basic Functionality

```bash
# 1. Register baseline
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "test-app",
    "environment": "prod",
    "yamlContent": "payment:\n  timeout: 10000\ndebug: false"
  }'

# 2. Submit snapshot (matches baseline - no drift)
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "test-app",
    "environment": "prod",
    "config": {
      "payment.timeout": 10000,
      "debug": false
    }
  }'

# 3. Check drifts (should be empty)
curl http://localhost:8080/api/v1/drifts | jq '.'
```

### Test 2: Detect Override

```bash
# Submit snapshot with override
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "test-app",
    "environment": "prod",
    "config": {
      "payment.timeout": 50000,
      "debug": false
    }
  }'

# Check drifts (should show override)
curl http://localhost:8080/api/v1/drifts | jq '.'
```

### Test 3: Detect Unsafe Config

```bash
# Submit snapshot with debug=true (not allowed in prod)
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "test-app",
    "environment": "prod",
    "config": {
      "payment.timeout": 10000,
      "debug": true
    }
  }'

# Check drifts (should show unsafe config)
curl "http://localhost:8080/api/v1/drifts?applicationName=test-app" | jq '.'
```

### Test 4: CI/CD Check

```bash
# Check for active drifts
curl http://localhost:8080/api/v1/ci-check?applicationName=test-app

# Should return:
# {
#   "status": "fail",
#   "message": "Unresolved configuration drifts detected",
#   "driftCount": 2
# }
```

### Test 5: Manage Drifts

```bash
# Get drift ID
DRIFT_ID=$(curl -s http://localhost:8080/api/v1/drifts | jq -r '.[0].id')

# Acknowledge drift
curl -X POST "http://localhost:8080/api/v1/drifts/$DRIFT_ID/acknowledge"

# Resolve drift
curl -X POST "http://localhost:8080/api/v1/drifts/$DRIFT_ID/resolve"

# Verify CI check passes
curl http://localhost:8080/api/v1/ci-check?applicationName=test-app
```

## 🎯 End-to-End Test Scenario

### Complete Workflow Test

**Step 1: Start Everything**
```bash
# Terminal 1: Server
cd config-monitor-server-js && npm start

# Terminal 2: Dashboard
cd config-monitor-ui && npm run dev

# Terminal 3: Example App
cd example-app-js && npm start
```

**Step 2: Register Baseline**
```bash
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d @test-data/baseline.json
```

**Step 3: Wait for Agent**
- Example app sends snapshot every 30 seconds
- Wait 30-60 seconds
- Check dashboard: http://localhost:3000

**Step 4: Create Drift**
```bash
# Stop example app (Ctrl+C)
export PAYMENT_TIMEOUT=50000
export DEBUG=true
cd example-app-js
npm start
```

**Step 5: View in Dashboard**
- Open http://localhost:3000
- Filter by "payment-service"
- See drifts appear automatically

## 🧩 Component Testing

### Test Server Components

```bash
# Test YAML parsing
node -e "
import('./config-monitor-server-js/src/services/yamlParser.js').then(m => {
  const yaml = 'payment:\n  timeout: 10000';
  const result = m.parseYaml(yaml);
  console.log(JSON.stringify(result, null, 2));
});
"

# Test secret hashing
node -e "
import('./config-monitor-server-js/src/services/secretHandler.js').then(m => {
  const hash = m.hashSecret('mysecret123');
  console.log('Hash:', hash);
  console.log('Is secret:', m.isSecret('database.password'));
});
"
```

### Test Agent Components

```bash
# Test config collection
node -e "
import('./config-monitor-agent-js/src/collector.js').then(m => {
  const collector = new m.ConfigCollector();
  const config = collector.collectRuntimeConfig();
  console.log('Collected config keys:', Object.keys(config).length);
  console.log('Sample:', Object.keys(config).slice(0, 5));
});
"
```

## 📊 Test Coverage

### Current Test Coverage

- ✅ **Drift Detection Engine**: 19 unit tests (all passing)
- ✅ **Integration Tests**: 10+ test scenarios
- ✅ **API Tests**: All endpoints covered
- ✅ **UI Tests**: Manual testing guide

### Running All Tests

```bash
# 1. Unit tests
cd drift-detection-engine && npm test

# 2. Integration tests
./scripts/run-tests.sh

# 3. UI tests
./scripts/test-ui.sh
```

## 🐛 Troubleshooting Tests

### Server Not Running

```bash
# Check if server is running
curl http://localhost:8080/health

# If not, start it
cd config-monitor-server-js
npm start
```

### Tests Failing

```bash
# Check server logs
# Look for errors in terminal where server is running

# Check database
ls -la config-monitor-server-js/data/

# Reset database (starts fresh)
rm config-monitor-server-js/data/configmonitor.db
cd config-monitor-server-js
npm start
```

### jq Not Found

```bash
# Install jq (macOS)
brew install jq

# Install jq (Linux)
sudo apt-get install jq

# Or use without jq (manual JSON parsing)
curl http://localhost:8080/api/v1/drifts
```

## ✅ Test Checklist

### Basic Functionality
- [ ] Server starts successfully
- [ ] Health endpoint responds
- [ ] Baseline registration works
- [ ] Snapshot submission works
- [ ] Drift detection works
- [ ] Drift retrieval works

### Advanced Features
- [ ] Filter by application works
- [ ] Filter by status works
- [ ] Acknowledge drift works
- [ ] Resolve drift works
- [ ] CI check endpoint works
- [ ] Auto-refresh works (dashboard)

### Edge Cases
- [ ] Empty configs handled
- [ ] Null values handled
- [ ] Secret hashing works
- [ ] Wildcard patterns work
- [ ] Multiple applications supported

## 📝 Test Data Files

Use pre-made test data:

```bash
# Register baseline
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d @test-data/baseline.json

# Submit snapshot with override
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d @test-data/snapshot-override.json

# Submit snapshot with unsafe config
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d @test-data/snapshot-unsafe.json
```

## 🎯 Quick Reference

### Most Common Tests

```bash
# 1. Quick smoke test
./scripts/quick-test.sh

# 2. Full integration test
./scripts/run-tests.sh

# 3. UI test helper
./scripts/test-ui.sh

# 4. Unit tests
cd drift-detection-engine && npm test
```

### Manual API Tests

```bash
# Health check
curl http://localhost:8080/health

# Register baseline
curl -X POST http://localhost:8080/api/v1/baselines -H "Content-Type: application/json" -d '{...}'

# Submit snapshot
curl -X POST http://localhost:8080/api/v1/config-snapshots -H "Content-Type: application/json" -d '{...}'

# Get drifts
curl http://localhost:8080/api/v1/drifts

# CI check
curl http://localhost:8080/api/v1/ci-check?applicationName=test-app
```

## 🎉 Success Criteria

All tests pass when:
- ✅ Unit tests: 19/19 passing
- ✅ Integration tests: 10/10 passing
- ✅ API endpoints: All responding correctly
- ✅ Dashboard: Loads and displays drifts
- ✅ Agent: Sends snapshots successfully

**You're ready to use the system!** 🚀
