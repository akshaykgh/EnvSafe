# UI Testing Guide - Config Monitor Dashboard

Complete guide for testing the Configuration Drift Monitor using the web dashboard.

## Prerequisites

- Node.js 18+ and npm
- Browser (Chrome, Firefox, Safari, or Edge)

## Quick Start

### Step 1: Start the Backend Server

**Terminal 1 - Start Server:**
```bash
cd config-monitor-server-js
npm install
npm start
```

Wait for: `Config Monitor Server running on http://localhost:8080`

**Verify Server:**
```bash
curl http://localhost:8080/health
# Should return: {"status":"UP"}
```

### Step 2: Start the Dashboard

**Terminal 2 - Start UI:**
```bash
cd config-monitor-ui
npm install
npm run dev
```

Wait for: `Local: http://localhost:3000`

### Step 3: Open Dashboard

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the Config Monitor Dashboard!

## UI Features to Test

### 1. View Active Drifts

**Initial State:**
- Dashboard shows "No drifts found" (empty state)
- This is expected if no baseline/snapshots are registered yet

### 2. Register Baseline (via API)

**Terminal 3 - Register Baseline:**
```bash
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "yamlContent": "payment:\n  timeout: 10000\n  retry-count: 3\n  enabled: true\ndebug: false\ndatabase:\n  url: jdbc:postgresql://prod-db:5432/payments"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Baseline registered",
  "configKeys": 5
}
```

### 3. Submit Config Snapshot (via API)

**Submit Snapshot with Override:**
```bash
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "config": {
      "payment.timeout": 50000,
      "payment.retry-count": 3,
      "payment.enabled": true,
      "debug": false
    }
  }'
```

**Refresh Dashboard** - You should now see drifts!

### 4. View Drifts in Dashboard

**What to Look For:**
- ✅ Drift cards appear with colored left border
- ✅ Config key displayed (e.g., `payment.timeout`)
- ✅ Expected vs Actual values shown
- ✅ Severity badge (LOW, MEDIUM, HIGH, CRITICAL)
- ✅ Status badge (ACTIVE, ACKNOWLEDGED, RESOLVED)
- ✅ Description explaining the drift

**Drift Card Colors:**
- 🔴 Red border: CRITICAL severity
- 🟠 Orange border: HIGH severity
- 🔵 Blue border: MEDIUM severity
- ⚪ Gray border: LOW severity

### 5. Filter Drifts

**Test Filters:**

1. **Filter by Application:**
   - Click dropdown: "All Applications"
   - Select: "payment-service"
   - Only payment-service drifts shown

2. **Filter by Status:**
   - Click dropdown: "Active"
   - Options: Active, Acknowledged, Resolved, All
   - Select different statuses to filter

### 6. Acknowledge a Drift

**Steps:**
1. Find an ACTIVE drift card
2. Click **"Acknowledge"** button
3. Status changes to ACKNOWLEDGED
4. Acknowledged timestamp appears
5. Buttons disappear (only ACTIVE drifts have action buttons)

**Verify:**
- Status badge changes to "ACKNOWLEDGED"
- Acknowledged timestamp shown
- Filter by "Acknowledged" to see it

### 7. Resolve a Drift

**Steps:**
1. Find an ACTIVE drift card
2. Click **"Resolve"** button
3. Status changes to RESOLVED
4. Resolved timestamp appears
5. Card moves out of "Active" filter

**Verify:**
- Status badge changes to "RESOLVED"
- Resolved timestamp shown
- Filter by "Resolved" to see it
- No longer appears in "Active" filter

### 8. Auto-Refresh

**Test:**
- Dashboard auto-refreshes every 30 seconds
- Submit new snapshot via API
- Wait up to 30 seconds
- Dashboard should update automatically

## Complete Test Scenario

### Scenario: Production Incident Simulation

**Step 1: Register Baseline**
```bash
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "yamlContent": "payment:\n  timeout: 10000\n  retry-count: 3\ndebug: false"
  }'
```

**Step 2: Submit Normal Snapshot (No Drift)**
```bash
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "config": {
      "payment.timeout": 10000,
      "payment.retry-count": 3,
      "debug": false
    }
  }'
```

**Check Dashboard:** Should show "No drifts found"

**Step 3: Submit Snapshot with Override (Emergency Fix)**
```bash
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "config": {
      "payment.timeout": 50000,
      "payment.retry-count": 3,
      "debug": false
    }
  }'
```

**Check Dashboard:** 
- ✅ Drift appears for `payment.timeout`
- ✅ Shows expected: 10000, actual: 50000
- ✅ Type: OVERRIDDEN
- ✅ Severity: MEDIUM

**Step 4: Submit Snapshot with Debug Enabled (Critical Issue)**
```bash
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{
    "applicationName": "payment-service",
    "environment": "prod",
    "config": {
      "payment.timeout": 10000,
      "payment.retry-count": 3,
      "debug": true
    }
  }'
```

**Check Dashboard:**
- ✅ New drift appears for `debug`
- ✅ Shows expected: false, actual: true
- ✅ Type: RULE_VIOLATION or UNSAFE
- ✅ Severity: CRITICAL (red border)

**Step 5: Acknowledge Critical Drift**
- Click "Acknowledge" on the debug drift
- Status changes to ACKNOWLEDGED
- Filter by "Acknowledged" to see it

