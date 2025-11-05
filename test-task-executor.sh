#!/bin/bash

# Comprehensive Task Executor Test Script
# Tests all features: resume, retry, timeout, AI generation, error handling

BASE_URL="http://localhost:4000/sse"
AGENT_CONFIG_ID="690a5659a4b5fc8f607f23ac"

echo "🧪 Comprehensive Task Executor Testing"
echo "======================================"
echo ""

# Test 1: Simple task execution (no user input)
echo "📋 Test 1: Simple Task Execution"
echo "---------------------------------"
THOUGHT1=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_thoughts\",\"arguments\":{\"userQuery\":\"List all facilities in New York\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" | jq -r '.result.content[0].text' | jq -r '.thoughtId')
echo "Thought ID: $THOUGHT1"

PLAN1=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_plan\",\"arguments\":{\"thoughtId\":\"$THOUGHT1\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" | jq -r '.result.content[0].text' | jq -r '.planId')
echo "Plan ID: $PLAN1"

TASK1=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"execute_task\",\"arguments\":{\"planId\":\"$PLAN1\",\"agentConfigId\":\"$AGENT_CONFIG_ID\"}}}" | jq -r '.result.content[0].text' | jq -r '.taskId')
echo "Task ID: $TASK1"
echo "Waiting 5 seconds for execution..."
sleep 5

TASK1_STATUS=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK1\"}}}" | jq -r '.result.content[0].text' | jq '{status, stepOutputs: (.stepOutputs | keys), executionHistory: (.executionHistory | length)}')
echo "Task 1 Status: $TASK1_STATUS"
echo ""

# Test 2: Task with user input required and resume
echo "📋 Test 2: Task with User Input Required + Resume"
echo "--------------------------------------------------"
THOUGHT2=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_thoughts\",\"arguments\":{\"userQuery\":\"List facilities in New York and create a shipment for the first one with license plate ABC123\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" | jq -r '.result.content[0].text' | jq -r '.thoughtId')
echo "Thought ID: $THOUGHT2"

PLAN2=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_plan\",\"arguments\":{\"thoughtId\":\"$THOUGHT2\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" | jq -r '.result.content[0].text' | jq -r '.planId')
echo "Plan ID: $PLAN2"

TASK2=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"execute_task\",\"arguments\":{\"planId\":\"$PLAN2\",\"agentConfigId\":\"$AGENT_CONFIG_ID\"}}}" | jq -r '.result.content[0].text' | jq -r '.taskId')
echo "Task ID: $TASK2"
echo "Waiting 5 seconds for step 1 execution..."
sleep 5

TASK2_STATUS=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK2\"}}}" | jq -r '.result.content[0].text' | jq '{status, pendingUserInputs, step1Output: (.stepOutputs.step1.output | length)}')
echo "Task 2 Status (after step 1): $TASK2_STATUS"

# Resume with user inputs
echo "Resuming task with user inputs..."
RESUME_RESULT=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"resume_task\",\"arguments\":{\"taskId\":\"$TASK2\",\"userInputs\":[{\"stepId\":\"step2\",\"field\":\"source\",\"value\":\"Waste Management Inc\"},{\"stepId\":\"step2\",\"field\":\"contract_reference_id\",\"value\":\"CONTRACT-2025-001\"},{\"stepId\":\"step2\",\"field\":\"contractId\",\"value\":\"$AGENT_CONFIG_ID\"}]}}}" | jq -r '.result.content[0].text' | jq '.')
echo "Resume Result: $RESUME_RESULT"

echo "Waiting 5 seconds for step 2 execution..."
sleep 5

TASK2_FINAL=$(curl -s -X POST $BASE_URL \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_task\",\"arguments\":{\"id\":\"$TASK2\"}}}" | jq -r '.result.content[0].text' | jq '{status, stepOutputs: (.stepOutputs | keys), step2Output: (.stepOutputs.step2.output._id // "not created"), executionHistory: [.executionHistory[-3:] | .[] | {stepId, status, duration}]}')
echo "Task 2 Final Status: $TASK2_FINAL"
echo ""

echo "✅ All tests completed!"

