# Configuration Drift Monitor - JavaScript/Node.js Implementation

A production-ready MVP for detecting and tracking configuration drift between declared Git-based configuration and actual runtime configuration in Node.js applications.

## 🎯 Overview

This is a **complete JavaScript/Node.js implementation** of the Configuration Drift Monitor. All components are written in JavaScript/TypeScript, making it easy to deploy and maintain.

## 📦 Components

### 1. Config Monitor Server (`config-monitor-server-js/`)
**Technology**: Node.js + Express + SQLite

- REST API for receiving config snapshots
- YAML baseline parsing
- Drift detection engine
- Secret hashing
- SQLite database (can be swapped for PostgreSQL)

### 2. Config Monitor Agent (`config-monitor-agent-js/`)
**Technology**: Node.js library

- Collects configuration from `process.env`
- Detects and hashes secrets
- Sends periodic snapshots to server
- Retry logic with exponential backoff

### 3. Config Monitor Dashboard (`config-monitor-ui/`)
**Technology**: React + TypeScript

- Modern web UI for viewing drifts
- Filter by application and status
- Acknowledge/resolve drifts
- Auto-refresh every 30 seconds

### 4. Drift Detection Engine (`drift-detection-engine/`)
**Technology**: Pure JavaScript

- Standalone drift detection logic
- 19 comprehensive unit tests
- Can be used independently

### 5. Example Application (`example-app-js/`)
**Technology**: Node.js + Express

- Demonstrates agent integration
- Shows drift scenarios

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- (Optional) PostgreSQL for production

### Step 1: Install Dependencies

```bash
# Server
cd config-monitor-server-js
npm install

# Agent (if using as package)
cd ../config-monitor-agent-js
npm install

# Dashboard
cd ../config-monitor-ui
npm install

# Example app
cd ../example-app-js
npm install
```

### Step 2: Start the Server

```bash
cd config-monitor-server-js
npm start
```

Server runs on `http://localhost:8080`

### Step 3: Start the Dashboard

```bash
cd config-monitor-ui
npm run dev
```

Dashboard runs on `http://localhost:3000`

### Step 4: Register Baseline

```bash
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "yamlContent": "payment:\n  timeout: 10000\ndebug: false"
  }'
```

### Step 5: Use Agent in Your App

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

## 📖 Detailed Documentation

- **[README-JS.md](./README-JS.md)** - Complete JavaScript implementation guide
- **[QUICKSTART.md](./QUICKSTART.md)** - Step-by-step setup
- **[TESTING.md](./TESTING.md)** - Testing guide
- **[UI-TESTING.md](./UI-TESTING.md)** - Dashboard testing guide

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│   Node.js Application           │
│                                 │
│  ┌───────────────────────────┐  │
│  │   ConfigMonitorAgent      │  │
│  │   - Collects from env     │  │
│  │   - Hashes secrets        │  │
│  │   - Sends to server       │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
              │
              │ HTTP POST
              ▼
┌─────────────────────────────────┐
│  Config Monitor Server (Node.js) │
│  - Express.js backend           │
│  - SQLite database              │
│  - Drift detection              │
└─────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  React Dashboard                │
│  - View drifts                  │
│  - Manage drifts                │
└─────────────────────────────────┘
```

## 🔧 Configuration

### Server Configuration

Create `.env` file in `config-monitor-server-js/`:

```env
PORT=8080
DB_TYPE=sqlite
DB_PATH=./data/configmonitor.db
DRIFT_CHECK_INTERVAL_SECONDS=60
SECRET_PATTERNS=.*password.*,.*secret.*
```

### Agent Configuration

```javascript
const agent = new ConfigMonitorAgent({
    serverUrl: 'http://localhost:8080',
    applicationName: 'my-service',
    environment: 'prod',
    collectionIntervalMillis: 60000,
    initialDelayMillis: 10000,
    enabled: true,
    secretPatterns: [
        '.*password.*',
        '.*secret.*',
        '.*api[_-]?key.*'
    ]
});
```

## 📊 API Endpoints

### Register Baseline
```http
POST /api/v1/baselines
Content-Type: application/json

{
  "applicationName": "payment-service",
  "environment": "prod",
  "yamlContent": "payment:\n  timeout: 10000"
}
```

### Submit Config Snapshot
```http
POST /api/v1/config-snapshots
Content-Type: application/json

{
  "applicationName": "payment-service",
  "environment": "prod",
  "config": {
    "PAYMENT_TIMEOUT": "50000",
    "DATABASE_PASSWORD": "HASH:xxxx"
  }
}
```

### Get Drifts
```http
GET /api/v1/drifts?applicationName=payment-service&status=ACTIVE
```

### CI/CD Check
```http
GET /api/v1/ci-check?applicationName=payment-service
```

## 🧪 Testing

### Run Unit Tests

```bash
# Drift detection engine
cd drift-detection-engine
npm test
```

### Run Integration Tests

```bash
# Quick smoke test
./scripts/quick-test.sh

# Full test suite
./scripts/run-tests.sh

# UI test helper
./scripts/test-ui.sh
```

## 📁 Project Structure

```
EnvSafe/
├── config-monitor-server-js/     # Node.js backend
│   ├── src/
│   │   ├── index.js              # Server entry point
│   │   ├── config.js             # Configuration
│   │   ├── database/             # Database setup
│   │   ├── routes/               # API routes
│   │   └── services/             # Business logic
│   └── package.json
├── config-monitor-agent-js/      # Node.js agent library
│   ├── src/
│   │   ├── index.js              # Main export
│   │   ├── collector.js          # Config collection
│   │   ├── sender.js             # Snapshot sending
│   │   └── secretHandler.js      # Secret handling
│   └── package.json
├── config-monitor-ui/            # React dashboard
│   ├── src/
│   │   ├── App.tsx               # Main component
│   │   └── ...
│   └── package.json
├── drift-detection-engine/      # Standalone engine
│   ├── src/
│   │   ├── driftDetector.js      # Detection logic
│   │   └── driftDetector.test.js # Tests
│   └── package.json
├── example-app-js/              # Example Node.js app
│   ├── src/
│   │   └── index.js
│   └── package.json
└── scripts/                     # Helper scripts
```

## 🔐 Security

- Secrets are never stored in plaintext
- SHA-256 hashing for secret values
- Only hash prefix sent to server
- Configurable secret detection patterns

## 🚢 Production Deployment

### Using PostgreSQL

1. Install PostgreSQL driver:
```bash
cd config-monitor-server-js
npm install pg
```

2. Update database configuration:
```javascript
// src/database/init.js
// Replace SQLite with PostgreSQL connection
```

3. Set environment variables:
```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=configmonitor
DB_USER=postgres
DB_PASSWORD=password
```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
```

## 📈 Monitoring

### Health Check

```bash
curl http://localhost:8080/health
```

### Statistics

The agent provides statistics:

```javascript
const stats = agent.getStats();
console.log(stats);
// {
//   successCount: 10,
//   failureCount: 0,
//   lastSuccessTime: '2024-01-01T12:00:00Z',
//   lastFailureTime: null
// }
```

## 🐛 Troubleshooting

### Server Not Starting

- Check port 8080 is available
- Verify database directory is writable
- Check Node.js version (18+)

### Agent Not Sending Snapshots

- Verify `serverUrl` is correct
- Check network connectivity
- Review console logs for errors
- Ensure `applicationName` is set

### Dashboard Not Loading

- Verify server is running
- Check CORS configuration
- Review browser console for errors
- Verify proxy settings in `vite.config.ts`

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional rule types
- Better secret detection
- Performance optimizations
- UI improvements
- Documentation
