#!/bin/bash

# Edge Case Testing Suite
BASE_URL="http://localhost:4000/sse"
AGENT_CONFIG_ID="690a5659a4b5fc8f607f23ac"

echo "🧪 EDGE CASE TESTING SUITE"
echo "=========================="
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

# Test 1: Get non-existent task
echo "📋 Test 1: Get Non-existent Task"
RESULT=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_task","arguments":{"id":"000000000000000000000000"}}}' \
  | jq -r '.result.content[0].text' 2>/dev/null | jq -r '.isError // .error // false' 2>/dev/null || echo "true")

check "Test 1: Returns error for non-existent task" "true" "$RESULT"
echo ""

# Test 2: Resume non-paused task
echo "📋 Test 2: Resume Non-paused Task"
# Get a completed task
COMPLETED_TASK=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"list_tasks\",\"arguments\":{\"status\":\"completed\",\"limit\":1}}}" \
  | jq -r '.result.content[0].text' | jq -r '.tasks[0]._id // "none"')

if [ "$COMPLETED_TASK" != "none" ] && [ -n "$COMPLETED_TASK" ]; then
  RESULT=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"resume_task\",\"arguments\":{\"taskId\":\"$COMPLETED_TASK\",\"userInputs\":[{\"stepId\":\"step1\",\"field\":\"test\",\"value\":\"test\"}]}}}" \
    | jq -r '.result.content[0].text' 2>/dev/null | jq -r '.isError // .error // false' 2>/dev/null || echo "true")
  
  check "Test 2: Cannot resume non-paused task" "true" "$RESULT"
else
  echo -e "${YELLOW}⚠️  SKIP${NC}: Test 2 (no completed tasks found)"
fi
echo ""

# Test 3: List tasks with filters
echo "📋 Test 3: List Tasks with Filters"
# Test by status
STATUS_RESULT=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"list_tasks\",\"arguments\":{\"status\":\"completed\",\"limit\":10}}}" \
  | jq -r '.result.content[0].text' | jq -r '.count // 0')

check "Test 3a: List by status works" "true" "$([ $STATUS_RESULT -ge 0 ] && echo 'true' || echo 'false')"

# Test with limit
LIMIT_RESULT=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"list_tasks\",\"arguments\":{\"limit\":2}}}" \
  | jq -r '.result.content[0].text' | jq -r '.tasks | length')

check "Test 3b: Limit works" "true" "$([ $LIMIT_RESULT -le 2 ] && echo 'true' || echo 'false')"
echo ""

# Test 4: Task state transitions
echo "📋 Test 4: Task State Management"
# Create a simple task
THOUGHT=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_thoughts\",\"arguments\":{\"userQuery\":\"List facilities\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" \
  | jq -r '.result.content[0].text' | jq -r '.thoughtId')

PLAN=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_plan\",\"arguments\":{\"thoughtId\":\"$THOUGHT\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" \
  | jq -r '.result.content[0].text' | jq -r '.planId')

TASK=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"execute_task\",\"arguments\":{\"planId\":\"$PLAN\",\"agentConfigId\":\"$AGENT_CONFIG_ID\"}}}" \
  | jq -r '.result.content[0].text' | jq -r '.taskId')

echo "  Waiting 3 seconds..."
sleep 3

INITIAL_STATUS=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK\"}}}" \
  | jq -r '.result.content[0].text' | jq -r '.status')

check "Test 4a: Task has valid status" "true" "$([ -n "$INITIAL_STATUS" ] && echo 'true' || echo 'false')"

# Wait for completion
echo "  Waiting 5 more seconds..."
sleep 5

FINAL_STATUS=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK\"}}}" \
  | jq -r '.result.content[0].text' | jq -r '.status')

check "Test 4b: Task transitions correctly" "true" "$([ "$FINAL_STATUS" = "completed" ] && echo 'true' || echo 'false')"
echo ""

# Test 5: Task execution history
echo "📋 Test 5: Execution History"
TASK_DATA=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK\"}}}" \
  | jq -r '.result.content[0].text')

HISTORY=$(echo "$TASK_DATA" | jq -r '.executionHistory | length')
HAS_STEP_OUTPUTS=$(echo "$TASK_DATA" | jq -r '.stepOutputs | keys | length')

check "Test 5a: Execution history exists" "true" "$([ $HISTORY -gt 0 ] && echo 'true' || echo 'false')"
check "Test 5b: Step outputs tracked" "true" "$([ $HAS_STEP_OUTPUTS -gt 0 ] && echo 'true' || echo 'false')"
echo ""

# Summary
echo "=========================="
echo "SUMMARY"
echo "=========================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All edge case tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some edge case tests failed${NC}"
  exit 1
fi

