# Quick Start - See UI Working

## Step 1: Start Server

**Terminal 1:**
```bash
cd /Users/akshaykumargh/Desktop/EnvSafe/config-monitor-server-js
npm start
```

Wait for: `Config Monitor Server running on http://localhost:8080`

## Step 2: Start Dashboard

**Terminal 2:**
```bash
cd /Users/akshaykumargh/Desktop/EnvSafe/config-monitor-ui
npm install
npm run dev
```

Wait for: `Local: http://localhost:5173` (or 3000)

## Step 3: Create Test Data

**Terminal 3:**
```bash
# Register baseline
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{"applicationName":"payment-service","environment":"prod","yamlContent":"payment:\n  timeout: 10000\ndebug: false"}'

# Submit snapshot with override
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{"applicationName":"payment-service","environment":"prod","config":{"payment.timeout":50000,"debug":true}}'
```

## Step 4: Open Browser

Open: **http://localhost:5173**

You should see drift cards!
