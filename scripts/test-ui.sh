#!/bin/bash

# UI Testing Helper Script
# This script helps set up test data for UI testing

set -e

SERVER_URL="${SERVER_URL:-http://localhost:8080}"

echo "🎨 UI Testing Helper"
echo "==================="
echo ""
echo "This script will:"
echo "1. Check if server is running"
echo "2. Register a test baseline"
echo "3. Submit test snapshots to create drifts"
echo "4. Show you how to view them in the UI"
echo ""

# Check server
echo -n "Checking server... "
if curl -s "$SERVER_URL/health" | jq -e '.status == "UP"' > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
    echo ""
    echo "Server is not running!"
    echo "Please start the server first:"
    echo "  cd config-monitor-server-js && npm start"
    exit 1
fi

APP_NAME="ui-test-service"
ENV="prod"

# Register baseline
echo -n "Registering baseline... "
RESPONSE=$(curl -s -X POST "$SERVER_URL/api/v1/baselines" \
    -H "Content-Type: application/json" \
    -d "{
        \"applicationName\": \"$APP_NAME\",
        \"environment\": \"$ENV\",
        \"yamlContent\": \"payment:\\n  timeout: 10000\\n  retry-count: 3\\ndebug: false\\ndatabase:\\n  url: jdbc:postgresql://prod-db:5432/payments\"
    }")

if echo "$RESPONSE" | jq -e '.status == "success"' > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
    echo "Response: $RESPONSE"
    exit 1
fi

sleep 1

# Submit snapshot 1: Normal (no drift)
echo -n "Submitting snapshot 1 (no drift)... "
curl -s -X POST "$SERVER_URL/api/v1/config-snapshots" \
    -H "Content-Type: application/json" \
    -d "{
        \"applicationName\": \"$APP_NAME\",
        \"environment\": \"$ENV\",
        \"config\": {
            \"payment.timeout\": 10000,
            \"payment.retry-count\": 3,
            \"debug\": false
        }
    }" > /dev/null
echo "✅"

sleep 2

# Submit snapshot 2: With override (creates drift)
echo -n "Submitting snapshot 2 (with override - creates drift)... "
curl -s -X POST "$SERVER_URL/api/v1/config-snapshots" \
    -H "Content-Type: application/json" \
    -d "{
        \"applicationName\": \"$APP_NAME\",
        \"environment\": \"$ENV\",
        \"config\": {
            \"payment.timeout\": 50000,
            \"payment.retry-count\": 3,
            \"debug\": false
        }
    }" > /dev/null
echo "✅"

sleep 2

# Submit snapshot 3: With unsafe config (creates critical drift)
echo -n "Submitting snapshot 3 (with unsafe config - creates critical drift)... "
curl -s -X POST "$SERVER_URL/api/v1/config-snapshots" \
    -H "Content-Type: application/json" \
    -d "{
        \"applicationName\": \"$APP_NAME\",
        \"environment\": \"$ENV\",
        \"config\": {
            \"payment.timeout\": 10000,
            \"payment.retry-count\": 3,
            \"debug\": true
        }
    }" > /dev/null
echo "✅"

sleep 2

# Check drifts
echo ""
echo "Checking created drifts..."
DRIFTS=$(curl -s "$SERVER_URL/api/v1/drifts?applicationName=$APP_NAME&status=ACTIVE")
DRIFT_COUNT=$(echo "$DRIFTS" | jq 'length')

echo ""
echo "✅ Test data created successfully!"
echo ""
echo "📊 Summary:"
echo "   Application: $APP_NAME"
echo "   Environment: $ENV"
echo "   Active Drifts: $DRIFT_COUNT"
echo ""
echo "🌐 Next Steps:"
echo "   1. Make sure UI is running: cd config-monitor-ui && npm run dev"
echo "   2. Open browser: http://localhost:3000"
echo "   3. Filter by application: '$APP_NAME'"
echo "   4. You should see $DRIFT_COUNT active drift(s)"
echo ""
echo "📝 Test Scenarios:"
echo "   - View drifts in the dashboard"
echo "   - Filter by application and status"
echo "   - Acknowledge a drift"
echo "   - Resolve a drift"
echo "   - Watch auto-refresh (updates every 30 seconds)"
echo ""
