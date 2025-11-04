# Quick Start - MCP Sampling Tools

## 🚀 Start Testing in 3 Steps

### Step 1: Start the Server
```bash
cd /Users/yab/Projects/v5-clear-ai/mcp-server
npm run dev
```

Wait for: `[INFO] [Sampling] Callback registered`

### Step 2: Open Inspector
In a new terminal:
```bash
npx @modelcontextprotocol/inspector http://localhost:3000/sse
```

This will open a web interface (usually at http://localhost:5173)

### Step 3: Test the Tools

#### Test 1: Generate Intelligent Facility Report
1. Select tool: `generate_intelligent_facility_report`
2. Parameters:
   ```json
   {
     "facilityId": "6905db9211cc522275d5f013",
     "includeRecommendations": true
   }
   ```
3. Click Execute
4. **Expected:** Report with health score, concerns, risk level, and recommendations

#### Test 2: Analyze Shipment Risk
1. Select tool: `analyze_shipment_risk`
2. Parameters:
   ```json
   {
     "shipmentId": "6905db9211cc522275d5f018"
   }
   ```
3. Click Execute
4. **Expected:** Risk score (0-100) with reasoning and recommended actions

#### Test 3: Suggest Inspection Questions
1. Select tool: `suggest_inspection_questions`
2. Parameters:
   ```json
   {
     "facilityId": "6905db9211cc522275d5f013"
   }
   ```
3. Click Execute
4. **Expected:** 5-7 customized inspection questions with focus area

## 📋 Available Test IDs

Use these IDs from your existing test data:
- **Facility ID:** `6905db9211cc522275d5f013` (Hannover)
- **Shipment ID:** `6905db9211cc522275d5f018` (Industrial District A)

To find more IDs, use:
- `list_facilities` - Get all facility IDs
- `list_shipments` - Get all shipment IDs

## ✅ What Success Looks Like

### Tool 1: Facility Report
```json
{
  "reportId": "RPT-...",
  "facility": { "name": "Hannover", ... },
  "metrics": {
    "inspections": { "acceptanceRate": "100.00%" },
    "contamination": { "total": 1, "highRisk": 1 }
  },
  "aiAnalysis": {
    "rawAnalysis": "Overall Health Score: 78/100\n..."
  }
}
```

### Tool 2: Shipment Risk
```json
{
  "shipmentId": "...",
  "aiRiskScore": {
    "score": 65,
    "reasoning": "Moderate risk level due to..."
  },
  "riskFactors": [...],
  "recommendedActions": [...]
}
```

### Tool 3: Inspection Questions
```json
{
  "focusArea": "Contamination levels",
  "selectionMethod": "AI-assisted",
  "inspectionQuestions": [
    "Are contamination detection systems functioning properly?",
    ...
  ]
}
```

## 🔍 What to Look For

1. **Execution Time:** Should be < 1 second for each tool
2. **AI Analysis:** Look for the `aiAnalysis` or `aiRiskScore` fields
3. **No Errors:** Response should not have `"isError": true`
4. **Server Logs:** Check terminal for `[Sampling] Processing request` messages

## 🐛 Troubleshooting

### Server Not Starting?
```bash
# Check if MongoDB is running
curl http://localhost:3000/health
```

### Inspector Not Connecting?
```bash
# Verify server is accessible
curl http://localhost:3000/
```

### Tool Errors?
- Make sure you're using valid IDs from your database
- Check server logs for detailed error messages
- Try `list_facilities` or `list_shipments` first to get valid IDs

## 📚 Full Documentation

- **[Sampling Guide](docs/docs/guides/sampling-guide.md)** - Complete guide
- **[Test Instructions](SAMPLING_TEST_INSTRUCTIONS.md)** - Detailed testing
- **[Test Results](SAMPLING_TEST_RESULTS.md)** - Verification results
- **[Implementation Summary](SAMPLING_IMPLEMENTATION_COMPLETE.md)** - What was built

## 🎯 Next Steps

After verifying the tools work:

1. **Explore the code** in `src/tools/samplingTools.ts`
2. **Customize prompts** for your use case
3. **Add new sampling tools** using the utilities
4. **Integrate with real AI** when ready for production

---

**That's it!** You now have AI-powered waste management tools using MCP Sampling. 🎉

