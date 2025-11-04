import { z, ZodSchema } from 'zod';
import { allTools } from '../tools/index.js';

// Import schemas from tool files
// Note: These need to be imported from the tool files or we need to extract them
// For now, we'll create a function that can work with the existing tool structure

/**
 * Get the Zod schema for a specific tool
 * This is a helper that the critique agent can use to validate parameters
 */
export function getToolZodSchema(toolName: string): ZodSchema | null {
  // This is a mapping we'll need to maintain
  // Alternatively, we could refactor tools to export their schemas
  // For now, return null and let the caller use inputSchema from tools/list
  return null;
}

/**
 * Get tool schema information for validation
 * Returns the JSON schema which can be used to identify required parameters
 */
export function getToolSchemaInfo(toolName: string): {
  description: string;
  inputSchema: any;
  requiredParams?: string[];
} | null {
  const tool = (allTools as any)[toolName];
  
  if (!tool) {
    return null;
  }

  // Extract required fields from JSON schema
  const inputSchema = tool.inputSchema;
  const requiredParams: string[] = [];
  
  if (inputSchema && inputSchema.properties && inputSchema.required) {
    requiredParams.push(...inputSchema.required);
  } else if (inputSchema && inputSchema.properties) {
    // If no required array, check each property for required: true
    for (const [key, prop] of Object.entries(inputSchema.properties || {})) {
      const propSchema = prop as any;
      // In JSON Schema, if a property doesn't have a default and isn't optional,
      // it's typically required (unless explicitly marked optional)
      if (propSchema && !propSchema.default && !key.includes('optional')) {
        // This is a heuristic - actual determination should come from Zod schema
        // For now, we'll rely on the required array from JSON schema
      }
    }
  }

  return {
    description: tool.description || '',
    inputSchema,
    requiredParams: inputSchema?.required || [],
  };
}

/**
 * Get all tool names and their required parameters
 * Useful for the critique agent to understand what parameters are needed
 */
export function getAllToolsRequiredParams(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  
  for (const [toolName, tool] of Object.entries(allTools as any)) {
    const toolTyped = tool as { inputSchema?: { required?: string[] } };
    const schema = toolTyped.inputSchema;
    if (schema && schema.required) {
      result[toolName] = schema.required;
    } else {
      result[toolName] = [];
    }
  }
  
  return result;
}

