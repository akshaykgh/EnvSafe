# Quick Start Guide

This guide will help you get the Configuration Drift Monitor up and running in minutes.

## Prerequisites

- Node.js 18+ and npm
- (Optional) PostgreSQL for production

## Step 1: Install All Dependencies

```bash
# Install all components at once
npm run install:all

# Or install individually
npm run install:server
npm run install:ui
npm run install:agent
npm run install:example
```

## Step 2: Start the Config Monitor Server

**Terminal 1:**
```bash
npm run start:server
# Or: cd config-monitor-server-js && npm start
```

Wait for: `Config Monitor Server running on http://localhost:8080`

**Verify:**
```bash
curl http://localhost:8080/health
# Should return: {"status":"UP"}
```

## Step 3: Start the Dashboard

**Terminal 2:**
```bash
npm run start:ui
# Or: cd config-monitor-ui && npm run dev
```

Wait for: `Local: http://localhost:3000`

Open browser: `http://localhost:3000`

## Step 4: Register Baseline Configuration

**Terminal 3:**
```bash
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "yamlContent": "payment:\n  timeout: 10000\n  retry-count: 3\n  enabled: true\ndebug: false\ndatabase:\n  url: jdbc:postgresql://prod-db:5432/payments"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Baseline registered",
  "configKeys": 5
}
```

## Step 5: Run Example Application

**Terminal 4:**
```bash
npm run start:example
# Or: cd example-app-js && npm start
```

The example app will:
- Start on port 8081
- Automatically collect config from `process.env`
- Send snapshots to server every 30 seconds

## Step 6: Create Configuration Drift

### Option A: Using Environment Variables

**Stop the example app** (Ctrl+C), then:

```bash
# Create override
export PAYMENT_TIMEOUT=50000
export DEBUG=true

# Restart app
cd example-app-js
npm start
```

**Wait 30-60 seconds**, then check dashboard at `http://localhost:3000`

### Option B: Using API Directly

```bash
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "config": {
      "PAYMENT_TIMEOUT": "50000",
      "DEBUG": "true"
    }
  }'
```

Refresh dashboard to see drifts!

## Step 7: View and Manage Drifts

### In Dashboard (http://localhost:3000)

1. **View Drifts**: See all active drifts
2. **Filter**: By application or status
3. **Acknowledge**: Click "Acknowledge" button
4. **Resolve**: Click "Resolve" button

### Via API

```bash
# Get all drifts
curl http://localhost:8080/api/v1/drifts | jq '.'

# Get active drifts for specific app
curl "http://localhost:8080/api/v1/drifts?applicationName=payment-service&status=ACTIVE" | jq '.'

# Acknowledge drift
DRIFT_ID=$(curl -s http://localhost:8080/api/v1/drifts | jq -r '.[0].id')
curl -X POST "http://localhost:8080/api/v1/drifts/$DRIFT_ID/acknowledge"

# Resolve drift
curl -X POST "http://localhost:8080/api/v1/drifts/$DRIFT_ID/resolve"
```

## Step 8: CI/CD Integration

```bash
# Check for active drifts
curl http://localhost:8080/api/v1/ci-check?applicationName=payment-service

# Response (with drifts):
# {
#   "status": "fail",
#   "message": "Unresolved configuration drifts detected",
#   "driftCount": 1
# }

# Response (no drifts):
# {
#   "status": "pass",
#   "message": "No unresolved configuration drifts"
# }
```

## Quick Test Script

Use the helper script to set up test data:

```bash
./scripts/test-ui.sh
```

This will:
- Register a test baseline
- Submit snapshots that create drifts
- Show you what to look for in the UI

## Using the Agent in Your App

### Basic Integration

```javascript
import { ConfigMonitorAgent } from 'config-monitor-agent';

const agent = new ConfigMonitorAgent({
    serverUrl: 'http://localhost:8080',
    applicationName: 'my-service',
    environment: process.env.NODE_ENV || 'prod',
    collectionIntervalMillis: 60000
});

agent.start();
```

### With Express App

```javascript
import express from 'express';
import { ConfigMonitorAgent } from 'config-monitor-agent';

const app = express();
const agent = new ConfigMonitorAgent({
    serverUrl: process.env.CONFIG_MONITOR_SERVER_URL || 'http://localhost:8080',
    applicationName: 'my-service',
    environment: process.env.NODE_ENV || 'prod'
});

agent.start();

app.get('/health', (req, res) => {
    res.json({ 
        status: 'UP',
        agentStats: agent.getStats()
    });
});

app.listen(3000);
```

### Graceful Shutdown

```javascript
process.on('SIGTERM', () => {
    console.log('Shutting down...');
    agent.stop();
    process.exit(0);
});
```

## Troubleshooting

### Server Won't Start

```bash
# Check if port is in use
lsof -i :8080

# Check Node.js version
node --version  # Should be 18+

# Check database directory permissions
ls -la config-monitor-server-js/data/
```

### Dashboard Shows "No drifts found"

1. Verify baseline is registered
2. Submit a snapshot with different values
3. Wait 30 seconds for auto-refresh
4. Check browser console for errors

### Agent Not Sending Snapshots

1. Verify `serverUrl` is correct
2. Check server is running: `curl http://localhost:8080/health`
3. Review console logs
4. Ensure `applicationName` is set

## Next Steps

- Read [README-JAVASCRIPT.md](./README-JAVASCRIPT.md) for detailed documentation
- Check [TESTING.md](./TESTING.md) for testing guide
- See [UI-TESTING.md](./UI-TESTING.md) for dashboard testing
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design

## Production Deployment

1. **Use PostgreSQL**: Update database configuration
2. **Add Authentication**: Implement API keys or OAuth2
3. **Use HTTPS**: Configure SSL/TLS
4. **Add Monitoring**: Integrate with monitoring tools
5. **Set Environment Variables**: Configure via `.env` files

## Summary

✅ **Server**: `npm run start:server` → http://localhost:8080
✅ **Dashboard**: `npm run start:ui` → http://localhost:3000
✅ **Example**: `npm run start:example` → http://localhost:8081
✅ **Agent**: Integrate into your Node.js apps
✅ **Testing**: Use helper scripts in `scripts/` directory

You're ready to monitor configuration drift!
