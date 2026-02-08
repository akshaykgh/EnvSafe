# Configuration Drift Monitor

A production-ready MVP for detecting and tracking configuration drift between declared Git-based configuration and actual runtime configuration.

**Built with JavaScript/Node.js** - Pure Node.js implementation for easy deployment and maintenance.

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Start server
npm run start:server

# Start dashboard (in another terminal)
npm run start:ui

# Open browser: http://localhost:3000
```

## 🧪 Testing

**Quick Test (1 minute):**
```bash
# Start server first, then:
./scripts/quick-test.sh
```

**Full Test Suite (5 minutes):**
```bash
./scripts/run-tests.sh
```

**Unit Tests:**
```bash
cd drift-detection-engine && npm test
```

**See [HOW-TO-TEST.md](./HOW-TO-TEST.md) for complete testing guide.**

See [QUICKSTART-JS.md](./QUICKSTART-JS.md) for detailed setup instructions.

## Problem Statement

### Why Git Alone Is Insufficient

While Git provides version control for configuration files (`application.yml`, `application-prod.yml`), it cannot track:

1. **Runtime Overrides**: Engineers often override configuration via environment variables during incidents:
   ```bash
   # Emergency fix - not committed to Git
   export PAYMENT_TIMEOUT=60000
   export DEBUG=true
   ```

2. **Environment Variables**: Applications load config from multiple sources:
   - Environment variables (runtime)
   - Configuration files (declared in Git)
   
   Git only sees the configuration files, not the effective runtime values.

3. **Forgotten Changes**: Temporary fixes become permanent when:
   - The engineer forgets to revert the override
   - The override persists in deployment scripts
   - Environment variables are set at the infrastructure level

4. **Compliance & Audit**: There's no visibility into what configuration is actually running in production vs. what's declared in Git.

### How Runtime Drift Occurs

**Scenario 1: Emergency Override**
```bash
# Production incident - payment service timing out
# Engineer sets override via environment variable
export PAYMENT_TIMEOUT=120000

# Service restarts, uses new value
# Engineer forgets to document or revert
# Drift persists indefinitely
```

**Scenario 2: Infrastructure-Level Config**
```yaml
# Git: application-prod.yml
payment:
  timeout: 10000

# Kubernetes ConfigMap (not in Git)
PAYMENT_TIMEOUT=50000

# Effective runtime: 50000 (drift from Git)
```

**Scenario 3: Debug Mode in Production**
```bash
# Accidentally enabled via environment variable
export DEBUG=true
# Violates production rules but Git shows debug: false
```

## Solution: Configuration Drift Monitor

This tool **observes**, **compares**, and **alerts** on configuration drift without storing or managing configurations.

### Key Features

1. **Runtime Config Collection**: Agent extracts effective configuration from environment variables
2. **Baseline Comparison**: Compares runtime config against Git-declared baseline
3. **Rule-Based Detection**: Enforces rules (required, allowedInProd, min/max, changePolicy)
4. **Drift Tracking**: Records drift with severity, type, and timeline
5. **CI/CD Integration**: Fails CI builds when unresolved drifts exist
6. **Security**: Never stores secrets - only hashes and presence

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

### Components

1. **Config Monitor Server** (`config-monitor-server-js/`)
   - Node.js + Express backend service
   - Stores baselines and detects drift
   - REST APIs for agents and dashboard

2. **Config Monitor Agent** (`config-monitor-agent-js/`)
   - Node.js library
   - Collects runtime configuration from environment variables
   - Sends snapshots to server periodically

3. **Config Monitor Dashboard** (`config-monitor-ui/`)
   - React-based web UI
   - Visualizes drifts and alerts
   - Acknowledge/resolve drifts

4. **Example Application** (`example-app-js/`)
   - Demonstrates agent integration
   - Shows drift scenarios

## Quick Start

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL (optional, SQLite used by default)

### 1. Start the Config Monitor Server

```bash
cd config-monitor-server-js
npm install
npm start
```

Server runs on `http://localhost:8080`

### 2. Start the Dashboard

```bash
cd config-monitor-ui
npm install
npm run dev
```

Dashboard runs on `http://localhost:3000`

