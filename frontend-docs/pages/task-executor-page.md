# Task Executor Page

Complete page implementation for executing and monitoring tasks.

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

function TaskExecutorPage() {
  const [searchParams] = useSearchParams();
  const planIdFromUrl = searchParams.get('planId');

  const [planId, setPlanId] = useState(planIdFromUrl || '');
  const [agentConfigId, setAgentConfigId] = useState('');
  const [agentConfigs, setAgentConfigs] = useState([]);
  const [task, setTask] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userInputs, setUserInputs] = useState({});
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    loadAgentConfigs();
    if (planId) {
      loadPlan();
    }
  }, [planId]);

  useEffect(() => {
    if (task && (task.status === 'in_progress' || task.status === 'paused')) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [task?._id, task?.status]);

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

  const loadPlan = async () => {
    try {
      // You might need a get_plan tool, or fetch directly
      // For now, we'll assume plan data is available
    } catch (err) {
      console.error('Error loading plan:', err);
    }
  };

  const startExecution = async () => {
    if (!planId || !agentConfigId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await callTool('execute_task', {
        planId,
        agentConfigId
      });

      setTask(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (polling || !task?._id) return;

    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const updatedTask = await callTool('get_task', { id: task._id });
        setTask(updatedTask);

        if (updatedTask.status === 'completed' || 
            updatedTask.status === 'failed' || 
            updatedTask.status === 'cancelled') {
          clearInterval(interval);
          setPolling(false);
        }
      } catch (err) {
        console.error('Polling error:', err);
        clearInterval(interval);
        setPolling(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const stopPolling = () => {
    setPolling(false);
  };

  const handleUserInput = (stepId, field, value) => {
    setUserInputs(prev => ({
      ...prev,
      [`${stepId}.${field}`]: value
    }));
  };

  const handleResume = async () => {
    if (!task || !task.pendingUserInputs || task.pendingUserInputs.length === 0) return;

    const inputs = task.pendingUserInputs.map(input => ({
      stepId: input.stepId,
      field: input.field,
      value: userInputs[`${input.stepId}.${input.field}`] || ''
    }));

    // Validate all inputs are provided
    if (inputs.some(inp => !inp.value)) {
      setError('Please provide all required inputs');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await callTool('resume_task', {
        taskId: task._id,
        userInputs: inputs
      });

      setTask(result);
      setUserInputs({});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!task || !plan || !plan.steps) return 0;
    const completedSteps = task.executionHistory?.filter(
      e => e.status === 'completed'
    ).length || 0;
    return (completedSteps / plan.steps.length) * 100;
  };

  return (
    <div className="task-executor-page">
      <header>
        <h1>Task Executor</h1>
        <p>Execute and monitor task execution</p>
      </header>

      <div className="main-content">
        {/* Plan ID Input */}
        <section className="input-section">
          <label>
            Plan ID:
            <input
              type="text"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              placeholder="Enter plan ID or use from URL"
              disabled={loading || polling}
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
              disabled={loading || polling}
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

        {/* Start Execution */}
        {!task && (
          <section className="actions-section">
            <button
              onClick={startExecution}
              disabled={loading || !planId || !agentConfigId}
              className="primary-button"
            >
              {loading ? 'Starting...' : 'Start Execution'}
            </button>
          </section>
        )}

        {/* Error Display */}
        {error && (
          <section className="error-section">
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          </section>
        )}

        {/* Task Status */}
        {task && (
          <section className="task-status-section">
            <h2>Task Status</h2>
            
            <div className="status-info">
              <div className="status-badge">
                <span className={`status-${task.status}`}>{task.status}</span>
              </div>
              <div className="progress-info">
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill"
                    style={{ width: `${calculateProgress()}%` }}
                  />
                </div>
                <div className="progress-text">
                  {task.executionHistory?.filter(e => e.status === 'completed').length || 0} / {plan?.steps?.length || 0} steps completed
                </div>
              </div>
              <div className="task-metadata">
                <div>Task ID: {task._id}</div>
                <div>Plan ID: {task.planId}</div>
                <div>Current Step: {task.currentStepIndex}</div>
                {polling && <div className="polling-indicator">🔄 Polling...</div>}
              </div>
            </div>
          </section>
        )}

        {/* Pending User Inputs */}
        {task && task.pendingUserInputs && task.pendingUserInputs.length > 0 && (
          <section className="user-inputs-section">
            <h2>User Input Required</h2>
            <div className="inputs-form">
              {task.pendingUserInputs.map((input, i) => (
                <div key={i} className="input-field">
                  <label>
                    <strong>{input.description || `${input.stepId}.${input.field}`}</strong>
                    <input
                      type="text"
                      value={userInputs[`${input.stepId}.${input.field}`] || ''}
                      onChange={(e) => handleUserInput(input.stepId, input.field, e.target.value)}
                      placeholder={`Enter ${input.field}`}
                    />
                  </label>
                </div>
              ))}
              <button
                onClick={handleResume}
                disabled={loading}
                className="primary-button"
              >
                Submit & Resume
              </button>
            </div>
          </section>
        )}

        {/* Execution History */}
        {task && task.executionHistory && task.executionHistory.length > 0 && (
          <section className="execution-history-section">
            <h2>Execution History</h2>
            <div className="history-timeline">
              {task.executionHistory.map((entry, i) => (
                <div key={i} className={`history-entry ${entry.status}`}>
                  <div className="entry-header">
                    <span className="entry-step">{entry.stepId}</span>
                    <span className={`entry-status ${entry.status}`}>{entry.status}</span>
                    <span className="entry-time">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    {entry.duration && (
                      <span className="entry-duration">{entry.duration}ms</span>
                    )}
                  </div>
                  
                  {entry.error && (
                    <div className="entry-error">
                      <strong>Error:</strong> {entry.error}
                    </div>
                  )}

                  {entry.output && (
                    <details className="entry-output">
                      <summary>Output</summary>
                      <pre>{JSON.stringify(entry.output, null, 2)}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Step Outputs */}
        {task && task.stepOutputs && Object.keys(task.stepOutputs).length > 0 && (
          <section className="step-outputs-section">
            <h2>Step Outputs</h2>
            <div className="outputs-grid">
              {Object.entries(task.stepOutputs).map(([stepId, output]) => (
                <div key={stepId} className="output-item">
                  <div className="output-step-id">{stepId}</div>
                  <pre>{JSON.stringify(output, null, 2)}</pre>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Final Result */}
        {task && task.status === 'completed' && (
          <section className="result-section success">
            <h2>✅ Task Completed Successfully!</h2>
            <div className="final-outputs">
              <h3>Final Outputs:</h3>
              <pre>{JSON.stringify(task.stepOutputs, null, 2)}</pre>
            </div>
            <div className="result-actions">
              <button
                onClick={() => {
                  // Navigate to task summary or next step
                  window.location.href = `/task-summary?taskId=${task._id}`;
                }}
                className="primary-button"
              >
                View Summary
              </button>
            </div>
          </section>
        )}

        {/* Task Failed */}
        {task && task.status === 'failed' && (
          <section className="result-section error">
            <h2>❌ Task Failed</h2>
            <div className="error-details">
              <strong>Error:</strong> {task.error || 'Unknown error'}
            </div>
            <div className="result-actions">
              <button
                onClick={() => {
                  // Try to refine plan
                  window.location.href = `/refine-plan?planId=${task.planId}`;
                }}
                className="secondary-button"
              >
                Refine Plan
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default TaskExecutorPage;
```

## Styling (CSS)

```css
.task-executor-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.task-status-section {
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 4px;
}

.status-badge {
  margin-bottom: 15px;
}

.status-badge .status {
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: bold;
  display: inline-block;
}

.status-pending {
  background: #e9ecef;
  color: #6c757d;
}

.status-in_progress {
  background: #cfe2ff;
  color: #084298;
}

.status-paused {
  background: #fff3cd;
  color: #856404;
}

.status-completed {
  background: #d1e7dd;
  color: #0f5132;
}

.status-failed {
  background: #f8d7da;
  color: #842029;
}

.progress-bar-container {
  width: 100%;
  height: 30px;
  background: #e9ecef;
  border-radius: 15px;
  overflow: hidden;
  margin: 10px 0;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  margin-top: 5px;
  font-weight: 500;
}

.polling-indicator {
  animation: pulse 1.5s infinite;
  color: #007bff;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.user-inputs-section {
  margin: 20px 0;
  padding: 20px;
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 4px;
}

.inputs-form .input-field {
  margin-bottom: 15px;
}

.inputs-form input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-top: 5px;
}

.history-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-entry {
  padding: 15px;
  background: white;
  border-radius: 4px;
  border-left: 4px solid #007bff;
}

.history-entry.completed {
  border-left-color: #28a745;
}

.history-entry.failed {
  border-left-color: #dc3545;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.entry-step {
  font-weight: bold;
  color: #007bff;
}

.entry-status {
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
}

.entry-status.completed {
  background: #d4edda;
  color: #155724;
}

.entry-status.failed {
  background: #f8d7da;
  color: #721c24;
}

.entry-error {
  color: #dc3545;
  margin-top: 10px;
  padding: 10px;
  background: #f8d7da;
  border-radius: 4px;
}

.outputs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.output-item {
  padding: 15px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.output-step-id {
  font-weight: bold;
  margin-bottom: 10px;
  color: #007bff;
}

.result-section {
  margin: 30px 0;
  padding: 20px;
  border-radius: 4px;
}

.result-section.success {
  background: #d1e7dd;
  border: 2px solid #28a745;
}

.result-section.error {
  background: #f8d7da;
  border: 2px solid #dc3545;
}
```

## Features

- Real-time task monitoring with polling
- Progress visualization
- User input collection
- Execution history timeline
- Step outputs display
- Error handling and recovery
- Navigation to refinement or summary

