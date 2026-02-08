#!/bin/bash

set -e

SERVER_URL="${SERVER_URL:-http://localhost:8080}"
APP_NAME="test-service-$(date +%s)"

echo "=== Configuration Drift Monitor - Test Suite ==="
echo "Server URL: $SERVER_URL"
echo "Test Application: $APP_NAME"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_step() {
    local name=$1
    local command=$2
    
    echo -n "Testing: $name... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Test 1: Server health check
test_step "Server health check" \
    "curl -s $SERVER_URL/health | jq -e '.status == \"UP\"'"

# Test 2: Register baseline
test_step "Register baseline" \
    "curl -s -X POST $SERVER_URL/api/v1/baselines \
        -H 'Content-Type: application/json' \
        -d '{\"applicationName\":\"$APP_NAME\",\"environment\":\"test\",\"yamlContent\":\"payment:\\n  timeout: 10000\\ndebug: false\"}' \
        | jq -e '.status == \"success\"'"

sleep 1

# Test 3: Submit snapshot (no drift)
test_step "Submit snapshot (no drift)" \
    "curl -s -X POST $SERVER_URL/api/v1/config-snapshots \
        -H 'Content-Type: application/json' \
        -d '{\"applicationName\":\"$APP_NAME\",\"environment\":\"test\",\"config\":{\"payment.timeout\":10000,\"debug\":false}}' \
        | jq -e '.status == \"success\"'"

sleep 2

# Test 4: Verify no drifts initially
test_step "Verify no drifts initially" \
    "[ \$(curl -s \"$SERVER_URL/api/v1/drifts?applicationName=$APP_NAME&status=ACTIVE\" | jq 'length') -eq 0 ]"

# Test 5: Submit snapshot with override
test_step "Submit snapshot with override" \
    "curl -s -X POST $SERVER_URL/api/v1/config-snapshots \
        -H 'Content-Type: application/json' \
        -d '{\"applicationName\":\"$APP_NAME\",\"environment\":\"test\",\"config\":{\"payment.timeout\":50000,\"debug\":false}}' \
        | jq -e '.status == \"success\"'"

sleep 2

# Test 6: Verify drift detected
test_step "Verify drift detected" \
    "[ \$(curl -s \"$SERVER_URL/api/v1/drifts?applicationName=$APP_NAME&status=ACTIVE\" | jq 'length') -gt 0 ]"

# Test 7: Submit snapshot with unsafe config
test_step "Submit snapshot with unsafe config" \
    "curl -s -X POST $SERVER_URL/api/v1/config-snapshots \
        -H 'Content-Type: application/json' \
        -d '{\"applicationName\":\"$APP_NAME\",\"environment\":\"test\",\"config\":{\"payment.timeout\":10000,\"debug\":true}}' \
        | jq -e '.status == \"success\"'"

sleep 2

# Test 8: CI check should fail
test_step "CI check fails with active drifts" \
    "curl -s \"$SERVER_URL/api/v1/ci-check?applicationName=$APP_NAME\" | jq -e '.status == \"fail\"'"

# Test 9: Get drift ID and resolve
DRIFT_ID=$(curl -s "$SERVER_URL/api/v1/drifts?applicationName=$APP_NAME&status=ACTIVE" | jq -r '.[0].id // empty')

if [ -n "$DRIFT_ID" ] && [ "$DRIFT_ID" != "null" ]; then
    test_step "Resolve drift" \
        "curl -s -X POST $SERVER_URL/api/v1/drifts/$DRIFT_ID/resolve | jq -e '.status == \"success\"'"
    
    sleep 1
    
    # Test 10: CI check should pass after resolve
    test_step "CI check passes after resolve" \
        "curl -s \"$SERVER_URL/api/v1/ci-check?applicationName=$APP_NAME\" | jq -e '.status == \"pass\"'"
else
    echo -e "${YELLOW}⚠${NC} Skipping resolve test (no drift ID found)"
fi

# Summary
echo ""
echo "=== Test Results ==="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
