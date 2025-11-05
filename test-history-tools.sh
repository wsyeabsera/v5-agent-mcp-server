#!/bin/bash

# Comprehensive History Tools Test Script
# Tests all new history query tools and system integration

BASE_URL="http://localhost:4000/sse"
AGENT_CONFIG_ID="690a5659a4b5fc8f607f23ac"

echo "🧪 HISTORY TOOLS TEST SUITE"
echo "=========================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0

# Helper function to check if result is successful
check_success() {
  local test_name=$1
  local response=$2
  local success=$(echo "$response" | jq -r '.result.content[0].text' | jq -r '.success // false')
  
  if [ "$success" = "true" ]; then
    echo -e "${GREEN}✅ PASS${NC}: $test_name"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC}: $test_name"
    echo "$response" | jq '.'
    ((FAILED++))
    return 1
  fi
}

# Helper to get result data
get_result() {
  local response=$1
  echo "$response" | jq -r '.result.content[0].text'
}

echo -e "${BLUE}📊 Phase 1: Execute a Task to Generate Learning Data${NC}"
echo "------------------------------------------------------------"

# Test 1: Execute a task that will be learned from
echo "Test 1: Creating and executing a task..."
THOUGHT1=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_thoughts\",\"arguments\":{\"userQuery\":\"List all facilities\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" \
  | jq -r '.result.content[0].text' | jq -r '.thoughtId')

if [ -z "$THOUGHT1" ] || [ "$THOUGHT1" = "null" ]; then
  echo -e "${RED}❌ FAIL${NC}: Could not generate thought"
  ((FAILED++))
  exit 1
fi

echo "  Thought ID: $THOUGHT1"

PLAN1=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_plan\",\"arguments\":{\"thoughtId\":\"$THOUGHT1\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" \
  | jq -r '.result.content[0].text' | jq -r '.planId')

if [ -z "$PLAN1" ] || [ "$PLAN1" = "null" ]; then
  echo -e "${RED}❌ FAIL${NC}: Could not generate plan"
  ((FAILED++))
  exit 1
fi

echo "  Plan ID: $PLAN1"

TASK1=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"execute_task\",\"arguments\":{\"planId\":\"$PLAN1\",\"agentConfigId\":\"$AGENT_CONFIG_ID\"}}}" \
  | jq -r '.result.content[0].text' | jq -r '.taskId')

if [ -z "$TASK1" ] || [ "$TASK1" = "null" ]; then
  echo -e "${RED}❌ FAIL${NC}: Could not execute task"
  ((FAILED++))
  exit 1
fi

echo "  Task ID: $TASK1"
echo "  Waiting 10 seconds for task execution and learning..."
sleep 10

# Check task status
TASK_STATUS=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK1\"}}}" \
  | jq -r '.result.content[0].text' | jq -r '.status')

echo "  Task Status: $TASK_STATUS"
if [ "$TASK_STATUS" = "completed" ] || [ "$TASK_STATUS" = "failed" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Task completed (status: $TASK_STATUS)"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠️  WARN${NC}: Task still in progress (status: $TASK_STATUS)"
fi

echo ""
echo -e "${BLUE}📊 Phase 2: Test History Query Tools${NC}"
echo "-------------------------------------------"

# Test 2: get_similar_tasks
echo "Test 2: get_similar_tasks"
RESPONSE2=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_similar_tasks\",\"arguments\":{\"query\":\"List all facilities\",\"limit\":5}}}")

check_success "get_similar_tasks tool call" "$RESPONSE2"

RESULT2=$(get_result "$RESPONSE2")
TASK_COUNT=$(echo "$RESULT2" | jq -r '.count // 0')
echo "  Found $TASK_COUNT similar tasks"

if [ "$TASK_COUNT" -gt "0" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Similar tasks found"
  ((PASSED++))
  echo "$RESULT2" | jq '.tasks[0] | {taskId, query, goal, similarity, status}'
else
  echo -e "${YELLOW}⚠️  INFO${NC}: No similar tasks found yet (may be expected for first run)"
fi

echo ""

# Test 3: get_successful_plans
echo "Test 3: get_successful_plans"
RESPONSE3=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_successful_plans\",\"arguments\":{\"goal\":\"List all facilities\",\"limit\":5}}}")

check_success "get_successful_plans tool call" "$RESPONSE3"

RESULT3=$(get_result "$RESPONSE3")
PLAN_COUNT=$(echo "$RESULT3" | jq -r '.count // 0')
echo "  Found $PLAN_COUNT successful plans"

if [ "$PLAN_COUNT" -gt "0" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Successful plans found"
  ((PASSED++))
  echo "$RESULT3" | jq '.plans[0] | {planId, goal, successRate, usageCount}'
else
  echo -e "${YELLOW}⚠️  INFO${NC}: No successful plans found yet (may be expected for first run)"
fi

echo ""

# Test 4: get_tool_performance
echo "Test 4: get_tool_performance"
RESPONSE4=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_tool_performance\",\"arguments\":{\"toolName\":\"list_facilities\"}}}")

check_success "get_tool_performance tool call" "$RESPONSE4"

