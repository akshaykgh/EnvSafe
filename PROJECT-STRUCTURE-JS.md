# Project Structure - JavaScript Implementation

Complete overview of the JavaScript/Node.js implementation.

## 📁 Directory Structure

```
EnvSafe/
│
├── 📦 config-monitor-server-js/      # Backend Server (Express.js)
│   ├── src/
│   │   ├── index.js                  # Server entry point
│   │   ├── config.js                 # Configuration management
│   │   ├── database/
│   │   │   └── init.js               # Database initialization (SQLite)
│   │   ├── routes/
│   │   │   ├── index.js              # Route setup
│   │   │   ├── baseline.js           # Baseline registration API
│   │   │   ├── snapshot.js           # Snapshot submission API
│   │   │   ├── drift.js              # Drift management API
│   │   │   └── ciCheck.js            # CI/CD check API
│   │   └── services/
│   │       ├── yamlParser.js         # YAML parsing
│   │       ├── secretHandler.js      # Secret detection & hashing
│   │       └── driftDetection.js     # Drift detection logic
│   ├── data/                         # SQLite database (created at runtime)
│   ├── package.json
│   └── .env                          # Environment variables (optional)
│
├── 📦 config-monitor-agent-js/       # Agent Library
│   ├── src/
│   │   ├── index.js                  # Main export (ConfigMonitorAgent class)
│   │   ├── collector.js              # Config collection from process.env
│   │   ├── sender.js                 # Snapshot sending with retry
│   │   └── secretHandler.js          # Secret detection & hashing
│   └── package.json
│
├── 📦 config-monitor-ui/             # React Dashboard
│   ├── src/
│   │   ├── main.tsx                  # React entry point
│   │   ├── App.tsx                   # Main dashboard component
│   │   ├── App.css                   # Component styles
│   │   └── index.css                 # Global styles
│   ├── index.html                    # HTML template
│   ├── vite.config.ts                # Vite configuration
│   ├── tsconfig.json                 # TypeScript config
│   └── package.json
│
├── 📦 drift-detection-engine/        # Standalone Detection Engine
│   ├── src/
│   │   ├── driftDetector.js          # Core detection logic
│   │   ├── driftDetector.test.js     # Comprehensive tests (19 tests)
│   │   └── testFramework.js         # Simple test framework
│   └── package.json
│
├── 📦 example-app-js/                # Example Node.js Application
│   ├── src/
│   │   └── index.js                  # Express app with agent integration
│   ├── config.example.js             # Example config file
│   ├── package.json
│   └── README.md
│
├── 📜 Documentation
│   ├── README.md                     # Main README (updated for JS)
│   ├── README-JAVASCRIPT.md          # Complete JS guide
│   ├── README-JS.md                  # Original JS guide
│   ├── QUICKSTART-JS.md              # Quick start guide
│   ├── SETUP-JS.md                   # Setup instructions
│   ├── GETTING-STARTED.md            # Getting started guide
│   ├── TESTING.md                    # Testing guide
│   ├── UI-TESTING.md                 # UI testing guide
│   └── ARCHITECTURE.md               # Architecture documentation
│
├── 🛠️ Scripts
│   ├── test-ui.sh                    # UI test helper
│   ├── quick-test.sh                 # Quick smoke test
│   ├── run-tests.sh                  # Full test suite
│   ├── register-baseline.sh          # Baseline registration helper
│   └── check-drifts.sh               # CI check helper
│
├── 📊 Test Data
│   └── test-data/
│       ├── baseline.json              # Example baseline
│       ├── snapshot-override.json     # Snapshot with override
│       └── snapshot-unsafe.json       # Snapshot with unsafe config
│
└── 📄 Root Files
    ├── package.json                   # Root package.json (npm scripts)
    ├── .nvmrc                         # Node version (18)
    ├── .node-version                  # Node version (18)
    └── .gitignore                     # Git ignore rules
```

## 🔄 Data Flow

```
┌─────────────────┐
│  Node.js App    │
│  (Your App)     │
└────────┬────────┘
         │
         │ ConfigMonitorAgent
         │ collects config
         ▼
┌─────────────────┐
│  Agent Library  │
│  - Collector    │
│  - SecretHandler│
│  - Sender       │
└────────┬────────┘
         │
         │ HTTP POST
         │ /api/v1/config-snapshots
         ▼
┌─────────────────┐
│  Server         │
│  - Routes       │
│  - Services     │
│  - Database     │
└────────┬────────┘
         │
         │ Detects drift
         │ Stores in DB
         ▼
┌─────────────────┐
│  Database       │
│  (SQLite)       │
│  - Applications │
│  - Snapshots    │
│  - Drifts       │
│  - Rules        │
└────────┬────────┘
         │
         │ REST API
         ▼
┌─────────────────┐
│  Dashboard      │
│  (React)        │
│  - View drifts  │
│  - Manage       │
└─────────────────┘
```

