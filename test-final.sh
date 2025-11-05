#!/bin/bash

# Final Comprehensive Test Suite
BASE_URL="http://localhost:4000/sse"
AGENT_CONFIG_ID="690a5659a4b5fc8f607f23ac"

echo "🧪 FINAL COMPREHENSIVE TEST SUITE"
echo "=================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

check() {
  local test_name=$1
  local expected=$2
  local actual=$3
  if [ "$actual" = "$expected" ]; then
    echo -e "${GREEN}✅ PASS${NC}: $test_name"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC}: $test_name (expected: $expected, got: $actual)"
    ((FAILED++))
    return 1
  fi
}

# Test 1: Simple task execution
echo "📋 Test 1: Simple Task Execution"
THOUGHT1=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_thoughts\",\"arguments\":{\"userQuery\":\"List all facilities\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" \
  | jq -r '.result.content[0].text' | jq -r '.thoughtId')

PLAN1=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_plan\",\"arguments\":{\"thoughtId\":\"$THOUGHT1\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" \
  | jq -r '.result.content[0].text' | jq -r '.planId')

TASK1=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"execute_task\",\"arguments\":{\"planId\":\"$PLAN1\",\"agentConfigId\":\"$AGENT_CONFIG_ID\"}}}" \
  | jq -r '.result.content[0].text' | jq -r '.taskId')

echo "  Waiting 8 seconds..."
sleep 8

STATUS1=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK1\"}}}" \
  | jq -r '.result.content[0].text' | jq -r '.status')

check "Test 1: Simple execution completes" "completed" "$STATUS1"
echo ""

# Test 2: Task with user input and resume
echo "📋 Test 2: Task with User Input + Resume"
THOUGHT2=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_thoughts\",\"arguments\":{\"userQuery\":\"Create a shipment for facility HAN with license plate TEST123\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" \
  | jq -r '.result.content[0].text' | jq -r '.thoughtId')

PLAN2=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_plan\",\"arguments\":{\"thoughtId\":\"$THOUGHT2\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" \
  | jq -r '.result.content[0].text' | jq -r '.planId')

TASK2=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"execute_task\",\"arguments\":{\"planId\":\"$PLAN2\",\"agentConfigId\":\"$AGENT_CONFIG_ID\"}}}" \
  | jq -r '.result.content[0].text' | jq -r '.taskId')

echo "  Waiting 5 seconds for step 1..."
sleep 5

TASK2_DATA=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK2\"}}}" \
  | jq -r '.result.content[0].text')

STATUS2=$(echo "$TASK2_DATA" | jq -r '.status')
PENDING_COUNT=$(echo "$TASK2_DATA" | jq -r '.pendingUserInputs | length')

check "Test 2a: Task pauses for input" "paused" "$STATUS2"
check "Test 2b: Has pending inputs" "true" "$([ $PENDING_COUNT -gt 0 ] && echo 'true' || echo 'false')"

# Get required fields
echo "  Getting required fields..."
REQUIRED_FIELDS=$(echo "$TASK2_DATA" | jq -r '.pendingUserInputs[] | "\(.stepId)|\(.field)"')
STEP_ID=$(echo "$REQUIRED_FIELDS" | head -1 | cut -d'|' -f1)

# Resume with all required inputs
echo "  Resuming with user inputs..."
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
FUTURE=$(date -u -v+1H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+1 hour" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ")

RESUME_RESULT=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\":\"2.0\",
    \"id\":1,
    \"method\":\"tools/call\",
    \"params\":{
      \"name\":\"resume_task\",
      \"arguments\":{
        \"taskId\":\"$TASK2\",
        \"userInputs\":[
          {\"stepId\":\"$STEP_ID\",\"field\":\"source\",\"value\":\"Test Source Inc\"},
          {\"stepId\":\"$STEP_ID\",\"field\":\"entry_timestamp\",\"value\":\"$NOW\"},
          {\"stepId\":\"$STEP_ID\",\"field\":\"exit_timestamp\",\"value\":\"$FUTURE\"},
          {\"stepId\":\"$STEP_ID\",\"field\":\"contract_reference_id\",\"value\":\"CONTRACT-2025-TEST\"},
          {\"stepId\":\"$STEP_ID\",\"field\":\"contractId\",\"value\":\"$AGENT_CONFIG_ID\"}
        ]
      }
    }
  }" | jq -r '.result.content[0].text')

RESUME_MSG=$(echo "$RESUME_RESULT" | jq -r '.message // "error"')
check "Test 2c: Resume successful" "Task resumption started" "$RESUME_MSG"

echo "  Waiting 10 seconds for completion..."
sleep 10

TASK2_FINAL=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK2\"}}}" \
  | jq -r '.result.content[0].text')

FINAL_STATUS=$(echo "$TASK2_FINAL" | jq -r '.status')
USER_INPUTS_COUNT=$(echo "$TASK2_FINAL" | jq -r '.userInputs | keys | length')

check "Test 2d: User inputs stored" "true" "$([ $USER_INPUTS_COUNT -gt 0 ] && echo 'true' || echo 'false')"
echo ""

# Test 3: Execution history and retry count
echo "📋 Test 3: Execution History & Retry Count"
TASK1_DETAILS=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK1\"}}}" \
  | jq -r '.result.content[0].text')

HISTORY_COUNT=$(echo "$TASK1_DETAILS" | jq -r '.executionHistory | length')
HAS_RETRY_MAP=$(echo "$TASK1_DETAILS" | jq -r '.retryCount != null')

check "Test 3a: Execution history tracked" "true" "$([ $HISTORY_COUNT -gt 0 ] && echo 'true' || echo 'false')"
check "Test 3b: Retry count map exists" "true" "$HAS_RETRY_MAP"
echo ""

# Test 4: List tasks
echo "📋 Test 4: List Tasks"
TASKS_LIST=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"list_tasks\",\"arguments\":{\"limit\":5}}}" \
  | jq -r '.result.content[0].text')

TASKS_COUNT=$(echo "$TASKS_LIST" | jq -r '.count')
check "Test 4: List tasks works" "true" "$([ $TASKS_COUNT -gt 0 ] && echo 'true' || echo 'false')"
echo ""

# Summary
echo "=================================="
echo "SUMMARY"
echo "=================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi

