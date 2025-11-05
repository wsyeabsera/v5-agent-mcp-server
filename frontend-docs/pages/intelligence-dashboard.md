# Intelligence Dashboard Page

Complete dashboard for memory, benchmarks, insights, and smart features.

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

function IntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState('memory');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Memory state
  const [memoryQuery, setMemoryQuery] = useState('');
  const [memoryResults, setMemoryResults] = useState(null);

  // Benchmark state
  const [benchmarks, setBenchmarks] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);

  // Insights state
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadPerformanceMetrics(),
        loadAgentInsights()
      ]);
    } catch (err) {
      console.error('Error loading initial data:', err);
    }
  };

  const loadPerformanceMetrics = async () => {
    try {
      const metrics = await callTool('get_performance_metrics', {
        metricType: 'success_rate',
        period: 'day'
      });
      setPerformanceMetrics(metrics);
    } catch (err) {
      console.error('Error loading metrics:', err);
    }
  };

  const loadAgentInsights = async () => {
    try {
      const result = await callTool('get_agent_insights', {
        agentType: 'executor',
        limit: 10
      });
      setInsights(result.insights || []);
    } catch (err) {
      console.error('Error loading insights:', err);
    }
  };

  const handleMemoryQuery = async () => {
    if (!memoryQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await callTool('query_memory', {
        query: memoryQuery,
        memoryTypes: ['patterns', 'tool_memory', 'insights'],
        limit: 10
      });
      setMemoryResults(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="intelligence-dashboard">
      <header>
        <h1>Intelligence Dashboard</h1>
        <p>Memory, benchmarks, insights, and smart features</p>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={activeTab === 'memory' ? 'active' : ''}
          onClick={() => setActiveTab('memory')}
        >
          Memory
        </button>
        <button
          className={activeTab === 'benchmarks' ? 'active' : ''}
          onClick={() => setActiveTab('benchmarks')}
        >
          Benchmarks
        </button>
        <button
          className={activeTab === 'insights' ? 'active' : ''}
          onClick={() => setActiveTab('insights')}
        >
          Insights
        </button>
        <button
          className={activeTab === 'performance' ? 'active' : ''}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
      </div>

      {/* Memory Tab */}
      {activeTab === 'memory' && (
        <div className="tab-content">
          <section className="memory-query-section">
            <h2>Query Memory</h2>
            <div className="query-input">
              <input
                type="text"
                value={memoryQuery}
                onChange={(e) => setMemoryQuery(e.target.value)}
                placeholder="Query memory... e.g., 'create facility'"
                onKeyPress={(e) => e.key === 'Enter' && handleMemoryQuery()}
              />
              <button
                onClick={handleMemoryQuery}
                disabled={loading || !memoryQuery.trim()}
              >
                Query
              </button>
            </div>

            {memoryResults && (
              <div className="memory-results">
                {memoryResults.patterns && memoryResults.patterns.length > 0 && (
                  <div className="results-section">
                    <h3>Patterns ({memoryResults.patterns.length})</h3>
                    {memoryResults.patterns.map((pattern, i) => (
                      <div key={i} className="pattern-item">
                        <div className="pattern-type">{pattern.patternType}</div>
                        <div className="pattern-content">
                          {JSON.stringify(pattern.pattern, null, 2)}
                        </div>
                        <div className="pattern-metrics">
                          Success Rate: {(pattern.successMetrics.successRate * 100).toFixed(0)}%
                          | Confidence: {(pattern.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {memoryResults.toolMemory && memoryResults.toolMemory.length > 0 && (
                  <div className="results-section">
                    <h3>Tool Memory ({memoryResults.toolMemory.length})</h3>
                    {memoryResults.toolMemory.map((tool, i) => (
                      <div key={i} className="tool-memory-item">
                        <div className="tool-name">{tool.toolName}</div>
                        <div className="tool-stats">
                          Success Rate: {(tool.successRate * 100).toFixed(0)}%
                          | Avg Duration: {tool.avgDuration}ms
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {memoryResults.insights && memoryResults.insights.length > 0 && (
                  <div className="results-section">
                    <h3>Insights ({memoryResults.insights.length})</h3>
                    {memoryResults.insights.map((insight, i) => (
                      <div key={i} className="insight-item">
                        <div className="insight-type">{insight.insightType}</div>
                        <div className="insight-text">{insight.insight}</div>
                        <div className="insight-confidence">
                          Confidence: {(insight.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Benchmarks Tab */}
      {activeTab === 'benchmarks' && (
        <div className="tab-content">
          <section className="benchmarks-section">
            <h2>Benchmarks</h2>
            <div className="benchmark-actions">
              <button
                onClick={() => window.location.href = '/benchmark-runner'}
                className="primary-button"
              >
                Run Benchmark Suite
              </button>
              <button
                onClick={loadPerformanceMetrics}
                className="secondary-button"
              >
                Refresh Metrics
              </button>
            </div>

            {performanceMetrics && (
              <div className="metrics-display">
                <h3>Performance Metrics</h3>
                <div className="metrics-grid">
                  <div className="metric-card">
                    <div className="metric-label">Success Rate</div>
                    <div className="metric-value">
                      {(performanceMetrics.value * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-label">Period</div>
                    <div className="metric-value">{performanceMetrics.period}</div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="tab-content">
          <section className="insights-section">
            <h2>Agent Insights</h2>
            
            {insights.length > 0 ? (
              <div className="insights-list">
                {insights.map((insight, i) => (
                  <div key={i} className="insight-card">
                    <div className="insight-header">
                      <span className="insight-type-badge">{insight.insightType}</span>
                      <span className="insight-confidence">
                        {(insight.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="insight-text">{insight.insight}</div>
                    {insight.appliesTo && (
                      <div className="insight-applies-to">
                        <strong>Applies to:</strong> {insight.appliesTo.agents?.join(', ') || 'All'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                No insights available yet. Insights are generated as tasks are executed.
              </div>
            )}
          </section>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="tab-content">
          <section className="performance-section">
            <h2>Performance Overview</h2>
            
            {performanceMetrics ? (
              <div className="performance-charts">
                <div className="chart-placeholder">
                  <h3>Success Rate Over Time</h3>
                  <p>Chart visualization would go here</p>
                  <div className="chart-data">
                    <pre>{JSON.stringify(performanceMetrics, null, 2)}</pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                No performance data available. Run benchmarks to collect metrics.
              </div>
            )}
          </section>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

export default IntelligenceDashboard;
```

## Styling (CSS)

```css
.intelligence-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #e9ecef;
}

.tabs button {
  padding: 10px 20px;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.tabs button.active {
  border-bottom-color: #007bff;
  color: #007bff;
  font-weight: bold;
}

.tab-content {
  margin-top: 20px;
}

.memory-query-section {
  margin-bottom: 30px;
}

.query-input {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.query-input input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.memory-results {
  margin-top: 20px;
}

.results-section {
  margin-bottom: 30px;
}

.pattern-item,
.tool-memory-item,
.insight-item {
  padding: 15px;
  background: white;
  border-radius: 4px;
  margin-bottom: 10px;
  border-left: 4px solid #007bff;
}

.pattern-type {
  font-weight: bold;
  color: #007bff;
  margin-bottom: 10px;
}

.pattern-content {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
  font-family: monospace;
  font-size: 12px;
}

.pattern-metrics {
  margin-top: 10px;
  color: #6c757d;
  font-size: 14px;
}

.tool-name {
  font-weight: bold;
  margin-bottom: 5px;
}

.tool-stats {
  color: #6c757d;
  font-size: 14px;
}

.insight-card {
  padding: 15px;
  background: white;
  border-radius: 4px;
  margin-bottom: 15px;
  border-left: 4px solid #28a745;
}

.insight-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.insight-type-badge {
  padding: 3px 8px;
  background: #e7f3ff;
  color: #007bff;
  border-radius: 3px;
  font-size: 12px;
}

.insight-confidence {
  color: #28a745;
  font-weight: bold;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.metric-card {
  padding: 20px;
  background: white;
  border-radius: 4px;
  text-align: center;
  border: 1px solid #e9ecef;
}

.metric-label {
  color: #6c757d;
  font-size: 14px;
  margin-bottom: 10px;
}

.metric-value {
  font-size: 32px;
  font-weight: bold;
  color: #007bff;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #6c757d;
  background: #f8f9fa;
  border-radius: 4px;
}

.error-banner {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 20px;
  background: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
  z-index: 1000;
}
```

## Features

- Tabbed interface for different intelligence features
- Memory query and results display
- Benchmark metrics visualization
- Agent insights display
- Performance charts (placeholder)
- Real-time data loading
- Error handling

