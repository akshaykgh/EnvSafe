# Getting Started - Configuration Drift Monitor (JavaScript)

Welcome! This guide will get you up and running in 5 minutes.

## 🎯 What You'll Build

A complete configuration drift monitoring system that:
- ✅ Detects differences between Git config and runtime config
- ✅ Alerts on configuration changes
- ✅ Provides a web dashboard for visualization
- ✅ Integrates with CI/CD pipelines

## ⚡ Quick Start (5 Minutes)

### 1. Install Dependencies (1 minute)

```bash
# From project root
npm run install:all
```

### 2. Start Server (1 minute)

**Terminal 1:**
```bash
cd config-monitor-server-js
npm start
```

Wait for: `Config Monitor Server running on http://localhost:8080`

### 3. Start Dashboard (1 minute)

**Terminal 2:**
```bash
cd config-monitor-ui
npm run dev
```

Open: http://localhost:3000

### 4. Create Test Data (1 minute)

**Terminal 3:**
```bash
./scripts/test-ui.sh
```

### 5. View Results (1 minute)

- Open http://localhost:3000 in your browser
- You should see drift cards!
- Try filtering, acknowledging, and resolving drifts

## 🎓 Learn the Basics

### What is Configuration Drift?

Configuration drift occurs when:
- Runtime config differs from Git baseline
- Environment variables override declared values
- Temporary fixes become permanent

**Example:**
```yaml
# Git (baseline)
payment.timeout: 10000

# Runtime (actual)
PAYMENT_TIMEOUT=50000  # Overridden via env var
```

### How It Works

1. **Register Baseline**: Upload your Git config (YAML)
2. **Agent Collects**: Runtime config from your app
3. **Server Detects**: Differences between baseline and runtime
4. **Dashboard Shows**: All drifts with details
5. **You Manage**: Acknowledge or resolve drifts

## 📖 Next Steps

### Read Documentation

- **[QUICKSTART-JS.md](./QUICKSTART-JS.md)** - Detailed setup
- **[README-JAVASCRIPT.md](./README-JAVASCRIPT.md)** - Complete guide
- **[SETUP-JS.md](./SETUP-JS.md)** - Installation guide

### Try Examples

- **[example-app-js](./example-app-js/)** - Example Node.js app
- **[scripts/test-ui.sh](./scripts/test-ui.sh)** - Test scenarios

### Integrate Agent

Add to your Node.js app:

```javascript
import { ConfigMonitorAgent } from 'config-monitor-agent';

const agent = new ConfigMonitorAgent({
    serverUrl: 'http://localhost:8080',
    applicationName: 'my-service',
    environment: 'prod'
});

agent.start();
```

## 🎉 You're Ready!

The system is running. Start monitoring your configuration drift!

For help, see [TESTING.md](./TESTING.md) or check the troubleshooting section in [SETUP-JS.md](./SETUP-JS.md).
