#!/bin/bash

# Script to check for active drifts (useful for CI/CD)

SERVER_URL="${SERVER_URL:-http://localhost:8080}"
APP_NAME="${1:-}"

if [ -z "$APP_NAME" ]; then
    URL="$SERVER_URL/api/v1/ci-check"
else
    URL="$SERVER_URL/api/v1/ci-check?applicationName=$APP_NAME"
fi

echo "Checking for configuration drifts..."
echo ""

RESPONSE=$(curl -s "$URL")
STATUS=$(echo "$RESPONSE" | jq -r '.status')

if [ "$STATUS" = "fail" ]; then
    echo "❌ FAIL: Unresolved configuration drifts detected"
    echo ""
    echo "$RESPONSE" | jq '.'
    exit 1
else
    echo "✅ PASS: No unresolved configuration drifts"
    echo ""
    echo "$RESPONSE" | jq '.'
    exit 0
fi
