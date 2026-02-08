#!/bin/bash

# Quick smoke test for Config Monitor

SERVER_URL="${SERVER_URL:-http://localhost:8080}"

echo "🔍 Quick Smoke Test - Config Monitor"
echo "Server: $SERVER_URL"
echo ""

# Check server is running
echo -n "Checking server health... "
if curl -s "$SERVER_URL/health" | jq -e '.status == "UP"' > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌ Server not responding"
    echo "   Make sure server is running: cd config-monitor-server-js && npm start"
    exit 1
fi

# Test baseline registration
echo -n "Testing baseline registration... "
RESPONSE=$(curl -s -X POST "$SERVER_URL/api/v1/baselines" \
    -H "Content-Type: application/json" \
    -d '{"applicationName":"smoke-test","environment":"test","yamlContent":"key: value"}')

if echo "$RESPONSE" | jq -e '.status == "success"' > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
    echo "   Response: $RESPONSE"
    exit 1
fi

# Test snapshot submission
echo -n "Testing snapshot submission... "
RESPONSE=$(curl -s -X POST "$SERVER_URL/api/v1/config-snapshots" \
    -H "Content-Type: application/json" \
    -d '{"applicationName":"smoke-test","environment":"test","config":{"test.key":"test.value"}}')

if echo "$RESPONSE" | jq -e '.status == "success"' > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
    echo "   Response: $RESPONSE"
    exit 1
fi

# Test drift retrieval
echo -n "Testing drift retrieval... "
RESPONSE=$(curl -s "$SERVER_URL/api/v1/drifts")
if echo "$RESPONSE" | jq '.' > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
    echo "   Response: $RESPONSE"
    exit 1
fi

# Test CI check
echo -n "Testing CI check endpoint... "
RESPONSE=$(curl -s "$SERVER_URL/api/v1/ci-check")
if echo "$RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
    echo "✅"
else
    echo "❌"
    echo "   Response: $RESPONSE"
    exit 1
fi

echo ""
echo "✅ All smoke tests passed!"