**Step 6: Resolve Override Drift**
- Click "Resolve" on the payment.timeout drift
- Status changes to RESOLVED
- Filter by "Resolved" to see it

**Step 7: Verify Filters**
- Filter by "Active" - should show remaining active drifts
- Filter by "Acknowledged" - should show debug drift
- Filter by "Resolved" - should show payment.timeout drift

## Testing with Example App

### Start Example App with Agent

**Terminal 4 - Start Example App:**
```bash
cd example-app-js
npm install
npm start
```

**What Happens:**
- Agent automatically collects config every 60 seconds
- Sends snapshots to server
- Dashboard updates automatically

**Create Drift:**
```bash
# Stop app (Ctrl+C)
export PAYMENT_TIMEOUT=50000
export DEBUG=true
cd example-app-js
npm start
```

**Watch Dashboard:**
- Wait 30-60 seconds
- Drifts should appear automatically
- No manual API calls needed!

## UI Checklist

### Visual Elements
- [ ] Dashboard header displays correctly
- [ ] Filters are visible and functional
- [ ] Drift cards render with correct styling
- [ ] Color coding matches severity (red=critical, etc.)
- [ ] Status badges display correctly
- [ ] Empty state shows when no drifts

### Functionality
- [ ] Filter by application works
- [ ] Filter by status works
- [ ] Acknowledge button works
- [ ] Resolve button works
- [ ] Auto-refresh works (every 30 seconds)
- [ ] Error messages display if API fails

### Data Display
- [ ] Config keys display correctly
- [ ] Expected values show correctly
- [ ] Actual values show correctly
- [ ] Timestamps format correctly
- [ ] Descriptions are readable
- [ ] Source stats display (if available)

## Troubleshooting

### Dashboard Shows "No drifts found"
**Possible Causes:**
1. No baseline registered - Register baseline first
2. No snapshots submitted - Submit snapshot via API
3. Config matches baseline - Create a drift by changing values
4. Server not running - Check `http://localhost:8080/health`

**Solution:**
```bash
# Register baseline
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{"applicationName":"test","environment":"prod","yamlContent":"key: value"}'

# Submit snapshot with different value
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{"applicationName":"test","environment":"prod","config":{"key":"different"}}'

# Refresh dashboard
```

### Dashboard Not Loading
**Check:**
1. UI server running? Check terminal for errors
2. Backend server running? `curl http://localhost:8080/health`
3. CORS issues? Check browser console (F12)
4. Port conflict? Change port in `vite.config.ts`

**Solution:**
```bash
# Check if ports are in use
lsof -i :3000  # UI port
lsof -i :8080  # Backend port

# Restart both servers
```

### API Errors in Browser Console
**Check:**
1. Backend server URL correct in `vite.config.ts`
2. Backend server is running
3. CORS configured correctly

**Fix CORS:**
CORS is configured in `config-monitor-server-js/src/index.js` - should already be configured
    .allowedOrigins("http://localhost:3000", "http://localhost:5173")
```

## Browser Developer Tools

### Open DevTools
- **Chrome/Edge**: F12 or Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows)
- **Firefox**: F12 or Cmd+Option+I (Mac) / Ctrl+Shift+I (Windows)
- **Safari**: Cmd+Option+I (enable Developer menu first)

### Check Network Tab
1. Open DevTools → Network tab
2. Filter by "XHR" or "Fetch"
3. Submit snapshot via API
4. See API calls in Network tab
5. Check response status and data

### Check Console Tab
- Look for JavaScript errors
- Check API response logs
- Verify auto-refresh is working

## Screenshots Guide

### What to Capture
1. **Empty State**: Dashboard with no drifts
2. **Active Drifts**: Multiple drifts displayed
3. **Filtered View**: After applying filters
4. **Acknowledged Drift**: Status changed to ACKNOWLEDGED
5. **Resolved Drift**: Status changed to RESOLVED
6. **Critical Drift**: Red border, CRITICAL severity

## Advanced Testing

### Test Multiple Applications
```bash
# Register multiple baselines
curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{"applicationName":"app1","environment":"prod","yamlContent":"key: value1"}'

curl -X POST http://localhost:8080/api/v1/baselines \
  -H "Content-Type: application/json" \
  -d '{"applicationName":"app2","environment":"prod","yamlContent":"key: value2"}'

# Submit snapshots for both
curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{"applicationName":"app1","environment":"prod","config":{"key":"different1"}}'

curl -X POST http://localhost:8080/api/v1/config-snapshots \
  -H "Content-Type: application/json" \
  -d '{"applicationName":"app2","environment":"prod","config":{"key":"different2"}}'
```

**Test in Dashboard:**
- Filter by "app1" - see only app1 drifts
- Filter by "app2" - see only app2 drifts
- Select "All Applications" - see all drifts

### Test Real-Time Updates
1. Open dashboard
2. Open browser DevTools → Network tab
3. Submit new snapshot via API
4. Watch for auto-refresh API call (every 30 seconds)
5. Dashboard updates automatically

## Summary

✅ **Start Server**: `cd config-monitor-server-js && npm start`
✅ **Start UI**: `cd config-monitor-ui && npm run dev`
✅ **Open Browser**: `http://localhost:3000`
✅ **Register Baseline**: Via API or script
✅ **Submit Snapshots**: Via API or example app
✅ **View & Manage Drifts**: In the dashboard!

The dashboard provides a visual, interactive way to monitor and manage configuration drifts!
