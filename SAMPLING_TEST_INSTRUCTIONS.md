# MCP Sampling - Testing Instructions

This guide provides step-by-step instructions for testing the new AI-powered sampling tools using the MCP Inspector.

## Prerequisites

- Node.js installed
- MongoDB running locally or remotely
- Server dependencies installed (`npm install`)
- Existing test data in your MongoDB database

## Step 1: Verify Test Data

Before testing, ensure you have data in your database. You can check with existing tools:

```bash
# Start the server
npm run dev
```

In another terminal:

```bash
# Connect Inspector
npx @modelcontextprotocol/inspector http://localhost:3000/sse
```

Use the Inspector to:
1. Call `list_facilities` - note at least one facility ID
2. Call `list_shipments` - note at least one shipment ID
3. Verify you have some data to analyze

If you don't have test data, create some using the existing CRUD tools (create_facility, create_shipment, etc.).

## Step 2: Start the Server

```bash
cd /Users/yab/Projects/v5-clear-ai/mcp-server
npm run dev
```

Expected output:
```
[INFO] MCP Server running on http://localhost:3000
[INFO] MCP endpoint: http://localhost:3000/sse
[INFO] Health check: http://localhost:3000/health
[INFO] Total tools available: 33
[INFO] [Sampling] Callback registered
```

Key indicator: You should see **"[Sampling] Callback registered"** in the logs.

## Step 3: Connect MCP Inspector

