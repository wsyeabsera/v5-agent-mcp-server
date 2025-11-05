import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logger } from '../utils/logger.js';
import {
  createSuccessResponse,
  createErrorResponse,
  handleToolError,
} from '../utils/toolHelpers.js';
import {
  getSimilarTasksSchema,
  getSuccessfulPlansSchema,
  getToolPerformanceSchema,
  getAgentInsightsSchema,
  learnFromTaskSchema,
} from './schemas/historySchemas.js';
import {
  TaskSimilarity,
  PlanPattern,
  ToolPerformance,
  AgentInsight,
  Task,
  Plan,
} from '../models/index.js';
import { generateEmbedding } from '../utils/embeddings.js';
import {
  searchSimilarTasks,
  upsertTaskEmbedding,
} from '../utils/pinecone.js';
import {
  extractQueryPattern,
  extractPlanPattern,
  extractGoalPattern,
  calculateSuccessMetrics,
  generatePatternId,
  calculateSuccessRate,
  extractCommonIssues,
} from '../utils/patternExtractor.js';

// ========== History Query Tools ==========
export const historyTools = {
  get_similar_tasks: {
    description:
      'Find past tasks with similar queries/goals using semantic similarity search. Returns tasks with similarity scores.',
    inputSchema: zodToJsonSchema(getSimilarTasksSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getSimilarTasksSchema>) => {
      try {
        const validatedArgs = getSimilarTasksSchema.parse(args);
        const { query, goal, limit = 10, status, minSimilarity = 0.7 } = validatedArgs;

        logger.info(`[get_similar_tasks] Searching for similar tasks (query: ${query}, goal: ${goal})`);

        // Check if Pinecone is configured
        if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_TASKS_INDEX_NAME) {
          // Fallback to MongoDB text search if Pinecone not available
          const mongoQuery: any = {};
          if (query) {
            mongoQuery.$text = { $search: query };
          }
          if (goal) {
            mongoQuery.goal = { $regex: goal, $options: 'i' };
          }
          if (status) {
            mongoQuery.status = status;
          }

          const tasks = await TaskSimilarity.find(mongoQuery)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

          return createSuccessResponse({
            tasks: tasks.map(t => ({
              taskId: t.taskId,
              query: t.originalQuery,
              goal: t.goal,
              status: t.status,
              similarity: 0.5, // Default similarity for text search
              executionTime: t.successMetrics.executionTime,
              successMetrics: t.successMetrics,
              createdAt: t.createdAt,
            })),
            count: tasks.length,
            message: 'Results from MongoDB text search (Pinecone not configured)',
          });
        }

        // Use vector similarity search
        const searchText = query || goal || '';
        if (!searchText) {
          return createErrorResponse('Either query or goal must be provided');
        }

        // Generate embedding for search
        let queryEmbedding: number[];
        try {
          queryEmbedding = await generateEmbedding(searchText);
        } catch (error: any) {
          logger.error('[get_similar_tasks] Error generating embedding:', error);
          return createErrorResponse(
            `Failed to generate embedding: ${error.message}. Make sure Ollama is running locally.`
          );
        }

        // Search Pinecone
        const pineconeResults = await searchSimilarTasks(queryEmbedding, limit * 2, {
          status,
          minSimilarity,
        });

        // Fetch full task details from MongoDB
        const taskIds = pineconeResults.map(r => r.taskId);
        const taskSimilarities = await TaskSimilarity.find({
          taskId: { $in: taskIds },
        }).lean();

        // Combine Pinecone results with MongoDB data
        const tasks = pineconeResults
          .map(pineconeResult => {
            const taskData = taskSimilarities.find(t => t.taskId === pineconeResult.taskId);
            if (!taskData) return null;

            return {
              taskId: taskData.taskId,
              query: taskData.originalQuery,
              goal: taskData.goal,
              status: taskData.status,
              similarity: pineconeResult.score,
              executionTime: taskData.successMetrics.executionTime,
              successMetrics: taskData.successMetrics,
              createdAt: taskData.createdAt,
            };
          })
          .filter(t => t !== null)
          .slice(0, limit);

        return createSuccessResponse({
          tasks,
          count: tasks.length,
          message: 'Similar tasks found using vector similarity search',
        });
      } catch (error: any) {
        logger.error('[get_similar_tasks] Error:', error);
        return handleToolError(error, 'getting similar tasks');
      }
    },
  },

  get_successful_plans: {
    description:
      'Find plans that worked well for similar goals. Returns plans with success rates and usage metrics.',
    inputSchema: zodToJsonSchema(getSuccessfulPlansSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getSuccessfulPlansSchema>) => {
      try {
        const validatedArgs = getSuccessfulPlansSchema.parse(args);
        const { goal, limit = 5, minSuccessRate = 0.8 } = validatedArgs;

        logger.info(`[get_successful_plans] Searching for successful plans matching goal: ${goal}`);

        // Extract goal pattern for matching
        const goalPattern = extractGoalPattern(goal);

        // Find matching plan patterns
        const patterns = await PlanPattern.find({
          $or: [
            { goalPattern: { $regex: goalPattern, $options: 'i' } },
            { goalPattern: { $regex: goal, $options: 'i' } },
          ],
          successRate: { $gte: minSuccessRate },
        })
          .sort({ successRate: -1, usageCount: -1, lastUsed: -1 })
          .limit(limit)
          .lean();

        // Find actual plans that match these patterns or goal
        const plans = await Plan.find({
          $or: [
            { goal: { $regex: goal, $options: 'i' } },
            { goal: { $regex: goalPattern, $options: 'i' } },
          ],
          status: 'completed',
        })
          .sort({ createdAt: -1 })
          .limit(limit * 2) // Get more to match with patterns
          .lean();

        // Combine pattern data with plan data
        const result = plans.map(plan => {
          const matchingPattern = patterns.find(p => {
            const planSteps = extractPlanPattern(plan as any);
            return p.stepSequence.join(',') === planSteps.join(',');
          });

          return {
            planId: plan._id.toString(),
            goal: plan.goal,
            steps: plan.steps.map(s => ({
              id: s.id,
              action: s.action,
              order: s.order,
            })),
            successRate: matchingPattern?.successRate || 0.5,
            avgExecutionTime: matchingPattern?.avgExecutionTime || 0,
            usageCount: matchingPattern?.usageCount || 0,
            lastUsed: matchingPattern?.lastUsed || plan.createdAt,
          };
        });

        return createSuccessResponse({
          plans: result,
          count: result.length,
          message: 'Successful plans found',
        });
      } catch (error: any) {
        logger.error('[get_successful_plans] Error:', error);
        return handleToolError(error, 'getting successful plans');
      }
    },
  },

  get_tool_performance: {
    description:
      'Get performance metrics for a specific tool including success rate, average duration, common errors, and recommendations.',
    inputSchema: zodToJsonSchema(getToolPerformanceSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getToolPerformanceSchema>) => {
      try {
        const validatedArgs = getToolPerformanceSchema.parse(args);
        const { toolName, context } = validatedArgs;

        logger.info(`[get_tool_performance] Getting performance for tool: ${toolName}`);

        const toolPerf = await ToolPerformance.findOne({ toolName }).lean();

        if (!toolPerf) {
          return createSuccessResponse({
            toolName,
            totalExecutions: 0,
            successRate: 0,
            avgDuration: 0,
            successCount: 0,
            failureCount: 0,
            commonErrors: [],
            optimalContexts: [],
            recommendations: ['Tool has not been used yet. No performance data available.'],
            message: 'No performance data found for this tool',
          });
        }

        // Use new structure with performance object
        const perf = toolPerf.performance || {
          totalExecutions: 0,
          successCount: 0,
          failureCount: 0,
          successRate: 0,
          avgDuration: 0,
          avgRetries: 0,
        };

        // Filter optimal contexts by context if provided
        const optimalContexts = context
          ? toolPerf.optimalContexts?.filter((c: any) => c.context === context) || []
          : toolPerf.optimalContexts || [];

        // Calculate error percentages
        const commonErrors = (toolPerf.commonErrors || []).map((err: any) => ({
          error: err.error,
          frequency: err.frequency,
          percentage: err.percentage || (perf.totalExecutions > 0
            ? (err.frequency / perf.totalExecutions) * 100
            : 0),
          contexts: err.contexts || (err.context ? [err.context] : []),
          solutions: err.solutions || [],
        }));

        // Generate recommendations from stored recommendations or generate new ones
        const recommendations: string[] = toolPerf.recommendations?.map((r: any) => r.message) || [];
        
        if (recommendations.length === 0) {
          // Generate basic recommendations if none stored
          if (perf.successRate < 0.5) {
            recommendations.push('Low success rate. Consider reviewing tool usage patterns.');
          }
          if (perf.avgDuration > 5000) {
            recommendations.push('High average duration. Tool may need optimization.');
          }
          if (commonErrors.length > 0) {
            recommendations.push(`Common errors detected: ${commonErrors[0].error}`);
          }
          if (optimalContexts.length > 0) {
            recommendations.push(
              `Works best in contexts: ${optimalContexts.map((c: any) => c.context).join(', ')}`
            );
          }
        }

        return createSuccessResponse({
          toolName: toolPerf.toolName,
          totalExecutions: perf.totalExecutions,
          successRate: perf.successRate,
          avgDuration: perf.avgDuration,
          successCount: perf.successCount,
          failureCount: perf.failureCount,
          avgRetries: perf.avgRetries,
          commonErrors,
          optimalContexts: optimalContexts.map((c: any) => ({
            context: c.context,
            successRate: c.successRate,
            avgDuration: c.avgDuration,
            usageCount: c.usageCount,
          })),
          parameterInsights: toolPerf.parameterInsights || [],
          recommendations,
          message: 'Tool performance data retrieved',
        });
      } catch (error: any) {
        logger.error('[get_tool_performance] Error:', error);
        return handleToolError(error, 'getting tool performance');
      }
    },
  },

  get_agent_insights: {
    description:
      'Get learned insights from a specific agent type including patterns, optimizations, and warnings.',
    inputSchema: zodToJsonSchema(getAgentInsightsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getAgentInsightsSchema>) => {
      try {
        const validatedArgs = getAgentInsightsSchema.parse(args);
        const { agentType, insightType, limit = 10 } = validatedArgs;

        logger.info(`[get_agent_insights] Getting insights for agent: ${agentType}, type: ${insightType || 'all'}`);

        const query: any = { agentType };
        if (insightType) {
          query.insightType = insightType;
        }

        const insights = await AgentInsight.find(query)
          .sort({ confidence: -1, createdAt: -1 })
          .limit(limit)
          .lean();

        return createSuccessResponse({
          insights: insights.map((i: any) => ({
            insightType: i.insightType,
            insight: i.insight,
            confidence: i.confidence,
            evidence: i.evidence,
            createdAt: i.createdAt,
            validatedAt: i.validatedAt,
          })),
          count: insights.length,
          message: 'Agent insights retrieved',
        });
      } catch (error: any) {
        logger.error('[get_agent_insights] Error:', error);
        return handleToolError(error, 'getting agent insights');
      }
    },
  },

  learn_from_task: {
    description:
      'Store learnings from a completed task. Extracts patterns, updates tool performance metrics, and generates insights. This is typically called automatically after task completion.',
    inputSchema: zodToJsonSchema(learnFromTaskSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof learnFromTaskSchema>) => {
      try {
        const validatedArgs = learnFromTaskSchema.parse(args);
        const { taskId, planId, status, metrics, insights = [] } = validatedArgs;

        logger.info(`[learn_from_task] Learning from task ${taskId} (status: ${status})`);

        // Get task and plan
        const task = await Task.findById(taskId);
        const plan = await Plan.findById(planId);

        if (!task) {
          return createErrorResponse(`Task not found: ${taskId}`);
        }
        if (!plan) {
          return createErrorResponse(`Plan not found: ${planId}`);
        }

        // Extract query and goal patterns
        const queryPattern = extractQueryPattern(plan.userQuery);
        const goalPattern = extractGoalPattern(plan.goal);
        const stepSequence = extractPlanPattern(plan);

        // Store task similarity data
        const taskSimilarity = await TaskSimilarity.findOneAndUpdate(
          { taskId },
          {
            taskId,
            originalQuery: plan.userQuery,
            goal: plan.goal,
            planId,
            status: status as 'completed' | 'failed' | 'paused',
            successMetrics: metrics,
          },
          { upsert: true, new: true }
        );

        // Store embedding in Pinecone if configured
        if (process.env.PINECONE_API_KEY && process.env.PINECONE_TASKS_INDEX_NAME) {
          try {
            const queryText = `${plan.userQuery} ${plan.goal}`;
            const embedding = await generateEmbedding(queryText);
            await upsertTaskEmbedding(
              taskId,
              plan.userQuery,
              plan.goal,
              embedding,
              status as 'completed' | 'failed' | 'paused'
            );
            await TaskSimilarity.findOneAndUpdate(
              { taskId },
              { embeddingId: taskId }
            );
          } catch (error: any) {
            logger.warn(`[learn_from_task] Failed to store embedding for task ${taskId}:`, error.message);
          }
        }

        // Update tool performance metrics
        for (const step of plan.steps) {
          // Find the latest execution history entry for this step
          const stepHistoryEntries = task.executionHistory
            .filter(e => e.stepId === step.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          if (stepHistoryEntries.length === 0) continue;

          const stepHistory = stepHistoryEntries[0]; // Latest entry
          const isSuccess = stepHistory.status === 'completed';
          const duration = stepHistory.duration || 0;

          // Update tool performance with new structure
          const toolPerf = await ToolPerformance.findOne({ toolName: step.action });
          
          if (toolPerf) {
            // Update performance metrics
            const newTotal = toolPerf.performance.totalExecutions + 1;
            const newSuccessCount = toolPerf.performance.successCount + (isSuccess ? 1 : 0);
            const newFailureCount = toolPerf.performance.failureCount + (isSuccess ? 0 : 1);
            const newSuccessRate = newSuccessCount / newTotal;
            const newAvgDuration = (
              (toolPerf.performance.avgDuration * toolPerf.performance.totalExecutions) + duration
            ) / newTotal;

            toolPerf.performance.totalExecutions = newTotal;
            toolPerf.performance.successCount = newSuccessCount;
            toolPerf.performance.failureCount = newFailureCount;
            toolPerf.performance.successRate = newSuccessRate;
            toolPerf.performance.avgDuration = newAvgDuration;

            // Update common errors
            if (!isSuccess && stepHistory.error) {
              const errorIndex = toolPerf.commonErrors.findIndex(
                (e: any) => e.error === stepHistory.error?.substring(0, 200)
              );
              if (errorIndex >= 0) {
                toolPerf.commonErrors[errorIndex].frequency += 1;
                toolPerf.commonErrors[errorIndex].percentage = (toolPerf.commonErrors[errorIndex].frequency / newTotal) * 100;
              } else {
                toolPerf.commonErrors.push({
                  error: stepHistory.error.substring(0, 200),
                  frequency: 1,
                  percentage: (1 / newTotal) * 100,
                  contexts: [plan.goal],
                  solutions: [],
                });
              }
            }

            toolPerf.lastUpdated = new Date();
            await toolPerf.save();
          } else {
            // Create new tool performance record with new structure
            await ToolPerformance.create({
              toolName: step.action,
              performance: {
                totalExecutions: 1,
                successCount: isSuccess ? 1 : 0,
                failureCount: isSuccess ? 0 : 1,
                successRate: isSuccess ? 1.0 : 0.0,
                avgDuration: duration,
                avgRetries: 0,
              },
              optimalContexts: [],
              commonErrors: !isSuccess && stepHistory.error ? [{
                error: stepHistory.error.substring(0, 200),
                frequency: 1,
                percentage: 100,
                contexts: [plan.goal],
                solutions: [],
              }] : [],
              parameterInsights: [],
              recommendations: [],
              lastUpdated: new Date(),
              lastAnalyzed: new Date(),
            });
          }
        }

        // Extract and store plan pattern if successful
        if (status === 'completed') {
          const patternId = generatePatternId(goalPattern, stepSequence);
          const existingPattern = await PlanPattern.findOne({ patternId });

          if (existingPattern) {
            // Update existing pattern
            const newUsageCount = existingPattern.usageCount + 1;
            const newSuccessRate = calculateSuccessRate(
              existingPattern.usageCount * existingPattern.successRate + 1,
              newUsageCount
            );
            const newAvgExecutionTime = (
              (existingPattern.avgExecutionTime * existingPattern.usageCount) +
              metrics.executionTime
            ) / newUsageCount;

            existingPattern.usageCount = newUsageCount;
            existingPattern.successRate = newSuccessRate;
            existingPattern.avgExecutionTime = newAvgExecutionTime;
            existingPattern.lastUsed = new Date();
            await existingPattern.save();
          } else {
            // Create new pattern
            await PlanPattern.create({
              patternId,
              goalPattern,
              stepSequence,
              successRate: 1.0,
              avgExecutionTime: metrics.executionTime,
              commonIssues: [],
              usageCount: 1,
              lastUsed: new Date(),
            });
          }
        }

        // Store insights if provided
        for (const insight of insights) {
          await AgentInsight.create({
            agentType: 'executor', // Default to executor for task-level insights
            type: 'patterns',
            insight,
            confidence: status === 'completed' ? 0.8 : 0.5,
            evidence: [
              {
                taskId,
                description: `Task ${status} with pattern: ${goalPattern}`,
              },
            ],
            lastValidated: new Date(),
          });
        }

        return createSuccessResponse({
          success: true,
          patternsLearned: status === 'completed' ? 1 : 0,
          insightsStored: insights.length,
          message: 'Learning completed successfully',
        });
      } catch (error: any) {
        logger.error('[learn_from_task] Error:', error);
        return handleToolError(error, 'learning from task');
      }
    },
  },
};

