# Agent Workflow Page

Complete workflow page combining Thought → Plan → Task Execution in one interface.

## Full Page Component

```jsx
import React, { useState } from 'react';
import ThoughtGenerator from '../components/ThoughtGenerator';
import PlanBuilder from '../components/PlanBuilder';
import TaskExecutor from '../components/TaskExecutor';

function AgentWorkflowPage() {
  const [agentConfigId, setAgentConfigId] = useState('');
  const [agentConfigs, setAgentConfigs] = useState([]);
  const [currentStep, setCurrentStep] = useState('thought');
  const [thought, setThought] = useState(null);
  const [plan, setPlan] = useState(null);
  const [task, setTask] = useState(null);

  useEffect(() => {
    loadAgentConfigs();
  }, []);

  const loadAgentConfigs = async () => {
    try {
      const configs = await callTool('list_agent_configs', { isEnabled: true });
      setAgentConfigs(configs);
      if (configs.length > 0) {
        setAgentConfigId(configs[0]._id);
      }
    } catch (err) {
      console.error('Error loading agent configs:', err);
    }
  };

  const handleThoughtGenerated = (thoughtData) => {
    setThought(thoughtData);
    setCurrentStep('plan');
  };

  const handlePlanGenerated = (planData) => {
    setPlan(planData);
    setCurrentStep('execution');
  };

  const handleTaskStarted = (taskData) => {
    setTask(taskData);
  };

  const handleReset = () => {
    setThought(null);
    setPlan(null);
    setTask(null);
    setCurrentStep('thought');
  };

  return (
    <div className="agent-workflow-page">
      <header>
        <h1>Agent Workflow</h1>
        <p>Complete workflow: Generate Thought → Create Plan → Execute Task</p>
      </header>

      {/* Configuration */}
      <section className="config-section">
        <label>
          Agent Configuration:
          <select
            value={agentConfigId}
            onChange={(e) => setAgentConfigId(e.target.value)}
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

      {/* Progress Indicator */}
      <div className="workflow-progress">
        <div className={`progress-step ${currentStep === 'thought' ? 'active' : thought ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Generate Thought</div>
          {thought && <div className="step-check">✓</div>}
        </div>
        <div className="progress-connector" />
        <div className={`progress-step ${currentStep === 'plan' ? 'active' : plan ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Create Plan</div>
          {plan && <div className="step-check">✓</div>}
        </div>
        <div className="progress-connector" />
        <div className={`progress-step ${currentStep === 'execution' ? 'active' : task ? 'in-progress' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Execute Task</div>
          {task?.status === 'completed' && <div className="step-check">✓</div>}
        </div>
      </div>

      {/* Step 1: Thought Generation */}
      {currentStep === 'thought' && (
        <section className="workflow-step">
          <h2>Step 1: Generate Thought</h2>
          <ThoughtGenerator
            agentConfigId={agentConfigId}
            onThoughtGenerated={handleThoughtGenerated}
          />
        </section>
      )}

      {/* Step 2: Plan Generation */}
      {currentStep === 'plan' && thought && (
        <section className="workflow-step">
          <h2>Step 2: Create Plan</h2>
          <div className="step-navigation">
            <button onClick={() => setCurrentStep('thought')} className="back-button">
              ← Back to Thought
            </button>
          </div>
          <PlanBuilder
            thoughtId={thought._id}
            agentConfigId={agentConfigId}
            onPlanGenerated={handlePlanGenerated}
          />
        </section>
      )}

      {/* Step 3: Task Execution */}
      {currentStep === 'execution' && plan && (
        <section className="workflow-step">
          <h2>Step 3: Execute Task</h2>
          <div className="step-navigation">
            <button onClick={() => setCurrentStep('plan')} className="back-button">
              ← Back to Plan
            </button>
            <button onClick={handleReset} className="reset-button">
              Start Over
            </button>
          </div>
          <TaskExecutor
            planId={plan._id}
            agentConfigId={agentConfigId}
            onTaskStarted={handleTaskStarted}
          />
        </section>
      )}

      {/* Summary (when task is complete) */}
      {task && task.status === 'completed' && (
        <section className="workflow-summary">
          <h2>✅ Workflow Complete!</h2>
          <div className="summary-info">
            <div><strong>Thought ID:</strong> {thought?._id}</div>
            <div><strong>Plan ID:</strong> {plan?._id}</div>
            <div><strong>Task ID:</strong> {task._id}</div>
            <div><strong>Status:</strong> {task.status}</div>
          </div>
          <div className="summary-actions">
            <button onClick={handleReset} className="primary-button">
              Start New Workflow
            </button>
            <button
              onClick={() => {
                window.location.href = `/task-summary?taskId=${task._id}`;
              }}
              className="secondary-button"
            >
              View Task Summary
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default AgentWorkflowPage;
```

## Styling (CSS)

```css
.agent-workflow-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.workflow-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 40px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  min-width: 150px;
}

.step-number {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #e9ecef;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 20px;
  margin-bottom: 10px;
  transition: all 0.3s ease;
}

.progress-step.active .step-number {
  background: #007bff;
  color: white;
  transform: scale(1.1);
}

.progress-step.completed .step-number {
  background: #28a745;
  color: white;
}

.step-label {
  font-weight: 500;
  color: #6c757d;
  text-align: center;
}

.progress-step.active .step-label {
  color: #007bff;
  font-weight: bold;
}

.step-check {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: #28a745;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.progress-connector {
  width: 100px;
  height: 3px;
  background: #e9ecef;
  margin: 0 20px;
  position: relative;
  top: -25px;
}

.workflow-step {
  margin: 40px 0;
  padding: 30px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.step-navigation {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.back-button,
.reset-button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.back-button:hover {
  background: #f8f9fa;
}

.reset-button {
  color: #dc3545;
  border-color: #dc3545;
}

.reset-button:hover {
  background: #dc3545;
  color: white;
}

.workflow-summary {
  margin: 40px 0;
  padding: 30px;
  background: #d1e7dd;
  border: 2px solid #28a745;
  border-radius: 8px;
  text-align: center;
}

.summary-info {
  margin: 20px 0;
  text-align: left;
  display: inline-block;
}

.summary-info div {
  margin: 10px 0;
}

.summary-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  justify-content: center;
}
```

## Features

- Complete workflow in one page
- Progress indicator showing current step
- Navigation between steps
- State management across steps
- Summary view when complete
- Reset functionality
- Integration with individual components

## Component Integration

This page uses the individual components:
- `ThoughtGenerator` - From thought-generator-page.md
- `PlanBuilder` - From plan-builder-page.md
- `TaskExecutor` - From task-executor-page.md

Extract the main logic from those pages into reusable components.