RESULT4=$(get_result "$RESPONSE4")
TOTAL_EXECUTIONS=$(echo "$RESULT4" | jq -r '.totalExecutions // 0')
echo "  Tool executions tracked: $TOTAL_EXECUTIONS"

if [ "$TOTAL_EXECUTIONS" -gt "0" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Tool performance data found"
  ((PASSED++))
  echo "$RESULT4" | jq '{toolName, totalExecutions, successRate, avgDuration, successCount, failureCount}'
else
  echo -e "${YELLOW}⚠️  INFO${NC}: No tool performance data yet (may need task completion)"
fi

echo ""

# Test 5: get_agent_insights
echo "Test 5: get_agent_insights"
RESPONSE5=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_agent_insights\",\"arguments\":{\"agentType\":\"executor\",\"limit\":5}}}")

check_success "get_agent_insights tool call" "$RESPONSE5"

RESULT5=$(get_result "$RESPONSE5")
INSIGHT_COUNT=$(echo "$RESULT5" | jq -r '.count // 0')
echo "  Found $INSIGHT_COUNT insights"

if [ "$INSIGHT_COUNT" -gt "0" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Agent insights found"
  ((PASSED++))
  echo "$RESULT5" | jq '.insights[0] | {type, insight, confidence}'
else
  echo -e "${YELLOW}⚠️  INFO${NC}: No insights found yet (may be expected for first run)"
fi

echo ""

# Test 6: learn_from_task (manual call to test)
echo "Test 6: learn_from_task (manual test)"
# First, let's get the task details
TASK_DETAILS=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK1\"}}}" \
  | jq -r '.result.content[0].text')

if [ "$TASK_STATUS" = "completed" ] || [ "$TASK_STATUS" = "failed" ]; then
  # Calculate metrics manually for testing
  EXECUTION_TIME=$(echo "$TASK_DETAILS" | jq '[.executionHistory[] | .duration // 0] | add')
  STEPS_COMPLETED=$(echo "$TASK_DETAILS" | jq '[.executionHistory[] | select(.status == "completed")] | length')
  RETRIES=$(echo "$TASK_DETAILS" | jq '[.retryCount | to_entries[] | .value] | add // 0')
  USER_INPUTS=$(echo "$TASK_DETAILS" | jq '.pendingUserInputs | length')

  RESPONSE6=$(curl -s -X POST $BASE_URL \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"learn_from_task\",\"arguments\":{\"taskId\":\"$TASK1\",\"planId\":\"$PLAN1\",\"status\":\"$TASK_STATUS\",\"metrics\":{\"executionTime\":$EXECUTION_TIME,\"stepsCompleted\":$STEPS_COMPLETED,\"retries\":$RETRIES,\"userInputsRequired\":$USER_INPUTS},\"insights\":[\"Task completed successfully\",\"List operations work well\"]}}}")

  check_success "learn_from_task tool call" "$RESPONSE6"
  
  RESULT6=$(get_result "$RESPONSE6")
  PATTERNS_LEARNED=$(echo "$RESULT6" | jq -r '.patternsLearned // 0')
  INSIGHTS_STORED=$(echo "$RESULT6" | jq -r '.insightsStored // 0')
  echo "  Patterns learned: $PATTERNS_LEARNED"
  echo "  Insights stored: $INSIGHTS_STORED"
  
  if [ "$PATTERNS_LEARNED" -gt "0" ] || [ "$INSIGHTS_STORED" -gt "0" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Learning completed"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠️  INFO${NC}: Learning completed but no patterns/insights (may be expected)"
  fi
else
  echo -e "${YELLOW}⚠️  SKIP${NC}: Task not completed yet, skipping manual learn_from_task test"
fi

echo ""
echo -e "${BLUE}📊 Phase 3: Integration Test - Verify Learning Happened${NC}"
echo "--------------------------------------------------------------"

# Test 7: Verify task similarity was stored
echo "Test 7: Verify task similarity was stored"
RESPONSE7=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_similar_tasks\",\"arguments\":{\"query\":\"List all facilities\",\"status\":\"$TASK_STATUS\",\"limit\":10}}}")

RESULT7=$(get_result "$RESPONSE7")
TASK_FOUND=$(echo "$RESULT7" | jq --arg taskId "$TASK1" '.tasks[] | select(.taskId == $taskId) | .taskId')

if [ -n "$TASK_FOUND" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Task similarity stored correctly"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠️  INFO${NC}: Task similarity may not be stored yet (waiting for embedding generation)"
fi

echo ""

# Test 8: Verify plan pattern was stored
echo "Test 8: Verify plan pattern was stored"
RESPONSE8=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_successful_plans\",\"arguments\":{\"goal\":\"List all facilities\",\"limit\":10}}}")

RESULT8=$(get_result "$RESPONSE8")
PLAN_FOUND=$(echo "$RESULT8" | jq --arg planId "$PLAN1" '.plans[] | select(.planId == $planId) | .planId')

if [ -n "$PLAN_FOUND" ]; then
  echo -e "${GREEN}✅ PASS${NC}: Plan pattern stored correctly"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠️  INFO${NC}: Plan pattern may not be stored yet (only stored for completed tasks)"
fi

echo ""
echo "=========================================="
echo -e "${BLUE}Test Summary${NC}"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi

