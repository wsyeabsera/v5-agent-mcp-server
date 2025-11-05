# Thought Generator Page

Complete page implementation for generating thoughts from user queries.

## Full Page Component

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

function ThoughtGeneratorPage() {
  const [query, setQuery] = useState('');
  const [agentConfigId, setAgentConfigId] = useState('');
  const [agentConfigs, setAgentConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [thought, setThought] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  // Load agent configs on mount
  useEffect(() => {
    loadAgentConfigs();
    loadThoughtHistory();
  }, []);

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

  const loadThoughtHistory = async () => {
    try {
      // Load recent thoughts (you might need a list_thoughts tool)
      // For now, we'll skip this
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const handleGenerate = async () => {
    if (!query.trim() || !agentConfigId) return;

    setLoading(true);
    setError(null);
    setThought(null);

    try {
      const result = await callTool('generate_thoughts', {
        userQuery: query,
        agentConfigId,
        enableToolSearch: true
      });

      setThought(result);
      setHistory(prev => [result, ...prev].slice(0, 10)); // Keep last 10
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setThought(null);
    setError(null);
  };

  return (
    <div className="thought-generator-page">
      <header>
        <h1>Thought Generator</h1>
        <p>Generate structured thoughts from natural language queries</p>
      </header>

      <div className="main-content">
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
                  {config.availableModelId} (Max: {config.maxTokenCount} tokens)
                </option>
              ))}
            </select>
          </label>
        </section>

        {/* Query Input */}
        <section className="query-section">
          <label>
            User Query:
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your query... e.g., 'Create a facility inspection for facility ABC'"
              rows={6}
              disabled={loading}
            />
          </label>
        </section>

        {/* Actions */}
        <section className="actions-section">
          <button
            onClick={handleGenerate}
            disabled={loading || !query.trim() || !agentConfigId}
            className="primary-button"
          >
            {loading ? 'Generating...' : 'Generate Thoughts'}
          </button>
          <button
            onClick={handleClear}
            disabled={loading}
            className="secondary-button"
          >
            Clear
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

        {/* Thought Result */}
        {thought && (
          <section className="result-section">
            <h2>Generated Thought</h2>
            
            <div className="thought-info">
              <div><strong>Thought ID:</strong> {thought._id}</div>
              <div><strong>Query:</strong> {thought.userQuery}</div>
              <div><strong>Primary Approach:</strong> {thought.primaryApproach}</div>
            </div>

            {/* Thoughts List */}
            <div className="thoughts-list">
              <h3>Thoughts ({thought.thoughts.length})</h3>
              {thought.thoughts.map((t, i) => (
                <div key={i} className="thought-item">
                  <div className="thought-header">
                    <span className="thought-id">Thought {i + 1}</span>
                    <span className="confidence">
                      Confidence: {(t.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  
                  <div className="thought-reasoning">
                    <strong>Reasoning:</strong>
                    <p>{t.reasoning}</p>
                  </div>

                  {t.approaches.length > 0 && (
                    <div className="thought-approaches">
                      <strong>Approaches:</strong>
                      <ul>
                        {t.approaches.map((approach, j) => (
                          <li key={j}>{approach}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {t.constraints.length > 0 && (
                    <div className="thought-constraints">
                      <strong>Constraints:</strong>
                      <ul>
                        {t.constraints.map((constraint, j) => (
                          <li key={j}>{constraint}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {t.assumptions.length > 0 && (
                    <div className="thought-assumptions">
                      <strong>Assumptions:</strong>
                      <ul>
                        {t.assumptions.map((assumption, j) => (
                          <li key={j}>{assumption}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {t.uncertainties.length > 0 && (
                    <div className="thought-uncertainties">
                      <strong>Uncertainties:</strong>
                      <ul>
                        {t.uncertainties.map((uncertainty, j) => (
                          <li key={j}>{uncertainty}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Key Insights */}
            {thought.keyInsights && thought.keyInsights.length > 0 && (
              <div className="key-insights">
                <h3>Key Insights</h3>
                <ul>
                  {thought.keyInsights.map((insight, i) => (
                    <li key={i}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Tools */}
            {thought.recommendedTools && thought.recommendedTools.length > 0 && (
              <div className="recommended-tools">
                <h3>Recommended Tools</h3>
                <ul>
                  {thought.recommendedTools.map((tool, i) => (
                    <li key={i}>{tool}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            <div className="next-steps">
              <h3>Next Steps</h3>
              <button
                onClick={() => {
                  // Navigate to plan builder with this thought
                  window.location.href = `/plan-builder?thoughtId=${thought._id}`;
                }}
                className="primary-button"
              >
                Create Plan from Thought
              </button>
            </div>
          </section>
        )}

        {/* History */}
        {history.length > 0 && (
          <section className="history-section">
            <h2>Recent Thoughts</h2>
            <ul className="history-list">
              {history.map((h, i) => (
                <li key={i} className="history-item">
                  <div className="history-query">{h.userQuery}</div>
                  <div className="history-actions">
                    <button
                      onClick={() => {
                        setThought(h);
                        setQuery(h.userQuery);
                      }}
                      className="small-button"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => {
                        window.location.href = `/plan-builder?thoughtId=${h._id}`;
                      }}
                      className="small-button"
                    >
                      Create Plan
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export default ThoughtGeneratorPage;
```

## Styling (CSS)

```css
.thought-generator-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.thought-generator-page header {
  margin-bottom: 30px;
}

.config-section,
.query-section,
.actions-section {
  margin-bottom: 20px;
}

.query-section textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.primary-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
}

.primary-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.secondary-button {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.error-section {
  margin: 20px 0;
  padding: 15px;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  color: #721c24;
}

.result-section {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 4px;
}

.thought-item {
  margin: 20px 0;
  padding: 15px;
  background: white;
  border-radius: 4px;
  border-left: 4px solid #007bff;
}

.thought-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.confidence {
  font-weight: bold;
  color: #28a745;
}

.history-section {
  margin-top: 30px;
}

.history-list {
  list-style: none;
  padding: 0;
}

.history-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  margin: 5px 0;
  background: #f8f9fa;
  border-radius: 4px;
}

.small-button {
  padding: 5px 10px;
  font-size: 12px;
  margin-left: 5px;
}
```

## Features

- Query input with textarea
- Agent configuration selection
- Real-time thought generation
- Detailed thought display with all fields
- History of recent thoughts
- Error handling
- Navigation to plan builder
- Loading states

## Integration

This page can be integrated with:
- Plan builder page (pass thought ID)
- Task executor page (complete workflow)
- Agent workflow page (step 1 of workflow)

