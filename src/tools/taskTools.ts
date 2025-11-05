import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logger } from '../utils/logger.js';
import {
  createSuccessResponse,
  createErrorResponse,
  handleToolError,
} from '../utils/toolHelpers.js';
import {
  executeTaskSchema,
  resumeTaskSchema,
  getTaskSchema,
  listTasksSchema,
} from './schemas/taskSchemas.js';
import { Task, Plan } from '../models/index.js';
import { taskExecutor } from '../utils/taskExecutor.js';

// ========== Task Tools ==========
export const taskTools = {
  execute_task: {
    description:
      'Execute a plan by creating a task and running it step-by-step. Handles template resolution, dependency management, user prompts, and AI generation.',
    inputSchema: zodToJsonSchema(executeTaskSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof executeTaskSchema>) => {
      try {
        const validatedArgs = executeTaskSchema.parse(args);
        const { planId, agentConfigId } = validatedArgs;

        logger.info(`[execute_task] Executing task for planId: ${planId}`);

        // Verify plan exists
        const plan = await Plan.findById(planId);
        if (!plan) {
          return createErrorResponse(`Plan not found: ${planId}`);
        }

        // Check if task already exists for this plan
        let task = await Task.findOne({ planId });
        
        if (!task) {
          // Create new task
          task = await Task.create({
            planId,
            agentConfigId,
            status: 'pending',
            stepOutputs: new Map(),
            pendingUserInputs: [],
            currentStepIndex: 0,
            executionHistory: [],
          });
          logger.info(`[execute_task] Created new task with ID: ${task._id}`);
        } else {
          logger.info(`[execute_task] Resuming existing task with ID: ${task._id}`);
        }

        // Execute task asynchronously (don't await - let it run in background)
        // The task status will be updated in the database as execution progresses
        const taskId = (task._id as any).toString();
        taskExecutor.executeTask(taskId).catch((error) => {
          logger.error(`[execute_task] Error executing task ${taskId}:`, error);
        });

        // Return task immediately
        return createSuccessResponse({
          taskId,
          planId,
          status: task.status,
          message: 'Task execution started',
        });
      } catch (error: any) {
        logger.error('[execute_task] Error:', error);
        return handleToolError(error, 'executing task');
      }
    },
  },

  resume_task: {
    description:
      'Resume a paused task after providing user inputs. Resolves pending user prompts and continues execution.',
    inputSchema: zodToJsonSchema(resumeTaskSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof resumeTaskSchema>) => {
      try {
        const validatedArgs = resumeTaskSchema.parse(args);
        const { taskId, userInputs } = validatedArgs;

        logger.info(`[resume_task] Resuming task ${taskId} with ${userInputs.length} user inputs`);

        // Verify task exists
        const task = await Task.findById(taskId);
        if (!task) {
          return createErrorResponse(`Task not found: ${taskId}`);
        }

        if (task.status !== 'paused') {
          return createErrorResponse(
            `Task is not paused. Current status: ${task.status}`
          );
        }

        // Resume task execution (this will apply user inputs and continue)
        // Ensure all user inputs have values
        const validatedInputs = userInputs.map(input => ({
          stepId: input.stepId,
          field: input.field,
          value: input.value !== undefined ? input.value : null,
        }));
        
        try {
          await taskExecutor.resumeTask(taskId, validatedInputs);
        } catch (error: any) {
          logger.error(`[resume_task] Error resuming task ${taskId}:`, {
            message: error?.message,
            stack: error?.stack,
            error: String(error),
          });
          throw error; // Re-throw so it's caught by outer catch
        }

        return createSuccessResponse({
          taskId,
          message: 'Task resumption started',
          userInputsProvided: userInputs.length,
        });
      } catch (error: any) {
        logger.error('[resume_task] Error:', error);
        return handleToolError(error, 'resuming task');
      }
    },
  },

  get_task: {
    description: 'Get task details including status, step outputs, pending inputs, and execution history.',
    inputSchema: zodToJsonSchema(getTaskSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getTaskSchema>) => {
      try {
        const validatedArgs = getTaskSchema.parse(args);
        const { id } = validatedArgs;

        logger.info(`[get_task] Getting task: ${id}`);

        const task = await Task.findById(id);
        if (!task) {
          return createErrorResponse(`Task not found: ${id}`);
        }

        // Convert Maps to objects for JSON serialization
        const stepOutputsObj: Record<string, any> = {};
        task.stepOutputs.forEach((value, key) => {
          stepOutputsObj[key] = value;
        });

        const userInputsObj: Record<string, any> = {};
        task.userInputs.forEach((value, key) => {
          userInputsObj[key] = value;
        });

        const retryCountObj: Record<string, number> = {};
        task.retryCount.forEach((value, key) => {
          retryCountObj[key] = value;
        });

        return createSuccessResponse({
          ...task.toObject(),
          stepOutputs: stepOutputsObj,
          userInputs: userInputsObj,
          retryCount: retryCountObj,
        });
      } catch (error: any) {
        logger.error('[get_task] Error:', error);
        return handleToolError(error, 'getting task');
      }
    },
  },

  list_tasks: {
    description: 'List tasks with optional filters by planId, status, agentConfigId, and date range.',
    inputSchema: zodToJsonSchema(listTasksSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listTasksSchema>) => {
      try {
        const validatedArgs = listTasksSchema.parse(args);
        const {
          planId,
          status,
          agentConfigId,
          startDate,
          endDate,
          limit = 50,
          skip = 0,
        } = validatedArgs;

        logger.info('[list_tasks] Listing tasks with filters:', {
          planId,
          status,
          agentConfigId,
          startDate,
          endDate,
          limit,
          skip,
        });

        // Build filter
        const filter: Record<string, any> = {};
        if (planId) filter.planId = planId;
        if (status) filter.status = status;
        if (agentConfigId) filter.agentConfigId = agentConfigId;
        if (startDate || endDate) {
          filter.createdAt = {};
          if (startDate) filter.createdAt.$gte = new Date(startDate);
          if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const tasks = await Task.find(filter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip);

        // Convert Maps to objects for JSON serialization
        const tasksWithSerializedOutputs = tasks.map((task) => {
          const taskObj = task.toObject();
          
          const stepOutputsObj: Record<string, any> = {};
          task.stepOutputs.forEach((value, key) => {
            stepOutputsObj[key] = value;
          });

          const userInputsObj: Record<string, any> = {};
          task.userInputs.forEach((value, key) => {
            userInputsObj[key] = value;
          });

          const retryCountObj: Record<string, number> = {};
          task.retryCount.forEach((value, key) => {
            retryCountObj[key] = value;
          });
          
          return {
            ...taskObj,
            stepOutputs: stepOutputsObj,
            userInputs: userInputsObj,
            retryCount: retryCountObj,
          };
        });

        return createSuccessResponse({
          tasks: tasksWithSerializedOutputs,
          count: tasks.length,
          limit,
          skip,
        });
      } catch (error: any) {
        logger.error('[list_tasks] Error:', error);
        return handleToolError(error, 'listing tasks');
      }
    },
  },
};

