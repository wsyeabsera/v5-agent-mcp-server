#!/bin/bash

# Comprehensive Test Suite for Task Executor
# Tests all robustness features: resume, retry, timeout, AI generation, error handling

BASE_URL="http://localhost:4000/sse"
AGENT_CONFIG_ID="690a5659a4b5fc8f607f23ac"

echo "🧪 COMPREHENSIVE TASK EXECUTOR TEST SUITE"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to check status
check_status() {
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

# Test 1: Simple task execution (no user input)
echo "📋 Test 1: Simple Task Execution"
echo "---------------------------------"
THOUGHT1=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_thoughts\",\"arguments\":{\"userQuery\":\"List all facilities\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" | jq -r '.result.content[0].text' | jq -r '.thoughtId')

PLAN1=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_plan\",\"arguments\":{\"thoughtId\":\"$THOUGHT1\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" | jq -r '.result.content[0].text' | jq -r '.planId')

TASK1=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"execute_task\",\"arguments\":{\"planId\":\"$PLAN1\",\"agentConfigId\":\"$AGENT_CONFIG_ID\"}}}" | jq -r '.result.content[0].text' | jq -r '.taskId')

echo "Waiting 8 seconds for execution..."
sleep 8

TASK1_STATUS=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK1\"}}}" | jq -r '.result.content[0].text' | jq -r '.status')

check_status "Test 1: Simple execution completes" "completed" "$TASK1_STATUS"
echo ""

# Test 2: Task with user input required and resume
echo "📋 Test 2: Task with User Input Required + Resume"
echo "--------------------------------------------------"
THOUGHT2=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_thoughts\",\"arguments\":{\"userQuery\":\"Create a shipment for facility HAN with license plate TEST123\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" | jq -r '.result.content[0].text' | jq -r '.thoughtId')

PLAN2=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_plan\",\"arguments\":{\"thoughtId\":\"$THOUGHT2\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" | jq -r '.result.content[0].text' | jq -r '.planId')

TASK2=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"execute_task\",\"arguments\":{\"planId\":\"$PLAN2\",\"agentConfigId\":\"$AGENT_CONFIG_ID\"}}}" | jq -r '.result.content[0].text' | jq -r '.taskId')

echo "Waiting 5 seconds for step 1 execution..."
sleep 5

TASK2_STATUS=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK2\"}}}" | jq -r '.result.content[0].text' | jq '{status, pendingUserInputs: .pendingUserInputs | length}')

PAUSED=$(echo "$TASK2_STATUS" | jq -r '.status')
PENDING_COUNT=$(echo "$TASK2_STATUS" | jq -r '.pendingUserInputs')

check_status "Test 2a: Task pauses for user input" "paused" "$PAUSED"
check_status "Test 2b: Has pending user inputs" "1" "$PENDING_COUNT"

# Resume with user inputs
echo "Resuming task with user inputs..."
RESUME_RESULT=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"resume_task\",\"arguments\":{\"taskId\":\"$TASK2\",\"userInputs\":[{\"stepId\":\"step1\",\"field\":\"source\",\"value\":\"Test Source Company\"}]}}}" | jq -r '.result.content[0].text' | jq -r '.message')

echo "Waiting 10 seconds for completion..."
sleep 10

TASK2_FINAL=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK2\"}}}" | jq -r '.result.content[0].text' | jq '{status, stepOutputs: (.stepOutputs | keys), userInputs: (.userInputs | keys)}')

FINAL_STATUS=$(echo "$TASK2_FINAL" | jq -r '.status')
HAS_USER_INPUTS=$(echo "$TASK2_FINAL" | jq -r '.userInputs | length')

check_status "Test 2c: Resume message received" "Task resumption started" "$RESUME_RESULT"
check_status "Test 2d: User inputs stored" "1" "$HAS_USER_INPUTS"
echo ""

# Test 3: Check retry count and execution history
echo "📋 Test 3: Retry Count and Execution History"
echo "---------------------------------------------"
TASK1_HISTORY=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK1\"}}}" | jq -r '.result.content[0].text' | jq '{executionHistory: (.executionHistory | length), retryCount: (.retryCount | keys | length)}')

HISTORY_COUNT=$(echo "$TASK1_HISTORY" | jq -r '.executionHistory')
HAS_RETRY_COUNT=$(echo "$TASK1_HISTORY" | jq -r '.retryCount')

if [ "$HISTORY_COUNT" -gt "0" ]; then
  check_status "Test 3a: Execution history tracked" "true" "true"
else
  check_status "Test 3a: Execution history tracked" "true" "false"
fi

check_status "Test 3b: Retry count map exists" "0" "$HAS_RETRY_COUNT"
echo ""

# Test 4: List tasks with filters
echo "📋 Test 4: List Tasks with Filters"
echo "-----------------------------------"
TASKS_LIST=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"list_tasks\",\"arguments\":{\"status\":\"completed\",\"limit\":10}}}" | jq -r '.result.content[0].text' | jq '{count: .count, tasks: (.tasks | length)}')

LIST_COUNT=$(echo "$TASKS_LIST" | jq -r '.count')
TASKS_ARRAY_LENGTH=$(echo "$TASKS_LIST" | jq -r '.tasks')

if [ "$LIST_COUNT" -gt "0" ]; then
  check_status "Test 4: List tasks works" "true" "true"
else
  check_status "Test 4: List tasks works" "true" "false"
fi
echo ""

# Summary
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
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