In a new terminal window:

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/sse
```

The Inspector will:
1. Open a web interface (usually at http://localhost:5173)
2. Connect to your MCP server
3. List all available tools

## Step 4: Test Tool #1 - Generate Intelligent Facility Report

### Using Inspector UI

1. In the Inspector, find and select: **`generate_intelligent_facility_report`**

2. Fill in the parameters:
   - **facilityId**: Use a real facility ID from your database (e.g., `690605d1279af4bcf42f9ea2`)
   - **includeRecommendations**: `true` (optional)

3. Click **"Execute Tool"** or equivalent button

### Expected Behavior

**In Inspector:**
- Tool execution starts
- After a few seconds, you receive a JSON response
- Response includes:
  - Facility information
  - Calculated metrics (inspections, contamination, shipments)
  - AI analysis section with health score and insights
  - Raw data arrays

**In Server Logs:**
```
[INFO] [MCP] Handling tools/call for: generate_intelligent_facility_report
[INFO] [Sampling Tool] Generating intelligent report for facility: 690605d1279af4bcf42f9ea2
[INFO] [Sampling] Processing request: sampling-1234567890-abc123
[INFO] [Sampling] Request sampling-1234567890-abc123 completed successfully
```

### Sample Response Structure

```json
{
  "reportId": "RPT-1699234567890",
  "generatedAt": "2024-11-05T10:30:00.000Z",
  "facility": {
    "id": "690605d1279af4bcf42f9ea2",
    "name": "Central Processing Facility",
    "location": "Rotterdam",
    "shortCode": "CPF-01"
  },
  "metrics": {
    "inspections": {
      "total": 25,
      "accepted": 22,
      "acceptanceRate": "88.00%"
    },
    "contamination": {
      "total": 8,
      "highRisk": 2,
      "riskPercentage": "25.00%"
    }
  },
  "aiAnalysis": {
    "rawAnalysis": "Based on the facility data analysis:\n\n1. **Overall Health Score: 78/100**...",
    "timestamp": "2024-11-05T10:30:05.000Z"
  }
}
```

### Verification Checklist

- [ ] Tool executes without errors
- [ ] Response includes facility information
- [ ] Metrics are calculated correctly
- [ ] `aiAnalysis` section is present (not an error message)
- [ ] AI analysis includes health score, concerns, and risk level
- [ ] If `includeRecommendations` was true, recommendations are included
- [ ] Server logs show sampling request and completion

## Step 5: Test Tool #2 - Analyze Shipment Risk

### Using Inspector UI

1. Select tool: **`analyze_shipment_risk`**

2. Fill in parameters:
   - **shipmentId**: Use a real shipment ID from your database

3. Execute the tool

### Expected Behavior

**In Inspector:**
- Tool returns risk assessment JSON
- Includes risk score, indicators, factors, and recommendations
- Processing takes 2-5 seconds

**In Server Logs:**
```
[INFO] [Sampling Tool] Analyzing shipment risk: 65f9876543210fedcba98765
[INFO] [Sampling] Processing request: sampling-1234567891-xyz789
[INFO] [Sampling] Request sampling-1234567891-xyz789 completed successfully
```

### Sample Response Structure

```json
{
  "shipmentId": "65f9876543210fedcba98765",
  "assessedAt": "2024-11-05T10:35:00.000Z",
  "shipment": {
    "source": "Industrial Metals Inc",
    "licensePlate": "AB-123-CD",
    "duration": "45 minutes"
  },
  "riskIndicators": {
    "currentContaminants": 2,
    "highRiskContaminants": 1
  },
  "aiRiskScore": {
    "score": 65,
    "reasoning": "Moderate risk level due to detected contaminants..."
  },
  "riskFactors": [...],
  "recommendedActions": [...]
}
```

### Verification Checklist

- [ ] Tool executes without errors
- [ ] Response includes shipment details
- [ ] Risk indicators are calculated
- [ ] `aiRiskScore` object has `score` (0-100) and `reasoning`
- [ ] Risk factors array is populated
- [ ] Recommended actions are provided
- [ ] Server logs show risk scoring request

### Testing Different Risk Levels

Try shipments with:
- **No contaminants** - Should show low risk
- **Some contaminants** - Should show moderate risk
- **High-risk contaminants** - Should show high risk score

## Step 6: Test Tool #3 - Suggest Inspection Questions

### Using Inspector UI

1. Select tool: **`suggest_inspection_questions`**

2. Fill in parameters:
   - **facilityId**: Use a facility ID with some history

3. Execute the tool

### Expected Behavior

**In Inspector:**
- Tool returns inspection checklist JSON
- Includes focus area selection and customized questions
- Takes 3-7 seconds (two sampling requests: elicitation + question generation)

**In Server Logs:**
```
[INFO] [Sampling Tool] Generating inspection questions for facility: 690605d1279af4bcf42f9ea2
[INFO] [Sampling] Processing request: sampling-1234567892-choice
[INFO] [Sampling] Choice selected: Contamination levels
[INFO] [Sampling] Processing request: sampling-1234567893-questions
[INFO] [Sampling] Request sampling-1234567893-questions completed successfully
```

### Sample Response Structure

```json
{
  "facilityId": "690605d1279af4bcf42f9ea2",
  "facilityName": "Central Processing Facility",
  "generatedAt": "2024-11-05T10:40:00.000Z",
  "focusArea": "Contamination levels",
  "selectionMethod": "AI-assisted",
  "facilityMetrics": {
    "recentContaminants": 15,
    "acceptanceRate": "82.5%",
    "avgProcessingTime": "38 minutes",
    "complianceIssues": 2
  },
  "inspectionQuestions": [
    "Are contamination detection systems functioning properly?",
    "What protocols are in place for high-risk contamination events?",
    "Review recent contamination logs - are patterns emerging?",
    "..."
  ],
  "additionalNotes": [
    "High contamination activity - extra vigilance required"
  ]
}
```

### Verification Checklist

- [ ] Tool executes without errors
- [ ] Response includes facility metrics
- [ ] Focus area is selected (one of: Contamination, Acceptance, Processing, Compliance)
- [ ] `selectionMethod` indicates AI-assisted or metric-based
- [ ] `inspectionQuestions` array has 5-7 questions
- [ ] Questions are specific and actionable
- [ ] Additional notes may be present based on metrics
- [ ] Server logs show two sampling requests (choice + questions)

## Step 7: Verify Sampling Flow in Logs

Review your server terminal. You should see sampling lifecycle:

```
[INFO] [MCP] Handling tools/call for: generate_intelligent_facility_report
[INFO] [Sampling Tool] Generating intelligent report for facility: xxx
[INFO] [Sampling] Making request sampling-1699234567890-abc123
[DEBUG] [Sampling] Request prompt: Analyze this facility and provide:...
[INFO] [Sampling] Processing request: sampling-1699234567890-abc123
[INFO] [Sampling] Request sampling-1699234567890-abc123 completed successfully
[DEBUG] [Sampling] Response: Based on the facility data analysis:...
```

Key log patterns:
- `Making request` - Sampling utility initiates request
- `Processing request` - Mock callback receives request
- `completed successfully` - Sampling returns response

## Step 8: Test Error Scenarios

### Test with Invalid ID

1. Try `generate_intelligent_facility_report` with invalid facility ID
2. Expected: Error response indicating facility not found
3. Tool should fail gracefully with clear error message

### Test with Empty Data

1. Create a new facility with no related data
2. Run all three tools on this facility
3. Expected: Tools complete successfully with zero counts
4. AI should handle low-data scenarios

## Step 9: Performance Testing

Run each tool multiple times and observe:

- **Response time**: Should be 2-10 seconds depending on data volume
- **Memory usage**: Monitor server process memory
- **Log volume**: Ensure logs are reasonable (not excessive)

## Troubleshooting

### Problem: "Sampling not available" in response

**Cause**: Sampling callback not registered

**Solution**:
1. Restart server
2. Check for "[Sampling] Callback registered" in startup logs
3. Verify no errors during server initialization

### Problem: Tool times out after 30 seconds

**Cause**: Database query too slow or sampling hung

**Solution**:
1. Check MongoDB connection and performance
2. Reduce data volume in test environment
3. Check server logs for specific error

### Problem: AI analysis is generic/doesn't match data

**Cause**: Using mock AI implementation

**Explanation**: This is expected behavior! The mock AI provides reasonable generic responses for testing. In production, replace with real AI integration.

### Problem: Inspector can't connect

**Cause**: Server not running or wrong port

**Solution**:
1. Verify server is running: `curl http://localhost:3000/health`
2. Check port in config (default: 3000)
3. Ensure no firewall blocking localhost

