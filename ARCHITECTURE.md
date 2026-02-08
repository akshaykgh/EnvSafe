# Configuration Drift Monitor - Architecture

## System Overview

The Configuration Drift Monitor consists of four main components:

1. **Config Monitor Server** - Central backend service that stores baselines and detects drift
2. **Config Monitor Agent** - Lightweight library integrated into Node.js applications
3. **Config Monitor Dashboard** - Web UI for visualizing drift and alerts
4. **Drift Detection Engine** - Standalone detection logic (can be used independently)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Node.js Application                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Config Monitor Agent (Library)                │   │
│  │  - Collects runtime config from process.env           │   │
│  │  - Hashes secrets (doesn't expose values)            │   │
│  │  - Sends snapshots to server periodically             │   │
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

## Component Details

### 1. Config Monitor Server (`config-monitor-server-js/`)

**Technology**: Node.js + Express + SQLite (PostgreSQL optional)

**Key Responsibilities**:
- Store config baselines (parsed from YAML files)
- Receive and store config snapshots from agents
- Detect drift by comparing snapshots to baselines
- Apply config rules (required, allowedInProd, min/max, changePolicy)
- Track drift status (active, acknowledged, resolved)
- Expose REST APIs for agents and dashboard
- Provide CI/CD check endpoint

**API Endpoints**:
- `POST /api/v1/config-snapshots` - Agent submits runtime config
- `GET /api/v1/drifts` - Dashboard fetches active drifts
- `POST /api/v1/drifts/{id}/acknowledge` - Acknowledge drift
- `POST /api/v1/drifts/{id}/resolve` - Mark drift as resolved
- `GET /api/v1/ci-check` - CI/CD integration endpoint
- `POST /api/v1/baselines` - Upload/register config baseline

### 2. Config Monitor Agent (`config-monitor-agent-js/`)

**Technology**: Node.js library

**Key Responsibilities**:
- Extract effective configuration from `process.env`
- Hash sensitive values (detect via naming patterns)
- Collect config from:
  - Environment variables
  - System properties
  - Custom config sources (extensible)
- Send periodic snapshots to server
- Handle failures gracefully (non-blocking)

**Integration**:
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

### 3. Config Monitor Dashboard (`config-monitor-ui/`)

**Technology**: React with TypeScript

**Key Features**:
- List active drifts with details
- Filter by application, severity, status
- Acknowledge/resolve drifts
- View config baseline
- Show drift history
- Auto-refresh every 30 seconds

### 4. Drift Detection Engine (`drift-detection-engine/`)

**Technology**: Pure JavaScript (standalone)

**Key Features**:
- Standalone drift detection logic
- Can be used independently
- 19 comprehensive unit tests
- Three drift types: MISSING, OVERRIDDEN, UNSAFE

## Data Model

### Application
- `id`: UUID (string)
- `name`: String (e.g., "payment-service")
- `environment`: String (e.g., "prod", "staging")
- `baselineConfig`: JSON string (parsed YAML)
- `createdAt`: ISO DateTime string
- `updatedAt`: ISO DateTime string

### ConfigSnapshot
- `id`: UUID (string)
- `applicationId`: UUID (string)
- `timestamp`: ISO DateTime string
- `config`: JSON string (runtime config with hashed secrets)
- `environment`: String

### ConfigDrift
- `id`: UUID (string)
- `applicationId`: UUID (string)
- `configKey`: String
- `expectedValue`: String (or null if missing)
- `actualValue`: String (or null if missing)
- `driftType`: Enum (MISSING, OVERRIDE, RULE_VIOLATION)
- `severity`: Enum (LOW, MEDIUM, HIGH, CRITICAL)
- `firstDetectedAt`: ISO DateTime string
- `status`: Enum (ACTIVE, ACKNOWLEDGED, RESOLVED)
- `acknowledgedAt`: ISO DateTime string (nullable)
- `resolvedAt`: ISO DateTime string (nullable)
- `description`: String

### ConfigRule
- `id`: UUID (string)
- `configKey`: String (pattern supported, e.g., "payment.*")
- `required`: Boolean
- `allowedInProd`: Boolean
- `minValue`: Number (nullable)
- `maxValue`: Number (nullable)
- `changePolicy`: Enum (CI_ONLY, RUNTIME_ALLOWED)
- `environment`: String

## Drift Detection Logic

1. **Missing Required Config**: Key marked as `required: true` but not present in runtime
2. **Runtime Override**: Key present in runtime but not in baseline (or different value)
3. **Rule Violation**: 
   - `allowedInProd: false` but present in prod environment
   - Value outside `min/max` range
   - `changePolicy: CI_ONLY` but value differs from baseline

## Security Considerations

- Secrets are never stored in plaintext
- Only hash and presence are tracked
- Agent uses HTTPS recommended for production
- Dashboard requires authentication (can be added)

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Parsing**: js-yaml
- **HTTP**: Built-in Node.js modules

### Agent
- **Language**: JavaScript (ES Modules)
- **HTTP Client**: Axios
- **Crypto**: Node.js built-in crypto module

### Dashboard
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **HTTP Client**: Axios

### Detection Engine
- **Language**: Pure JavaScript
- **Dependencies**: None (standalone)

## Deployment Architecture

### Development
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Server     │     │  Dashboard   │     │ Example App  │
│  (Port 8080) │     │  (Port 3000) │     │  (Port 8081) │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   SQLite DB   │
                    │  (File-based) │
                    └───────────────┘
```

### Production
```
┌──────────────┐     ┌──────────────┐
│   Server     │     │  Dashboard   │
│  (HTTPS)     │     │  (Static)    │
└──────┬───────┘     └──────────────┘
       │
       │
┌──────▼────────┐
│  PostgreSQL   │
│   Database    │
└───────────────┘
```

## File Structure

```
EnvSafe/
├── config-monitor-server-js/    # Backend server
│   ├── src/
│   │   ├── index.js             # Entry point
│   │   ├── config.js            # Configuration
│   │   ├── database/            # Database setup
│   │   ├── routes/              # API routes
│   │   └── services/           # Business logic
│   └── package.json
├── config-monitor-agent-js/     # Agent library
│   ├── src/
│   │   ├── index.js            # Main export
│   │   ├── collector.js        # Config collection
│   │   ├── sender.js           # Snapshot sending
│   │   └── secretHandler.js    # Secret handling
│   └── package.json
├── config-monitor-ui/           # React dashboard
│   ├── src/
│   │   └── App.tsx             # Main component
│   └── package.json
├── drift-detection-engine/      # Standalone engine
│   ├── src/
│   │   └── driftDetector.js    # Detection logic
│   └── package.json
└── example-app-js/              # Example app
    ├── src/
    │   └── index.js
    └── package.json
```

## Integration Flow

1. **Application starts** → Agent initializes
2. **Agent collects config** → From `process.env` and other sources
3. **Agent hashes secrets** → Using pattern matching
4. **Agent sends snapshot** → HTTP POST to server
5. **Server receives snapshot** → Stores in database
6. **Server detects drift** → Compares with baseline
7. **Server stores drifts** → In database
8. **Dashboard fetches drifts** → Via REST API
9. **User views/manages** → In web UI

## Scalability Considerations

- **Horizontal Scaling**: Server can be scaled behind load balancer
- **Database**: PostgreSQL supports high concurrency
- **Agent**: Lightweight, non-blocking operations
- **Dashboard**: Static files, can be CDN-hosted

## Future Enhancements

- Multi-environment support with environment-specific rules
- Config diff visualization
- Historical drift trends
- Integration with secret managers (Vault, AWS Secrets Manager)
- Slack/email notifications
- Config rollback recommendations
- Advanced rule engine with custom validators
