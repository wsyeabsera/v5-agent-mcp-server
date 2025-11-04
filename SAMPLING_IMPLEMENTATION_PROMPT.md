# MCP Server Sampling Implementation Task

## Context

I have a working MCP server for waste management at `/Users/yab/Projects/v5-clear-ai/mcp-server`. It currently has:
- 30+ CRUD tools (facilities, contracts, shipments, contaminants, inspections)
- 4 static resources (facility://list, stats://overview, activity://recent, contaminant://summary)
- Dynamic resources (facility://{id}, contract://{id})
- 4 prompts for AI-assisted analysis
- Built with Node.js, TypeScript, MongoDB, and MCP SDK

## Goal

Add **sampling** and **elicitation** capabilities to the MCP server so it can request AI assistance from connected clients during tool execution. This enables the server to perform intelligent operations by leveraging the client's AI.

## What to Implement

### 1. Add Sampling Support to MCP Server

**Update `src/index.ts`:**
- Enable sampling in the MCP server initialization
- Add sampling request handler that the server can call

**Create new sampling-powered tools in `src/tools/`:**

#### Tool 1: `generate_intelligent_facility_report`
- Parameters: `facilityId` (required), `includeRecommendations` (boolean, optional)
- Behavior:
  1. Fetch facility data (details, inspections, contaminants, shipments)
  2. Use **sampling** to request AI analysis with prompt:
     ```
     Analyze this facility and provide:
     1. Overall health score (0-100)
     2. Top 3 concerns
     3. Compliance risk level (low/medium/high)
     4. [if includeRecommendations] 3 actionable recommendations
     
     Data: {facility details, metrics}
     ```
  3. Combine raw data + AI insights into structured report
  4. Return comprehensive report object

#### Tool 2: `analyze_shipment_risk`
- Parameters: `shipmentId` (required)
- Behavior:
  1. Fetch shipment + related contaminants + source history
  2. Use **sampling** to request AI risk assessment:
     ```
     Assess risk level for this shipment based on:
     - Source history
     - Detected contaminants
     - Similar past shipments
     
     Provide: Risk score (0-100), risk factors, recommended actions
     
     Data: {shipment details}
     ```
  3. Return structured risk assessment

#### Tool 3: `suggest_inspection_questions` (demonstrates elicitation)
- Parameters: `facilityId` (required)
- Behavior:
  1. Fetch facility recent activity
  2. Use **elicitation** (like multiple-choice) to ask client:
     ```
     Based on this facility's history, which area needs most attention?
     A) Contamination levels
     B) Acceptance rates
     C) Processing times
     D) Waste type compliance
     ```
  3. Based on choice, use sampling to generate targeted inspection questions
  4. Return customized inspection checklist

### 2. Update Existing Prompts to Use Sampling (Optional Enhancement)

Modify these prompts in `src/prompts/index.ts` to optionally use sampling:
- `analyze-facility-compliance` - Could sample for deeper insights
- `generate-contamination-report` - Could sample for risk scoring

### 3. Add Sampling Utility Module

Create `src/utils/sampling.ts`:
```typescript
// Helper functions for common sampling patterns
- requestAnalysis(prompt: string, data: any): Promise<string>
- requestRiskScore(context: string): Promise<{score: number, reasoning: string}>
- elicitChoice(question: string, options: string[]): Promise<string>
```

### 4. Testing Requirements

Create test files in a new `tests/` directory:

#### `tests/sampling-tools.test.ts`
- Test `generate_intelligent_facility_report` with mock sampling
- Test `analyze_shipment_risk` with different risk scenarios
- Test `suggest_inspection_questions` with mock elicitation
- Test error handling when sampling fails
- Test timeout scenarios

#### `tests/sampling-integration.test.ts`
- Test real sampling flow with MCP Inspector
- Test multiple sampling calls in one tool execution
- Test sampling with different model responses
- Test concurrent sampling requests

#### Test with Real Data
- Use existing test facilities (ID: 690605d1279af4bcf42f9ea2, 690605d1279af4bcf42f9ea4)
- Create test scenarios for high-risk vs low-risk shipments
- Verify sampling responses are properly integrated

### 5. Documentation

**Create `docs/SAMPLING_GUIDE.md`:**
- What is sampling and why we added it
- How to use the 3 new sampling-powered tools
- Examples of sampling requests and responses
- How to test sampling with MCP Inspector
- Architecture diagram showing sampling flow
- Best practices for adding more sampling tools

**Update `README.md`:**
- Add section on intelligent/AI-powered tools
- List the 3 new tools
- Link to sampling guide

**Create `docs/API_SAMPLING.md`:**
- Technical documentation for sampling implementation
- API reference for sampling utilities
- Error handling patterns
- Performance considerations

### 6. MCP Inspector Testing Instructions

**Create `SAMPLING_TEST_INSTRUCTIONS.md`:**
- Step-by-step guide to test sampling tools with MCP Inspector
- Expected behavior for each tool
- How to verify sampling requests are working
- Screenshots/examples of successful sampling flows

## Technical Requirements

1. **MCP SDK Version:** Use latest `@modelcontextprotocol/sdk` that supports sampling
2. **TypeScript:** Maintain strict typing throughout
3. **Error Handling:** Graceful fallbacks if sampling fails
4. **Timeouts:** Sampling requests should timeout after 30 seconds
5. **Logging:** Log all sampling requests/responses for debugging
6. **Build:** Update build scripts to include new files
7. **Type Safety:** Export proper types for sampling responses

## Success Criteria

- [ ] 3 new sampling-powered tools working correctly
- [ ] Tools handle sampling failures gracefully
- [ ] All tests passing (unit + integration)
- [ ] Documentation complete and clear
- [ ] MCP Inspector can successfully trigger sampling
- [ ] No breaking changes to existing tools
- [ ] Build succeeds without errors
- [ ] Proper TypeScript types for all new code

## Files to Create/Modify

**Create:**
- `src/tools/samplingTools.ts` (3 new tools)
- `src/utils/sampling.ts` (helper utilities)
- `tests/sampling-tools.test.ts` (unit tests)
- `tests/sampling-integration.test.ts` (integration tests)
- `docs/SAMPLING_GUIDE.md` (user documentation)
- `docs/API_SAMPLING.md` (technical documentation)
- `SAMPLING_TEST_INSTRUCTIONS.md` (testing guide)

**Modify:**
- `src/index.ts` (enable sampling, export new tools)
- `src/tools/index.ts` (export new sampling tools)
- `README.md` (add sampling features section)
- `package.json` (update test scripts if needed)

## Notes

- Keep existing functionality intact - this is additive only
- Use the memory pattern: tests should clear data between runs
- Follow existing code style and patterns in the codebase
- Sampling is asynchronous - handle promises properly
- Consider token costs - don't over-sample unnecessarily

## Questions to Resolve During Implementation

1. Should sampling have a fallback if client doesn't support it?
2. What's the max timeout for sampling requests?
3. Should we cache sampling results for identical requests?
4. How verbose should sampling logs be?

Please implement this with full testing coverage and comprehensive documentation. The goal is to demonstrate MCP sampling capabilities in a real-world waste management context.

