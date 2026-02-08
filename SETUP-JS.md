# Complete JavaScript Setup Guide

This guide will help you set up the entire Configuration Drift Monitor using pure JavaScript/Node.js.

## 📋 Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (optional, for cloning)

## 🚀 Installation

### Option 1: Quick Install (All Components)

```bash
# From project root
npm run install:all
```

This installs dependencies for:
- Server
- Agent
- Dashboard
- Example app

### Option 2: Manual Install

```bash
# Server
cd config-monitor-server-js
npm install
cd ..

# Agent
cd config-monitor-agent-js
npm install
cd ..

# Dashboard
cd config-monitor-ui
npm install
cd ..

# Example app
cd example-app-js
npm install
cd ..

# Drift detection engine (for testing)
cd drift-detection-engine
npm install
cd ..
```

## 🏃 Running the System

### Terminal 1: Start Server

```bash
cd config-monitor-server-js
npm start
```

**Expected Output:**
```
Database initialized
Config Monitor Server running on http://localhost:8080
```

**Verify:**
```bash
curl http://localhost:8080/health
# Should return: {"status":"UP"}
```

### Terminal 2: Start Dashboard

```bash
cd config-monitor-ui
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

**Open Browser:** http://localhost:3000

### Terminal 3: Run Example App (Optional)

```bash
cd example-app-js
npm start
```

**Expected Output:**
```
Example app running on http://localhost:8081
Config monitor agent started for payment-service
```

## 🧪 Testing the Setup

### Quick Test

```bash
# From project root
./scripts/test-ui.sh
```

This will:
1. Check server is running
2. Register a test baseline
3. Submit test snapshots
4. Create drifts for you to view

### Manual Test

**1. Register Baseline:**
```bash
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "test-service",
    "environment": "prod",
    "yamlContent": "payment:\n  timeout: 10000\ndebug: false"
  }'
```

**2. Submit Snapshot:**
```bash
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "test-service",
    "environment": "prod",
    "config": {
      "PAYMENT_TIMEOUT": "50000",
      "DEBUG": "true"
    }
  }'
```

**3. View in Dashboard:**
- Open http://localhost:3000
- Filter by "test-service"
- You should see drifts!

## 📦 Project Structure

```
EnvSafe/
├── config-monitor-server-js/    # Backend server (Express)
│   ├── src/
│   │   ├── index.js             # Entry point
│   │   ├── config.js            # Configuration
│   │   ├── database/            # Database setup
│   │   ├── routes/              # API routes
│   │   └── services/            # Business logic
│   └── package.json
│
├── config-monitor-agent-js/     # Agent library
│   ├── src/
│   │   ├── index.js             # Main export
│   │   ├── collector.js         # Config collection
│   │   ├── sender.js            # Snapshot sending
│   │   └── secretHandler.js     # Secret handling
│   └── package.json
│
├── config-monitor-ui/           # React dashboard
│   ├── src/
│   │   ├── App.tsx              # Main component
│   │   └── ...
│   └── package.json
│
├── drift-detection-engine/      # Standalone engine
│   ├── src/
│   │   ├── driftDetector.js     # Detection logic
│   │   └── driftDetector.test.js
│   └── package.json
│
├── example-app-js/              # Example app
│   ├── src/
│   │   └── index.js
│   └── package.json
│
└── scripts/                     # Helper scripts
    ├── test-ui.sh
    ├── quick-test.sh
    └── run-tests.sh
```

## 🔧 Configuration

### Server Configuration

Create `config-monitor-server-js/.env`:

```env
PORT=8080
DB_TYPE=sqlite
DB_PATH=./data/configmonitor.db
DRIFT_CHECK_INTERVAL_SECONDS=60
SECRET_PATTERNS=.*password.*,.*secret.*,.*key.*
```

### Agent Configuration

In your application:

```javascript
import { ConfigMonitorAgent } from 'config-monitor-agent';

const agent = new ConfigMonitorAgent({
    serverUrl: process.env.CONFIG_MONITOR_SERVER_URL || 'http://localhost:8080',
    applicationName: 'my-service',
    environment: process.env.NODE_ENV || 'prod',
    collectionIntervalMillis: 60000,  // 60 seconds
    initialDelayMillis: 10000,        // 10 seconds
    enabled: true
});

agent.start();
```

## 📝 Common Commands

### Development

```bash
# Start server (with auto-reload)
cd config-monitor-server-js
npm run dev  # If available, or use nodemon

# Start dashboard (with hot reload)
cd config-monitor-ui
npm run dev

# Run tests
cd drift-detection-engine
npm test
```

### Production

```bash
# Build dashboard
cd config-monitor-ui
npm run build

# Start server (production)
cd config-monitor-server-js
NODE_ENV=production npm start
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using port 8080
lsof -i :8080

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=8081
```

### Database Issues

```bash
# Check database file
ls -la config-monitor-server-js/data/

# Remove database (starts fresh)
rm config-monitor-server-js/data/configmonitor.db

# Restart server
cd config-monitor-server-js
npm start
```

### Module Not Found Errors

```bash
# Reinstall dependencies
cd config-monitor-server-js
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors in Dashboard

Check `config-monitor-ui/vite.config.ts`:

```javascript
server: {
    proxy: {
        '/api': {
            target: 'http://localhost:8080',
            changeOrigin: true
        }
    }
}
```

## ✅ Verification Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] All dependencies installed (`npm run install:all`)
- [ ] Server starts successfully (`npm run start:server`)
- [ ] Health endpoint works (`curl http://localhost:8080/health`)
- [ ] Dashboard starts successfully (`npm run start:ui`)
- [ ] Dashboard loads in browser (http://localhost:3000)
- [ ] Baseline registration works (via API)
- [ ] Snapshot submission works (via API)
- [ ] Drifts appear in dashboard
- [ ] Acknowledge/Resolve buttons work

## 🎯 Next Steps

1. **Read Documentation:**
   - [README-JAVASCRIPT.md](./README-JAVASCRIPT.md) - Complete guide
   - [QUICKSTART-JS.md](./QUICKSTART-JS.md) - Quick start
   - [TESTING.md](./TESTING.md) - Testing guide

2. **Integrate Agent:**
   - Add to your Node.js applications
   - Configure for your environment
   - Monitor configuration drift

3. **Customize:**
   - Add custom secret patterns
   - Configure rules
   - Set up PostgreSQL for production

4. **Deploy:**
   - Use Docker for containerization
   - Set up CI/CD integration
   - Add monitoring and alerts

## 📚 Additional Resources

- **Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Reference**: See [README-JS.md](./README-JS.md)
- **UI Testing**: [UI-TESTING.md](./UI-TESTING.md)
- **Testing Guide**: [TESTING.md](./TESTING.md)

## 🆘 Getting Help

1. Check [TESTING.md](./TESTING.md) for troubleshooting
2. Review server logs for errors
3. Check browser console (F12) for UI issues
4. Verify all services are running
5. Check network connectivity

---

**You're all set!** The Configuration Drift Monitor is now running in JavaScript. 🎉
