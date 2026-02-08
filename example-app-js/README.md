# Example Node.js Application

This demonstrates how to integrate the Config Monitor Agent into a Node.js application.

## Running the Example

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Config Monitor Server

```bash
cd ../config-monitor-server-js
npm install
npm start
```

### 3. Register Baseline Configuration

```bash
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "yamlContent": "payment:\n  timeout: 10000\n  retry-count: 3\n  enabled: true\ndatabase:\n  url: postgresql://prod-db:5432/payments\ndebug: false"
  }'
```

### 4. Start the Example App

```bash
npm start
```

The app will:
- Start on port 8081
- Automatically collect and send config snapshots every 30 seconds
- Use the agent to monitor its configuration

### 5. Simulate Configuration Drift

#### Scenario 1: Runtime Override

Stop the app (Ctrl+C), then restart with environment variable override:

```bash
export PAYMENT_TIMEOUT=50000
npm start
```

After ~30 seconds, check for drifts:
```bash
curl http://localhost:8080/api/v1/drifts | jq '.'
```

#### Scenario 2: Debug Mode in Production

```bash
export DEBUG=true
npm start
```

This will create a CRITICAL drift because `debug=true` is not allowed in production.

## Configuration

The example app reads configuration from:
1. Environment variables (highest precedence)
2. Default values in code

The agent collects all `process.env` variables and sends them to the server.

## Endpoints

- `GET /api/payments/config` - View current configuration
- `GET /api/payments/health` - Health check
- `GET /api/payments/agent-stats` - Agent statistics

## Viewing Drifts

- **Dashboard**: http://localhost:3000
- **API**: `GET http://localhost:8080/api/v1/drifts`