### 3. Register a Baseline Configuration

```bash
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "yamlContent": "payment:\n  timeout: 10000\n  retry-count: 3\ndatabase:\n  url: postgresql://prod-db:5432/payments\ndebug: false"
  }'
```

### 4. Integrate Agent into Your Node.js App

Install the agent:
```bash
npm install config-monitor-agent
```

Use in your application:
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

- **Dashboard**: Open http://localhost:3000
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
    "payment.timeout": 50000,
    "payment.retry-count": 3
  }
}
```

### Get Drifts
```http
GET /api/v1/drifts?applicationName=payment-service&status=ACTIVE
```

### Acknowledge Drift
```http
POST /api/v1/drifts/{id}/acknowledge
```

### Resolve Drift
```http
POST /api/v1/drifts/{id}/resolve
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
  "driftCount": 2,
  "drifts": [...]
}
```

## Configuration Rules

Rules define constraints on configuration values:

```javascript
const rule = {
    configKey: "payment.timeout",
    required: true,                    // Must be present
    allowedInProd: true,               // Allowed in production
    minValue: 1000,                    // Minimum value
    maxValue: 30000,                   // Maximum value
    changePolicy: "CI_ONLY",           // Only changes via CI allowed
    environment: "prod"
};
```

### Rule Types

- **required**: Config key must be present
- **allowedInProd**: Whether config is allowed in production environment
- **minValue / maxValue**: Numeric range constraints
- **changePolicy**:
  - `CI_ONLY`: Changes only allowed via Git/CI
  - `RUNTIME_ALLOWED`: Runtime overrides are acceptable

## Drift Types

1. **MISSING**: Required configuration key is absent
2. **OVERRIDE**: Runtime value differs from baseline (and `changePolicy=CI_ONLY`)
3. **RULE_VIOLATION**: Value violates configured rules (e.g., `debug=true` in prod)

## Security Considerations

- **Secrets are never stored**: Only hash and presence are tracked
- **Pattern-based detection**: Config keys matching patterns (e.g., `.*password.*`) are automatically hashed
- **HTTPS recommended**: Agent should communicate with server over HTTPS in production
- **Authentication**: Add authentication/authorization for production use

## Example Scenarios

See [example-app-js/README.md](./example-app-js/README.md) for detailed drift scenarios.

### Scenario: Payment Timeout Override

**Baseline (Git)**:
```yaml
payment:
  timeout: 10000
```

**Runtime**:
```bash
export PAYMENT_TIMEOUT=50000
```

**Result**: Drift detected (OVERRIDE type, MEDIUM severity)

### Scenario: Debug Mode in Production

**Baseline (Git)**:
```yaml
debug: false
```

**Runtime**:
```bash
export DEBUG=true
```

**Result**: Critical drift detected (RULE_VIOLATION, CRITICAL severity - not allowed in prod)

## Development

### Installing Dependencies

```bash
# Install all dependencies
npm run install:all
```

### Running Tests

```bash
# Unit tests for drift detection engine
cd drift-detection-engine
npm test

# Integration tests
./scripts/run-tests.sh
```

## Production Considerations

1. **Database**: Use PostgreSQL for production (SQLite is fine for development)
2. **Authentication**: Add OAuth2/JWT authentication
3. **HTTPS**: Use HTTPS for all communications
4. **Monitoring**: Add metrics and alerting
5. **Scalability**: Consider horizontal scaling for high-volume scenarios
6. **Retention**: Implement data retention policies for snapshots and drifts

## Limitations (MVP)

- No RBAC (all users see all drifts)
- Basic rule system (no complex expressions)
- No config deployment capabilities
- No secret management integration
- Single-server architecture (no clustering)

## Future Enhancements

- Multi-environment support with environment-specific rules
- Config diff visualization
- Historical drift trends
- Integration with secret managers (Vault, AWS Secrets Manager)
- Slack/email notifications
- Config rollback recommendations
- Advanced rule engine with custom validators

## License

MIT

## Contributing

This is an MVP. Contributions welcome for:
- Additional rule types
- Better secret detection
- Performance optimizations
- UI improvements
- Documentation
