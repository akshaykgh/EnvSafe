# Configuration Drift Monitor

A production-ready MVP for detecting and tracking configuration drift between declared Git-based configuration and actual runtime configuration in Node.js applications.

**Built with JavaScript/Node.js** - Pure Node.js implementation for easy deployment and maintenance.

## Overview

Configuration Drift Monitor is a full-stack observability tool that detects discrepancies between what's declared in Git (configuration files) and what's actually running in production (environment variables, runtime overrides). It helps DevOps teams maintain configuration compliance and prevent forgotten emergency overrides from becoming permanent.

## Key Features

- **Runtime Config Collection**: Agent extracts effective configuration from environment variables
- **Baseline Comparison**: Compares runtime config against Git-declared baseline
- **Rule-Based Detection**: Enforces rules (required, allowedInProd, min/max, changePolicy)
- **Drift Tracking**: Records drift with severity, type, and timeline
- **CI/CD Integration**: Fails CI builds when unresolved drifts exist
- **Security**: Never stores secrets - only hashes and presence
- **Web Dashboard**: React-based UI for visualizing and managing drifts

## Architecture

The system consists of four main components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Node.js Application                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Config Monitor Agent (Library)                │   │
│  │  - Collects runtime config from process.env         │   │
│  │  - Hashes secrets (doesn't expose values)          │   │
│  │  - Sends snapshots to server periodically           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP POST /api/v1/config-snapshots
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Config Monitor Server (Node.js/Express)        │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Config Baseline │  │  Drift Detection │               │
│  │  - Parse YAML    │  │  - Compare       │               │
│  │  - Store rules   │  │  - Apply rules   │               │
│  └──────────────────┘  └──────────────────┘               │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Drift Storage   │  │  Alert Engine    │               │
│  │  - SQLite/Postgres│  │  - Track status  │               │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Config Monitor Dashboard (React)                 │
│  - View active drifts                                        │
│  - Acknowledge/resolve drifts                                │
│  - View config baselines                                     │
└─────────────────────────────────────────────────────────────┘
```

### Components

1. **Config Monitor Server** (`config-monitor-server-js/`)
   - Node.js + Express backend service
   - SQLite database (PostgreSQL optional)
   - REST APIs for agents and dashboard
   - YAML parsing and drift detection engine

2. **Config Monitor Agent** (`config-monitor-agent-js/`)
   - Lightweight Node.js library
   - Collects runtime configuration from `process.env`
   - Automatic secret detection and hashing
   - Retry logic with exponential backoff

3. **Config Monitor Dashboard** (`config-monitor-ui/`)
   - React 18 + TypeScript
   - Real-time drift visualization
   - Filter by application/status
   - Side-by-side config comparison

4. **Drift Detection Engine** (`drift-detection-engine/`)
   - Standalone detection logic
   - 19+ comprehensive unit tests
   - Can be used independently

5. **Example Application** (`example-app-js/`)
   - Demonstrates agent integration
   - Shows drift scenarios

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL (optional, SQLite used by default)

### Installation

```bash
# Clone the repository
git clone https://github.com/akshaykgh/EnvSafe.git
cd EnvSafe

# Install all dependencies
npm run install:all
```

### Running the System

**Terminal 1 - Start the Server:**
```bash
npm run start:server
```

Server runs on `http://localhost:8080`

**Terminal 2 - Start the Dashboard:**
```bash
npm run start:ui
```

Dashboard runs on `http://localhost:3000`

**Terminal 3 - Run Example App (optional):**
```bash
npm run start:example
```

## Detailed Setup

### 1. Start the Config Monitor Server

```bash
cd config-monitor-server-js
npm install
npm start
```

The server will:
- Initialize SQLite database (or connect to PostgreSQL if configured)
- Set up default configuration rules
- Start listening on port 8080

**Environment Variables (optional):**
```bash
PORT=8080                                    # Server port
DB_TYPE=sqlite                               # Database type (sqlite/postgres)
DB_PATH=./data/configmonitor.db             # SQLite path
DRIFT_CHECK_INTERVAL_SECONDS=60             # Check interval
SECRET_PATTERNS=.*password.*,.*secret.*      # Comma-separated patterns
```

### 2. Register a Baseline Configuration

Register your Git-declared configuration as the baseline:

```bash
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "yamlContent": "payment:\n  timeout: 10000\n  retry-count: 3\ndatabase:\n  url: postgresql://prod-db:5432/payments\ndebug: false"
  }'
```

Or use the helper script:
```bash
./scripts/register-baseline.sh payment-service prod example-app-js/config.example.js
```

### 3. Integrate Agent into Your Node.js App

**Install the agent:**
```bash
npm install config-monitor-agent
```

**Use in your application:**
```javascript
import { ConfigMonitorAgent } from 'config-monitor-agent';

const agent = new ConfigMonitorAgent({
    serverUrl: 'http://localhost:8080',
    applicationName: 'my-service',
    environment: process.env.NODE_ENV || 'prod',
    collectionIntervalMillis: 60000,  // Collect every 60 seconds
    secretPatterns: [                 // Optional: custom patterns
        '.*password.*',
        '.*secret.*',
        '.*key.*',
        '.*token.*'
    ]
});

agent.start();

// Your application code...
```

**Agent Options:**
- `serverUrl` (required): URL of the config monitor server
- `applicationName` (required): Name of your application
- `environment` (default: 'default'): Environment name (prod, staging, etc.)
- `collectionIntervalMillis` (default: 60000): How often to collect config (milliseconds)
- `initialDelayMillis` (default: 10000): Delay before first collection
- `enabled` (default: true): Enable/disable the agent
- `secretPatterns` (optional): Custom regex patterns for secret detection

### 4. View Drifts

- **Dashboard**: Open http://localhost:3000
- **API**: `GET http://localhost:8080/api/v1/drifts`

## Testing

### Quick Test (1 minute)

```bash
# Start server first, then:
./scripts/quick-test.sh
```

### Full Test Suite (5 minutes)

```bash
./scripts/run-tests.sh
```

This will:
1. Register a test baseline
2. Submit test snapshots
3. Verify drift detection
4. Test CI/CD check endpoint

### Unit Tests

```bash
cd drift-detection-engine
npm test
```

Runs 19+ unit tests covering:
- Missing configuration detection
- Runtime override detection
- Rule violation detection
- Edge cases and production scenarios

### Manual Testing

**Test Scenario 1: Runtime Override**
```bash
# 1. Register baseline with payment.timeout: 10000
# 2. Set environment variable
export PAYMENT_TIMEOUT=50000
# 3. Start your app with agent
# 4. Check dashboard - should show OVERRIDE drift
```

**Test Scenario 2: Debug Mode in Production**
```bash
# 1. Register baseline with debug: false
# 2. Set environment variable
export DEBUG=true
# 3. Start your app with agent
# 4. Check dashboard - should show RULE_VIOLATION drift (CRITICAL)
```

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

**Response:**
```json
{
  "status": "success",
  "message": "Baseline registered successfully"
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
    "payment.timeout": 50000,
    "payment.retry-count": 3,
    "debug": false
  }
}
```

### Get Drifts

```http
GET /api/v1/drifts?applicationName=payment-service&status=ACTIVE
```

**Query Parameters:**
- `applicationName` (optional): Filter by application
- `status` (optional): Filter by status (ACTIVE, ACKNOWLEDGED, RESOLVED)

**Response:**
```json
[
  {
    "id": "uuid",
    "applicationName": "payment-service",
    "configKey": "payment.timeout",
    "expectedValue": "10000",
    "actualValue": "50000",
    "driftType": "OVERRIDE",
    "severity": "MEDIUM",
    "firstDetectedAt": "2024-01-01T00:00:00Z",
    "status": "ACTIVE",
    "description": "Runtime value differs from baseline"
  }
]
```

### Get Config Comparison

```http
GET /api/v1/drifts/config-comparison/:applicationName
```

Returns baseline and latest runtime config side-by-side.

### Acknowledge Drift

```http
POST /api/v1/drifts/{id}/acknowledge
```

Marks a drift as acknowledged (temporarily accepted).

### Resolve Drift

```http
POST /api/v1/drifts/{id}/resolve
```

Marks a drift as resolved (fixed or accepted permanently).

### CI/CD Check

```http
GET /api/v1/ci-check?applicationName=payment-service
```

**Response (pass):**
```json
{
  "status": "pass",
  "message": "No unresolved configuration drifts"
}
```

**Response (fail):**
```json
{
  "status": "fail",
  "message": "Unresolved configuration drifts detected",
  "driftCount": 2,
  "drifts": [...]
}
```

**Usage in CI/CD:**
```bash
#!/bin/bash
RESPONSE=$(curl -s "http://localhost:8080/api/v1/ci-check?applicationName=my-service")
STATUS=$(echo $RESPONSE | jq -r '.status')

if [ "$STATUS" = "fail" ]; then
    echo "Configuration drift detected - build failed"
    exit 1
fi

echo "No configuration drift - build passed"
```

## Configuration Rules

Rules define constraints on configuration values. Default rules are initialized automatically, but you can create custom rules:

```javascript
const rule = {
    configKey: "payment.timeout",
    required: true,                    // Must be present
    allowedInProd: true,               // Allowed in production
    minValue: 1000,                    // Minimum value
    maxValue: 30000,                   // Maximum value
    changePolicy: "CI_ONLY",           // Only changes via CI allowed
    environment: "prod"                 // Environment this rule applies to
};
```

### Rule Properties

- **required** (boolean): Config key must be present
- **allowedInProd** (boolean): Whether config is allowed in production environment
- **minValue** (number): Minimum numeric value
- **maxValue** (number): Maximum numeric value
- **changePolicy** (string):
  - `CI_ONLY`: Changes only allowed via Git/CI
  - `RUNTIME_ALLOWED`: Runtime overrides are acceptable
- **environment** (string): Environment this rule applies to (`*` for all)

### Default Rules

The system initializes default rules for common scenarios:
- `debug`: Not allowed in production
- `payment.timeout`: Min/max constraints, CI_ONLY policy
- `database.*`: Required in production

## Drift Types

1. **MISSING**: Required configuration key is absent
   - Severity: HIGH
   - Example: `database.password` is required but not set

2. **OVERRIDE**: Runtime value differs from baseline (and `changePolicy=CI_ONLY`)
   - Severity: MEDIUM
   - Example: Baseline has `payment.timeout: 10000`, runtime has `50000`

3. **RULE_VIOLATION**: Value violates configured rules
   - Severity: CRITICAL (for production violations)
   - Example: `debug=true` in production environment

### Severity Levels

- **LOW**: Informational drift
- **MEDIUM**: Configuration override that should be reviewed
- **HIGH**: Missing required configuration
- **CRITICAL**: Production safety violation (e.g., debug mode enabled)

## Security Considerations

### Secret Handling

- **Never stores plaintext secrets**: Only SHA-256 hashes are stored
- **Pattern-based detection**: Automatically detects sensitive keys:
  - `.*password.*`
  - `.*secret.*`
  - `.*key.*`
  - `.*token.*`
  - `.*credential.*`
  - `.*api[_-]?key.*`
  - `.*auth[_-]?token.*`

### Production Recommendations

1. **HTTPS**: Use HTTPS for all agent-server communications
2. **Authentication**: Add OAuth2/JWT authentication for API access
3. **Network Security**: Run agent and server in private networks
4. **Database Security**: Use PostgreSQL with proper access controls
5. **Secret Patterns**: Configure custom patterns for your organization's naming conventions

## Project Structure

```
EnvSafe/
├── config-monitor-server-js/     # Backend server
│   ├── src/
│   │   ├── index.js              # Server entry point
│   │   ├── config.js             # Configuration
│   │   ├── database/
│   │   │   └── init.js           # Database initialization
│   │   ├── routes/               # API routes
│   │   │   ├── baseline.js       # Baseline registration
│   │   │   ├── snapshot.js       # Config snapshot submission
│   │   │   ├── drift.js          # Drift queries
│   │   │   └── ciCheck.js        # CI/CD check endpoint
│   │   └── services/             # Business logic
│   │       ├── driftDetection.js # Drift detection engine
│   │       ├── yamlParser.js     # YAML parsing
│   │       └── secretHandler.js # Secret hashing
│   └── package.json
│
├── config-monitor-agent-js/      # Agent library
│   ├── src/
│   │   ├── index.js              # Main export
│   │   ├── collector.js          # Config collection
│   │   ├── secretHandler.js      # Secret detection/hashing
│   │   └── sender.js             # HTTP sender with retry
│   └── package.json
│
├── config-monitor-ui/            # React dashboard
│   ├── src/
│   │   ├── App.tsx               # Main component
│   │   ├── main.tsx              # React entry point
│   │   └── index.css             # Styles
│   └── package.json
│
├── drift-detection-engine/       # Standalone detection engine
│   ├── src/
│   │   ├── driftDetector.js      # Detection logic
│   │   ├── driftDetector.test.js # Unit tests
│   │   └── testFramework.js      # Test utilities
│   └── package.json
│
├── example-app-js/               # Example application
│   ├── src/
│   │   └── index.js              # Example app with agent
│   └── package.json
│
├── scripts/                      # Helper scripts
│   ├── quick-test.sh             # Quick smoke test
│   ├── run-tests.sh              # Full test suite
│   ├── register-baseline.sh      # Baseline registration helper
│   └── check-drifts.sh           # CI check helper
│
├── test-data/                    # Test data files
│   ├── baseline.json
│   ├── snapshot-override.json
│   └── snapshot-unsafe.json
│
└── README.md                     # This file
```

## Troubleshooting

### Server Not Starting

**Port already in use:**
```bash
# Check what's using port 8080
lsof -i :8080

# Kill the process or change port in config
PORT=8081 npm start
```

**Database errors:**
```bash
# SQLite: Check file permissions
ls -la config-monitor-server-js/data/

# PostgreSQL: Check connection string
# Set DB_TYPE=postgres and DB_URL in environment
```

### Agent Not Sending Snapshots

**Check agent logs:**
```javascript
// Agent logs to console
// Look for: "Config monitor agent started for..."
// Or: "Failed to send config snapshot: ..."
```

**Verify server is accessible:**
```bash
curl http://localhost:8080/health
```

**Check network/firewall:**
- Ensure agent can reach server URL
- Check CORS settings if using browser-based agent

### No Drifts Detected

**Verify baseline is registered:**
```bash
curl http://localhost:8080/api/v1/baselines
```

**Check agent is collecting config:**
- Agent should log collection events
- Verify environment variables are set

**Wait for collection interval:**
- Default is 60 seconds
- Check `collectionIntervalMillis` setting

### Dashboard Not Loading

**Check UI server:**
```bash
# Should be running on port 3000
curl http://localhost:3000
```

**Check API connectivity:**
- Open browser console (F12)
- Look for API errors
- Verify CORS is configured on server

## Production Deployment

### Database Setup

**PostgreSQL (recommended for production):**
```bash
# Set environment variables
export DB_TYPE=postgres
export DB_URL=postgresql://user:password@host:5432/configmonitor
```

**SQLite (development only):**
- Works out of the box
- Not recommended for production

### Environment Configuration

Create `.env` file or set environment variables:

```bash
# Server
PORT=8080
DB_TYPE=postgres
DB_URL=postgresql://user:pass@host:5432/db

# Agent (in your application)
CONFIG_MONITOR_SERVER_URL=https://monitor.example.com
CONFIG_MONITOR_APP_NAME=my-service
CONFIG_MONITOR_ENVIRONMENT=prod
```

### Docker Deployment (Future)

```dockerfile
# Example Dockerfile structure
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
```

## Example Scenarios

### Scenario 1: Payment Timeout Override

**Baseline (Git):**
```yaml
payment:
  timeout: 10000
```

**Runtime:**
```bash
export PAYMENT_TIMEOUT=50000
```

**Result**: Drift detected (OVERRIDE type, MEDIUM severity)

### Scenario 2: Debug Mode in Production

**Baseline (Git):**
```yaml
debug: false
```

**Runtime:**
```bash
export DEBUG=true
```

**Result**: Critical drift detected (RULE_VIOLATION, CRITICAL severity - not allowed in prod)

### Scenario 3: Missing Required Config

**Baseline (Git):**
```yaml
database:
  url: postgresql://localhost:5432/db
  username: admin
  password: secret
```

**Runtime:**
```bash
export DATABASE_URL=postgresql://localhost:5432/db
export DATABASE_USERNAME=admin
# Missing DATABASE_PASSWORD
```

**Result**: Drift detected (MISSING type, HIGH severity)

## Development

### Installing Dependencies

```bash
# Install all dependencies
npm run install:all

# Or individually
npm run install:server
npm run install:agent
npm run install:ui
npm run install:example
```

### Running Tests

```bash
# Unit tests
npm run test:engine

# Integration tests
./scripts/run-tests.sh

# Quick test
./scripts/quick-test.sh
```

### Code Structure

- **ES Modules**: All code uses ES6 import/export
- **TypeScript**: UI components use TypeScript
- **Error Handling**: Comprehensive error handling throughout
- **Logging**: Console logging for development, structured logging recommended for production

## Limitations (MVP)

- No RBAC (all users see all drifts)
- Basic rule system (no complex expressions)
- No config deployment capabilities
- No secret management integration
- Single-server architecture (no clustering)
- No historical trend analysis
- Basic UI (no advanced filtering/search)

## Future Enhancements

- Multi-environment support with environment-specific rules
- Config diff visualization
- Historical drift trends and analytics
- Integration with secret managers (Vault, AWS Secrets Manager)
- Slack/email notifications
- Config rollback recommendations
- Advanced rule engine with custom validators
- RBAC and multi-tenancy support
- Horizontal scaling and clustering
- GraphQL API option
- Real-time WebSocket updates

## License

MIT

## Contributing

Contributions welcome! Areas for contribution:

- Additional rule types
- Better secret detection
- Performance optimizations
- UI improvements
- Documentation
- Test coverage
- Docker/Kubernetes deployment examples

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Built with Node.js, Express, React, and TypeScript**
