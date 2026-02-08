#!/bin/bash

# Script to register a baseline configuration from a YAML file

SERVER_URL="${SERVER_URL:-http://localhost:8080}"
APP_NAME="${1:-payment-service}"
ENV="${2:-prod}"
YAML_FILE="${3:-example-app-js/config.example.js}"

if [ ! -f "$YAML_FILE" ]; then
    echo "Error: YAML file not found: $YAML_FILE"
    exit 1
fi

# Read YAML content and escape for JSON
YAML_CONTENT=$(cat "$YAML_FILE" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | tr '\n' '\\n')

# Create JSON payload
JSON_PAYLOAD=$(cat <<EOF
{
  "applicationName": "$APP_NAME",
  "environment": "$ENV",
  "yamlContent": "$YAML_CONTENT"
}
EOF
)

echo "Registering baseline for $APP_NAME ($ENV)..."
echo "YAML file: $YAML_FILE"
echo ""

curl -X POST "$SERVER_URL/api/v1/baselines" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD" \
  | jq '.'

echo ""
echo "Baseline registered successfully!"
