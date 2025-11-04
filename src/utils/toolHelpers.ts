import { Model, Document } from 'mongoose';
import { logger } from './logger.js';

/**
 * Create a successful MCP response with JSON content
 */
export function createSuccessResponse(data: any) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Create an error MCP response
 */
export function createErrorResponse(message: string, isError = true) {
  return {
    content: [
      {
        type: 'text' as const,
        text: message,
      },
    ],
    isError,
  };
}

/**
 * Handle errors in tool handlers with consistent logging and response
 */
export function handleToolError(
  error: any,
  operation: string,
  context?: string
): ReturnType<typeof createErrorResponse> {
  const contextMsg = context ? ` [${context}]` : '';
  logger.error(`[${operation}]${contextMsg} Error:`, error);
  return createErrorResponse(`Error ${operation}: ${error.message}`);
}

/**
 * Create a filter object from optional source parameter
 */
export function createSourceFilter(source?: 'remote' | 'local') {
  const filter: { source?: string } = {};
  if (source) {
    filter.source = source;
  }
  return filter;
}

/**
 * Generic handler for creating a new document
 */
export async function createHandler<T extends Document>(
  Model: Model<T>,
  validatedArgs: any,
  operation: string
) {
  try {
    const document = await Model.create(validatedArgs);
    return createSuccessResponse(document);
  } catch (error: any) {
    return handleToolError(error, operation);
  }
}

/**
 * Generic handler for getting a document by identifier
 */
export async function getHandler<T extends Document>(
  Model: Model<T>,
  filter: Record<string, any>,
  identifier: string,
  operation: string
) {
  try {
    const document = await Model.findOne(filter);
    if (!document) {
      return createErrorResponse(`${operation} not found: ${identifier}`);
    }
    return createSuccessResponse(document);
  } catch (error: any) {
    return handleToolError(error, operation, identifier);
  }
}

/**
 * Generic handler for listing documents with optional filter
 */
export async function listHandler<T extends Document>(
  Model: Model<T>,
  filter: Record<string, any>,
  operation: string
) {
  try {
    const documents = await Model.find(filter);
    return createSuccessResponse(documents);
  } catch (error: any) {
    return handleToolError(error, operation);
  }
}

/**
 * Generic handler for updating a document
 */
export async function updateHandler<T extends Document>(
  Model: Model<T>,
  filter: Record<string, any>,
  updateData: Record<string, any>,
  identifier: string,
  operation: string
) {
  try {
    const document = await Model.findOneAndUpdate(filter, updateData, {
      new: true,
      runValidators: true,
    });
    if (!document) {
      return createErrorResponse(`${operation} not found: ${identifier}`);
    }
    return createSuccessResponse(document);
  } catch (error: any) {
    return handleToolError(error, operation, identifier);
  }
}

/**
 * Generic handler for removing a document
 */
export async function removeHandler<T extends Document>(
  Model: Model<T>,
  filter: Record<string, any>,
  identifier: string,
  operation: string,
  entityName: string
) {
  try {
    const document = await Model.findOneAndDelete(filter);
    if (!document) {
      return createErrorResponse(`${operation} not found: ${identifier}`);
    }
    return createSuccessResponse({
      message: `${entityName} removed successfully`,
      [entityName.toLowerCase()]: document,
    });
  } catch (error: any) {
    return handleToolError(error, operation, identifier);
  }
}

/**
 * Detect operation type from tool name
 * Query: get_*, list_*
 * Mutation: create_*, update_*, delete_*
 */
export function detectOperationType(toolName: string): 'query' | 'mutation' {
  const action = toolName.split('_')[0].toLowerCase();
  
  if (action === 'get' || action === 'list') {
    return 'query';
  }
  
  if (action === 'create' || action === 'update' || action === 'delete') {
    return 'mutation';
  }
  
  // Default to mutation for unknown actions
  return 'mutation';
}

/**
 * Detect entity type from tool name
 * Extracts entity from tool name after underscore
 */
export function detectEntityType(toolName: string): 'facility' | 'shipment' | 'contaminant' | 'contract' | 'inspection' | 'other' {
  const parts = toolName.toLowerCase().split('_');
  
  // Skip the first part (action) and check remaining parts
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    // Handle singular forms
    if (part === 'facility') return 'facility';
    if (part === 'shipment') return 'shipment';
    if (part === 'contaminant') return 'contaminant';
    if (part === 'contract') return 'contract';
    if (part === 'inspection') return 'inspection';
    
    // Handle plural forms
    if (part === 'facilities') return 'facility';
    if (part === 'shipments') return 'shipment';
    if (part === 'contaminants') return 'contaminant';
    if (part === 'contracts') return 'contract';
    if (part === 'inspections') return 'inspection';
  }
  
  return 'other';
}