## Success Criteria

You've successfully tested sampling if:

✅ All three tools execute without errors  
✅ Responses include both data and AI analysis  
✅ Server logs show sampling requests and completions  
✅ AI analysis sections are populated (not error messages)  
✅ Tools handle edge cases gracefully (invalid IDs, empty data)  
✅ Performance is acceptable (< 10 seconds per request)

## Next Steps

After successful testing:

1. **Experiment with prompts** - Modify prompts in `src/tools/samplingTools.ts`
2. **Add custom tools** - Create your own sampling-powered tools
3. **Production integration** - Replace mock AI with real model integration
4. **Monitor performance** - Track sampling usage and response times

## Additional Testing Commands

### Check Server Health
```bash
curl http://localhost:3000/health
```

### List All Tools (including new ones)
Use Inspector UI or direct API:
```bash
curl -X POST http://localhost:3000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

Should show 33+ tools including the 3 new sampling tools.

### View Real-time Logs
```bash
tail -f logs/app.log
```

## Support

If you encounter issues:

1. Check server logs for detailed error messages
2. Review the [Sampling Guide](docs/docs/guides/sampling-guide.md)
3. Verify MongoDB connection and data
4. Test with different facility/shipment IDs
5. Ensure all dependencies are installed

---

**Happy Testing!** 🎉

The sampling implementation demonstrates how MCP servers can leverage client AI for intelligent operations. Once you've verified everything works, you're ready to build more sophisticated AI-powered tools.

