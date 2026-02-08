# Configuration Drift Monitor - JavaScript/Node.js Implementation

A production-ready MVP for detecting and tracking configuration drift between declared Git-based configuration and actual runtime configuration in Node.js applications.

## Architecture

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
└─────────────────────────────────┘
```

## Components

### 1. Config Monitor Server (`config-monitor-server-js/`)

**Technology**: Node.js + Express + SQLite

**Features**:
- REST API for receiving config snapshots
- YAML baseline parsing
- Drift detection engine
- Secret hashing
- SQLite database (can be swapped for PostgreSQL)

**Start Server**:
```bash
cd config-monitor-server-js
npm install
npm start
```

### 2. Config Monitor Agent (`config-monitor-agent-js/`)

**Technology**: Node.js library

**Features**:
- Collects configuration from `process.env`
- Detects and hashes secrets
- Sends periodic snapshots to server
- Retry logic with exponential backoff
- Source tracking (environment variables)

**Usage**:
```javascript
import { ConfigMonitorAgent } from 'config-monitor-agent';

const agent = new ConfigMonitorAgent({
    serverUrl: 'http://localhost:8080',
    applicationName: 'my-service',
    environment: 'prod',
    collectionIntervalMillis: 60000
});

agent.start();
```

### 3. Example Application (`example-app-js/`)

Demonstrates agent integration in a Node.js/Express app.

## Quick Start

### 1. Install Dependencies

```bash
# Server
cd config-monitor-server-js
npm install

# Agent (if using as package)
cd ../config-monitor-agent-js
npm install

# Example app
cd ../example-app-js
npm install
```

### 2. Start the Server

```bash
cd config-monitor-server-js
npm start
```

Server runs on `http://localhost:8080`

### 3. Register Baseline

```bash
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "yamlContent": "payment:\n  timeout: 10000\ndebug: false"
  }'
```

### 4. Integrate Agent in Your App

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

### 5. View Drifts

- **Dashboard**: http://localhost:3000 (if running)
- **API**: `GET http://localhost:8080/api/v1/drifts`

## API Reference

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

### Submit Config Snapshot (Agent)
```http
POST /api/v1/config-snapshots
Content-Type: application/json

{
  "applicationName": "payment-service",
  "environment": "prod",
  "config": {
    "PAYMENT_TIMEOUT": "50000",
    "DATABASE_PASSWORD": "HASH:xxxx"
  },
  "sourceStats": {
    "ENVIRONMENT_VARIABLE": 10
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

# Response (pass):
{
  "status": "pass",
  "message": "No unresolved configuration drifts"
}

# Response (fail):
{
  "status": "fail",
  "message": "Unresolved configuration drifts detected",
  "driftCount": 2
}
```

## Configuration

### Agent Options

```javascript
{
    serverUrl: 'http://localhost:8080',        // Required
    applicationName: 'my-service',              // Required
    environment: 'prod',                         // Default: 'default'
    collectionIntervalMillis: 60000,            // Default: 60000
    initialDelayMillis: 10000,                 // Default: 10000
    enabled: true,                              // Default: true
    secretPatterns: [                           // Optional
        '.*password.*',
        '.*secret.*'
    ]
}
```

### Server Environment Variables

```bash
PORT=8080                                    # Server port
DB_TYPE=sqlite                               # Database type
DB_PATH=./data/configmonitor.db             # SQLite path
DRIFT_CHECK_INTERVAL_SECONDS=60             # Check interval
SECRET_PATTERNS=.*password.*,.*secret.*      # Comma-separated patterns
```

## Agent Configuration

The agent collects configuration from `process.env` (environment variables).

**Note**: To collect from config files in Node.js, you can:
1. Use a config library (node-config, dotenv, etc.)
2. Extend `ConfigCollector.collectFromSource()` to read your config files
3. Merge with environment variables

### Example: Integrating with dotenv

```javascript
import dotenv from 'dotenv';
import { ConfigMonitorAgent } from 'config-monitor-agent';

// Load .env file
dotenv.config();

const agent = new ConfigMonitorAgent({
    serverUrl: 'http://localhost:8080',
    applicationName: 'my-service',
    environment: 'prod'
});

agent.start();
```

### Example: Integrating with node-config

```javascript
import config from 'config';
import { ConfigCollector } from 'config-monitor-agent/collector';
import { ConfigSnapshotSender } from 'config-monitor-agent/sender';

const collector = new ConfigCollector();
const configFromFile = collector.collectFromSource(config, 'CONFIG_FILE');
const configFromEnv = collector.collectRuntimeConfig();
const merged = collector.mergeConfigSources(configFromEnv, configFromFile);

const sender = new ConfigSnapshotSender(collector, {
    serverUrl: 'http://localhost:8080',
    applicationName: 'my-service',
    environment: 'prod'
});

// Send merged config
await sender.send();
```

## Database

The server uses SQLite by default (stored in `./data/configmonitor.db`).

To use PostgreSQL:

1. Install PostgreSQL driver: `npm install pg`
2. Update `database/init.js` to use PostgreSQL
3. Set `DB_TYPE=postgres` and connection string

## Production Considerations

1. **HTTPS**: Use HTTPS for `serverUrl` in production
2. **Database**: Consider PostgreSQL for production
3. **Authentication**: Add API keys or OAuth2
4. **Monitoring**: Add metrics and logging
5. **Secrets**: Verify secret patterns match your naming

## Troubleshooting

### Agent not sending snapshots
- Check `enabled: true` in options
- Verify `applicationName` is set
- Check server URL is reachable
- Review console logs

### Server not starting
- Check port 8080 is available
- Verify database directory is writable
- Check Node.js version (18+)

### No drifts detected
- Ensure baseline is registered
- Wait for agent to send snapshot
- Verify runtime config differs from baseline

## File Structure

```
EnvSafe/
├── config-monitor-server-js/     # Node.js backend
│   ├── src/
│   │   ├── index.js
│   │   ├── config.js
│   │   ├── database/
│   │   ├── routes/
│   │   └── services/
│   └── package.json
├── config-monitor-agent-js/      # Node.js agent library
│   ├── src/
│   │   ├── index.js
│   │   ├── collector.js
│   │   ├── sender.js
│   │   └── secretHandler.js
│   └── package.json
├── example-app-js/                # Example Node.js app
│   ├── src/
│   │   └── index.js
│   └── package.json
└── config-monitor-ui/            # React dashboard (unchanged)
```

## License

MIT
