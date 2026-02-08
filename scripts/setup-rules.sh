#!/bin/bash

# Script to set up default configuration rules
# This demonstrates how to create rules programmatically

SERVER_URL="${SERVER_URL:-http://localhost:8080}"

echo "Setting up default configuration rules..."
echo "Note: Rules are initialized automatically on server startup."
echo "This script shows example rule creation via API (if implemented)."
echo ""
echo "Current rules can be viewed in the database or via the dashboard."
echo ""

# Example: Create a rule via API (if endpoint exists)
# curl -X POST "$SERVER_URL/api/v1/rules" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "configKey": "payment.timeout",
#     "required": false,
#     "allowedInProd": true,
#     "minValue": 1000,
#     "maxValue": 30000,
#     "changePolicy": "CI_ONLY",
#     "environment": "prod"
#   }'

echo "Rules are initialized automatically on server startup."
