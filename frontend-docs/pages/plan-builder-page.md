# Plan Builder Page

Complete page implementation for creating and viewing plans from thoughts.

## Full Page Component

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const API_BASE = 'http://localhost:4000/sse';

async function callTool(toolName, arguments) {
  const response = await axios.post(API_BASE, {
    jsonrpc: '2.0',
    id: Math.random().toString(36),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments
    }
  });

  if (response.data.result.isError) {
    const errorText = JSON.parse(response.data.result.content[0].text);
    throw new Error(errorText);
  }

  return JSON.parse(response.data.result.content[0].text);
}

function PlanBuilderPage() {
  const [searchParams] = useSearchParams();
  const thoughtIdFromUrl = searchParams.get('thoughtId');

  const [thoughtId, setThoughtId] = useState(thoughtIdFromUrl || '');
  const [agentConfigId, setAgentConfigId] = useState('');
  const [agentConfigs, setAgentConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const [qualityPrediction, setQualityPrediction] = useState(null);

  useEffect(() => {
    loadAgentConfigs();
    if (thoughtId) {
      generatePlan();
    }
  }, [thoughtId]);

  const loadAgentConfigs = async () => {
    try {
      const configs = await callTool('list_agent_configs', { isEnabled: true });
      setAgentConfigs(configs);
      if (configs.length > 0 && !agentConfigId) {
        setAgentConfigId(configs[0]._id);
      }
    } catch (err) {
      console.error('Error loading agent configs:', err);
    }
  };

  const generatePlan = async () => {
    if (!thoughtId || !agentConfigId) return;

    setLoading(true);
    setError(null);
    setPlan(null);
    setQualityPrediction(null);

    try {
      const result = await callTool('generate_plan', {
        thoughtId,
        agentConfigId,
        enableToolSearch: true
      });

      setPlan(result);

      // Get quality prediction
      try {
        const prediction = await callTool('predict_plan_quality', {
          planId: result._id
        });
        setQualityPrediction(prediction.prediction);
      } catch (predErr) {
        console.warn('Could not get quality prediction:', predErr);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="plan-builder-page">
      <header>
        <h1>Plan Builder</h1>
        <p>Create executable plans from thoughts</p>
      </header>

      <div className="main-content">
        {/* Thought ID Input */}
        <section className="input-section">
          <label>
            Thought ID:
            <input
              type="text"
              value={thoughtId}
              onChange={(e) => setThoughtId(e.target.value)}
              placeholder="Enter thought ID or use from URL"
              disabled={loading}
            />
          </label>
        </section>

        {/* Configuration */}
        <section className="config-section">
          <label>
            Agent Configuration:
            <select
              value={agentConfigId}
              onChange={(e) => setAgentConfigId(e.target.value)}
              disabled={loading}
            >
              <option value="">Select agent config...</option>
              {agentConfigs.map(config => (
                <option key={config._id} value={config._id}>
                  {config.availableModelId}
                </option>
              ))}
            </select>
          </label>
        </section>

        {/* Actions */}
        <section className="actions-section">
          <button
            onClick={generatePlan}
            disabled={loading || !thoughtId || !agentConfigId}
            className="primary-button"
          >
            {loading ? 'Generating Plan...' : 'Generate Plan'}
          </button>
        </section>

        {/* Error Display */}
        {error && (
          <section className="error-section">
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          </section>
        )}

        {/* Quality Prediction */}
        {qualityPrediction && (
          <section className="quality-section">
            <h2>Quality Prediction</h2>
            <div className="quality-indicator">
              <div className="quality-score">
                Success Probability: {(qualityPrediction.successProbability * 100).toFixed(0)}%
              </div>
              <div className="quality-confidence">
                Confidence: {(qualityPrediction.confidence * 100).toFixed(0)}%
              </div>
              <div className={`risk-level ${qualityPrediction.riskLevel}`}>
                Risk Level: {qualityPrediction.riskLevel}
              </div>
            </div>

            {qualityPrediction.riskFactors && qualityPrediction.riskFactors.length > 0 && (
              <div className="risk-factors">
                <strong>Risk Factors:</strong>
                <ul>
                  {qualityPrediction.riskFactors.map((factor, i) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {qualityPrediction.recommendations && qualityPrediction.recommendations.length > 0 && (
              <div className="recommendations">
                <strong>Recommendations:</strong>
                <ul>
                  {qualityPrediction.recommendations.map((rec, i) => (
                    <li key={i}>{rec.message || rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Plan Result */}
        {plan && (
          <section className="plan-section">
            <h2>Generated Plan</h2>
            
            <div className="plan-info">
              <div><strong>Plan ID:</strong> {plan._id}</div>
              <div><strong>Goal:</strong> {plan.goal}</div>
              <div><strong>Status:</strong> <span className={`status-${plan.status}`}>{plan.status}</span></div>
              <div><strong>Steps:</strong> {plan.steps.length}</div>
            </div>

            {/* Missing Data Warning */}
            {plan.missingData && plan.missingData.length > 0 && (
              <div className="missing-data warning">
                <h3>⚠️ Missing Data Required</h3>
                <ul>
                  {plan.missingData.map((data, i) => (
                    <li key={i}>
                      <strong>Step:</strong> {data.step}<br />
                      <strong>Field:</strong> {data.field}<br />
                      <strong>Type:</strong> {data.type}<br />
                      {data.description && (
                        <>
                          <strong>Description:</strong> {data.description}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Plan Steps */}
            <div className="plan-steps">
              <h3>Plan Steps</h3>
              <ol className="steps-list">
                {plan.steps.map((step, index) => (
                  <li key={step.id} className="plan-step">
                    <div className="step-header">
                      <span className="step-number">Step {step.order}</span>
                      <span className="step-action">{step.action}</span>
                      <span className={`step-status ${step.status}`}>{step.status}</span>
                    </div>
                    
                    {step.dependencies.length > 0 && (
                      <div className="step-dependencies">
                        <small>Depends on: {step.dependencies.join(', ')}</small>
                      </div>
                    )}

                    <div className="step-parameters">
                      <details>
                        <summary>Parameters</summary>
                        <pre>{JSON.stringify(step.parameters, null, 2)}</pre>
                      </details>
                    </div>

                    {step.expectedOutput && Object.keys(step.expectedOutput).length > 0 && (
                      <div className="step-expected-output">
                        <details>
                          <summary>Expected Output</summary>
                          <pre>{JSON.stringify(step.expectedOutput, null, 2)}</pre>
                        </details>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>

            {/* Visual Step Dependencies */}
            <div className="step-dependency-graph">
              <h3>Step Dependencies</h3>
              <div className="dependency-visualization">
                {plan.steps.map((step) => (
                  <div key={step.id} className="dependency-node">
                    <div className="node-label">{step.order}</div>
                    {step.dependencies.length > 0 && (
                      <div className="node-dependencies">
                        {step.dependencies.map(dep => (
                          <span key={dep} className="dep-arrow">← {dep}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps */}
            <div className="next-steps">
              <h3>Next Steps</h3>
              <button
                onClick={() => {
                  window.location.href = `/task-executor?planId=${plan._id}`;
                }}
                className="primary-button"
                disabled={plan.missingData && plan.missingData.length > 0}
              >
                Execute Plan
              </button>
              {plan.missingData && plan.missingData.length > 0 && (
                <p className="warning-text">
                  Please provide missing data before executing
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default PlanBuilderPage;
```

## Styling (CSS)

```css
.plan-builder-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.quality-section {
  margin: 20px 0;
  padding: 15px;
  background: #e7f3ff;
  border-radius: 4px;
  border-left: 4px solid #007bff;
}

.quality-score {
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 10px;
}

.risk-level {
  padding: 5px 10px;
  border-radius: 4px;
  display: inline-block;
  margin-top: 10px;
}

.risk-level.low {
  background: #d4edda;
  color: #155724;
}

.risk-level.medium {
  background: #fff3cd;
  color: #856404;
}

.risk-level.high {
  background: #f8d7da;
  color: #721c24;
}

.plan-section {
  margin-top: 30px;
}

.plan-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.status-pending {
  color: #6c757d;
}

.status-in_progress {
  color: #007bff;
}

.status-completed {
  color: #28a745;
}

.missing-data.warning {
  padding: 15px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  margin: 20px 0;
}

.steps-list {
  list-style: none;
  padding: 0;
}

.plan-step {
  margin: 15px 0;
  padding: 15px;
  background: white;
  border-radius: 4px;
  border-left: 4px solid #007bff;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.step-number {
  font-weight: bold;
  color: #007bff;
}

.step-action {
  flex: 1;
  margin-left: 10px;
  font-weight: 500;
}

.step-status {
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
}

.step-status.pending {
  background: #e9ecef;
}

.step-status.completed {
  background: #d4edda;
  color: #155724;
}

.step-dependencies {
  margin: 10px 0;
  color: #6c757d;
  font-style: italic;
}

.step-parameters,
.step-expected-output {
  margin-top: 10px;
}

.step-parameters pre,
.step-expected-output pre {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

.dependency-visualization {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.dependency-node {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  min-width: 80px;
  text-align: center;
}

.node-label {
  font-weight: bold;
  font-size: 18px;
  color: #007bff;
}

.dep-arrow {
  display: block;
  font-size: 12px;
  color: #6c757d;
  margin-top: 5px;
}
```

## Features

- Thought ID input (from URL or manual)
- Plan generation with loading states
- Quality prediction display
- Step-by-step plan visualization
- Dependency visualization
- Missing data warnings
- Navigation to task executor
- Error handling

