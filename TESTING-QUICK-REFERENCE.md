# Testing Quick Reference

## Quick Start Testing

### 1. Start the Server

```bash
cd config-monitor-server-js
npm install
npm start
```

### 2. Run Quick Smoke Test

```bash
./scripts/quick-test.sh
```

### 3. Run Full Test Suite

```bash
./scripts/run-tests.sh
```

## Unit Tests

### Drift Detection Engine
```bash
cd drift-detection-engine
npm test
```

### Server Components
```bash
cd config-monitor-server-js
npm test
```

## Manual Testing Steps

### Step 1: Register Baseline
```bash
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d @test-data/baseline.json
```

### Step 2: Submit Snapshot (No Drift)
```bash
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "config": {"payment.timeout": 10000, "debug": false}
  }'
```

### Step 3: Check for Drifts
```bash
curl http://localhost:8080/api/v1/drifts | jq '.'
```

### Step 4: Submit Snapshot with Override
```bash
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "config": {"payment.timeout": 50000, "debug": false}
  }'
```

### Step 5: Verify Drift Detected
```bash
curl http://localhost:8080/api/v1/drifts | jq '.[] | select(.configKey == "payment.timeout")'
```

## Test Scenarios

### Scenario 1: Runtime Override
- Baseline: `payment.timeout: 10000`
- Runtime: `payment.timeout: 50000`
- Expected: OVERRIDDEN drift (MEDIUM severity)

### Scenario 2: Debug in Production
- Baseline: `debug: false`
- Runtime: `debug: true`
- Expected: UNSAFE drift (CRITICAL severity)

### Scenario 3: Missing Required Config
- Baseline: `database.username: user`
- Runtime: (missing)
- Expected: MISSING drift (HIGH severity)

### Scenario 4: Value Exceeds Maximum
- Baseline: `payment.timeout: 10000`
- Runtime: `payment.timeout: 60000`
- Rule: `maxValue: 30000`
- Expected: UNSAFE drift (HIGH severity)

## CI/CD Testing

### Check for Active Drifts
```bash
curl http://localhost:8080/api/v1/ci-check?applicationName=payment-service
```

**Expected Response (with drifts):**
```json
{
  "status": "fail",
  "message": "Unresolved configuration drifts detected",
  "driftCount": 1
}
```

**Expected Response (no drifts):**
```json
{
  "status": "pass",
  "message": "No unresolved configuration drifts"
}
```

## End-to-End Test with Example App

### 1. Start Server
```bash
cd config-monitor-server-js && npm start
```

### 2. Register Baseline
```bash
./scripts/register-baseline.sh payment-service prod example-app-js/config.example.js
```

### 3. Start Example App
```bash
cd example-app-js && npm start
```

### 4. Create Drift (in new terminal)
```bash
export PAYMENT_TIMEOUT=50000
cd example-app-js && npm start
```

### 5. View Drifts
- Dashboard: http://localhost:3000
- API: `curl http://localhost:8080/api/v1/drifts | jq '.'`

## Common Issues

### Server Not Running
```bash
# Check if server is running
curl http://localhost:8080/health

# Start server
cd config-monitor-server-js && npm start
```

### No Drifts Detected
- Wait 30-60 seconds for agent to send snapshot
- Check agent logs for errors
- Verify baseline is registered
- Check that runtime config actually differs

### Database Issues
- H2 Console: http://localhost:8080/h2-console
- SQLite: `sqlite3 config-monitor-server-js/data/configmonitor.db`

## Test Checklist

- [ ] Server starts successfully
- [ ] Health endpoint works
- [ ] Baseline registration works
- [ ] Snapshot submission works
- [ ] Drift detection works
- [ ] Dashboard displays drifts
- [ ] Acknowledge drift works
- [ ] Resolve drift works
- [ ] CI check works
- [ ] Agent sends snapshots
- [ ] Secrets are hashed

## Performance Testing

```bash
# Load test baseline registration
ab -n 100 -c 10 -p test-data/baseline.json \
   -T application/json \
   http://localhost:8080/api/v1/baselines

# Load test snapshot submission
ab -n 1000 -c 50 -p test-data/snapshot-override.json \
   -T application/json \
   http://localhost:8080/api/v1/config-snapshots
```

## Debug Mode

### Enable Debug Logging (Java)
```yaml
# application.yml
logging:
  level:
    com.envsafe: DEBUG
```

### Enable Debug Logging (JavaScript)
```bash
DEBUG=* npm start
```

## Useful Commands

```bash
# View all drifts
curl http://localhost:8080/api/v1/drifts | jq '.'

# View active drifts for specific app
curl "http://localhost:8080/api/v1/drifts?applicationName=payment-service&status=ACTIVE" | jq '.'

# Get drift by ID
DRIFT_ID=$(curl -s http://localhost:8080/api/v1/drifts | jq -r '.[0].id')
curl http://localhost:8080/api/v1/drifts/$DRIFT_ID

# Acknowledge drift
curl -X POST http://localhost:8080/api/v1/drifts/$DRIFT_ID/acknowledge

# Resolve drift
curl -X POST http://localhost:8080/api/v1/drifts/$DRIFT_ID/resolve
```
