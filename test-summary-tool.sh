#!/bin/bash

# Test the summarize_task tool
BASE_URL="http://localhost:4000/sse"
AGENT_CONFIG_ID="690a5659a4b5fc8f607f23ac"

echo "🧪 Testing Task Summary Tool"
echo "============================"
echo ""

# Get a completed task
echo "📋 Getting a completed task..."
COMPLETED_TASK=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"list_tasks\",\"arguments\":{\"status\":\"completed\",\"limit\":1}}}" \
  | jq -r '.result.content[0].text' | jq -r '.tasks[0]._id // "none"')

if [ "$COMPLETED_TASK" = "none" ] || [ -z "$COMPLETED_TASK" ]; then
  echo "❌ No completed tasks found. Creating a test task first..."
  
  # Create a simple task
  THOUGHT=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_thoughts\",\"arguments\":{\"userQuery\":\"List all facilities\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" \
    | jq -r '.result.content[0].text' | jq -r '.thoughtId')
  
  PLAN=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"generate_plan\",\"arguments\":{\"thoughtId\":\"$THOUGHT\",\"agentConfigId\":\"$AGENT_CONFIG_ID\",\"enableToolSearch\":true}}}" \
    | jq -r '.result.content[0].text' | jq -r '.planId')
  
  TASK=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"execute_task\",\"arguments\":{\"planId\":\"$PLAN\",\"agentConfigId\":\"$AGENT_CONFIG_ID\"}}}" \
    | jq -r '.result.content[0].text' | jq -r '.taskId')
  
  echo "  Waiting 10 seconds for task to complete..."
  sleep 10
  
  COMPLETED_TASK=$TASK
fi

echo "✅ Using task: $COMPLETED_TASK"
echo ""

# Test 1: Detailed summary
echo "📝 Test 1: Detailed Summary (default)"
echo "--------------------------------------"
SUMMARY1=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"summarize_task\",\"arguments\":{\"taskId\":\"$COMPLETED_TASK\",\"format\":\"detailed\"}}}" \
  | jq -r '.result.content[0].text' | jq -r '.summary // "error"')

if [ "$SUMMARY1" != "error" ] && [ -n "$SUMMARY1" ]; then
  echo "✅ Summary generated successfully"
  echo ""
  echo "Summary preview (first 500 chars):"
  echo "$SUMMARY1" | head -c 500
  echo "..."
else
  echo "❌ Failed to generate summary"
  echo "$SUMMARY1"
fi
echo ""
echo ""

# Test 2: Brief summary
echo "📝 Test 2: Brief Summary"
echo "------------------------"
SUMMARY2=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"summarize_task\",\"arguments\":{\"taskId\":\"$COMPLETED_TASK\",\"format\":\"brief\"}}}" \
  | jq -r '.result.content[0].text' | jq -r '.summary // "error"')

if [ "$SUMMARY2" != "error" ] && [ -n "$SUMMARY2" ]; then
  echo "✅ Brief summary generated successfully"
  echo ""
  echo "Summary preview (first 300 chars):"
  echo "$SUMMARY2" | head -c 300
  echo "..."
else
  echo "❌ Failed to generate brief summary"
fi
echo ""
echo ""

# Test 3: Summary without insights/recommendations
echo "📝 Test 3: Summary without Insights/Recommendations"
echo "----------------------------------------------------"
SUMMARY3=$(curl -s -X POST $BASE_URL -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"summarize_task\",\"arguments\":{\"taskId\":\"$COMPLETED_TASK\",\"format\":\"detailed\",\"includeInsights\":false,\"includeRecommendations\":false}}}" \
  | jq -r '.result.content[0].text' | jq -r '.summary // "error"')

if [ "$SUMMARY3" != "error" ] && [ -n "$SUMMARY3" ]; then
  echo "✅ Summary without insights generated successfully"
  echo ""
  echo "Summary preview (first 300 chars):"
  echo "$SUMMARY3" | head -c 300
  echo "..."
else
  echo "❌ Failed to generate summary without insights"
fi
echo ""
echo ""

echo "✅ Summary tool testing complete!"