## 📦 Component Details

### 1. Server (`config-monitor-server-js/`)

**Purpose**: Central backend service

**Key Files**:
- `src/index.js` - Express server setup
- `src/database/init.js` - SQLite initialization
- `src/routes/*.js` - REST API endpoints
- `src/services/*.js` - Business logic

**Dependencies**:
- `express` - Web framework
- `better-sqlite3` - SQLite database
- `js-yaml` - YAML parsing
- `cors` - CORS middleware

### 2. Agent (`config-monitor-agent-js/`)

**Purpose**: Config collection library

**Key Files**:
- `src/index.js` - Main ConfigMonitorAgent class
- `src/collector.js` - Collects from process.env
- `src/sender.js` - Sends snapshots with retry
- `src/secretHandler.js` - Secret detection

**Dependencies**:
- `axios` - HTTP client
- `crypto` - Built-in Node.js module

### 3. Dashboard (`config-monitor-ui/`)

**Purpose**: Web UI for viewing drifts

**Key Files**:
- `src/App.tsx` - Main component
- `src/main.tsx` - React entry point

**Dependencies**:
- `react` - UI library
- `axios` - HTTP client
- `vite` - Build tool

### 4. Detection Engine (`drift-detection-engine/`)

**Purpose**: Standalone drift detection

**Key Files**:
- `src/driftDetector.js` - Detection logic
- `src/driftDetector.test.js` - Tests

**Dependencies**: None (pure JavaScript)

### 5. Example App (`example-app-js/`)

**Purpose**: Demonstrates agent integration

**Key Files**:
- `src/index.js` - Express app with agent

**Dependencies**:
- `express` - Web framework
- `config-monitor-agent` - Agent library

## 🔌 Integration Points

### Agent → Server

```javascript
// Agent sends snapshots
POST /api/v1/config-snapshots
{
  "applicationName": "my-service",
  "environment": "prod",
  "config": { ... }
}
```

### Dashboard → Server

```javascript
// Dashboard fetches drifts
GET /api/v1/drifts?applicationName=my-service&status=ACTIVE

// Dashboard acknowledges drift
POST /api/v1/drifts/{id}/acknowledge

// Dashboard resolves drift
POST /api/v1/drifts/{id}/resolve
```

### CI/CD → Server

```javascript
// CI check
GET /api/v1/ci-check?applicationName=my-service
// Returns: { status: "pass" | "fail", ... }
```

## 🗄️ Database Schema

**SQLite Database** (`data/configmonitor.db`):

- `applications` - Registered applications
- `config_snapshots` - Runtime config snapshots
- `config_drifts` - Detected drifts
- `config_rules` - Configuration rules

## 📝 Key Configuration Files

### Server Config (`config-monitor-server-js/.env`)

```env
PORT=8080
DB_TYPE=sqlite
DB_PATH=./data/configmonitor.db
```

### Agent Config (in your app)

```javascript
{
  serverUrl: 'http://localhost:8080',
  applicationName: 'my-service',
  environment: 'prod',
  collectionIntervalMillis: 60000
}
```

### Dashboard Config (`config-monitor-ui/vite.config.ts`)

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080'
    }
  }
}
```

## 🚀 Running the System

### Development

```bash
# Terminal 1: Server
cd config-monitor-server-js && npm start

# Terminal 2: Dashboard
cd config-monitor-ui && npm run dev

# Terminal 3: Example App
cd example-app-js && npm start
```

### Production

```bash
# Build dashboard
cd config-monitor-ui && npm run build

# Start server (with PM2 or similar)
cd config-monitor-server-js && NODE_ENV=production npm start
```

## 📊 File Count Summary

- **Server**: ~10 JavaScript files
- **Agent**: ~4 JavaScript files
- **Dashboard**: ~4 TypeScript/React files
- **Engine**: ~3 JavaScript files
- **Example**: ~1 JavaScript file
- **Total**: ~22 source files (all JavaScript/TypeScript)

## ✅ All JavaScript!

Every component is now written in JavaScript/TypeScript:
- ✅ Server: Node.js + Express
- ✅ Agent: Node.js library
- ✅ Dashboard: React + TypeScript
- ✅ Engine: Pure JavaScript
- ✅ Example: Node.js + Express

No Java dependencies required!
