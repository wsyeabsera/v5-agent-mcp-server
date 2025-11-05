import { logger } from './logger.js';

/**
 * Execution context for template resolution
 */
export interface ExecutionContext {
  stepOutputs: Map<string, any>; // Map of stepId -> output data
  userInputs?: Map<string, any>; // Map of stepId -> user input values (field -> value)
  now: string; // Current ISO timestamp
}

/**
 * Special markers for template values that shouldn't be resolved immediately
 */
export const TEMPLATE_MARKERS = {
  PROMPT_USER: '{{PROMPT_USER}}',
  GENERATE: '{{GENERATE}}',
} as const;

/**
 * Check if a value is a template marker
 */
export function isTemplateMarker(value: any): boolean {
  if (typeof value !== 'string') return false;
  return value === TEMPLATE_MARKERS.PROMPT_USER || value === TEMPLATE_MARKERS.GENERATE;
}

/**
 * Check if a value is a template that needs resolution
 */
export function isTemplate(value: any): boolean {
  if (typeof value !== 'string') return false;
  return value.startsWith('{{') && value.endsWith('}}');
}

/**
 * Resolve a single template value
 * Handles:
 * - {{step1.output._id}} - nested property access
 * - {{step1.output[0]._id}} - array access with nested property
 * - {{NOW}} - current ISO timestamp
 * - {{PROMPT_USER}} - return as-is (special marker)
 * - {{GENERATE}} - return as-is (special marker)
 */
export function resolveTemplate(value: string, context: ExecutionContext): any {
  // Remove {{ and }}
  const template = value.slice(2, -2).trim();

  // Handle special markers
  if (template === 'PROMPT_USER') {
    return TEMPLATE_MARKERS.PROMPT_USER;
  }
  if (template === 'GENERATE') {
    return TEMPLATE_MARKERS.GENERATE;
  }
  if (template === 'NOW') {
    return context.now;
  }

  // Handle step output references: step1.output._id or step1.output[0]._id
  const stepOutputMatch = template.match(/^step(\d+)(?:\.(.*))?$/);
  if (stepOutputMatch) {
    const stepId = `step${stepOutputMatch[1]}`;
    const path = stepOutputMatch[2] || 'output';

    // Get the step output
    const stepOutput = context.stepOutputs.get(stepId);
    if (!stepOutput) {
      logger.warn(`[templateResolver] Step output not found for ${stepId}`);
      throw new Error(`Step output not found for ${stepId}`);
    }

    // Resolve the path (supports nested properties and array access)
    return resolvePath(stepOutput, path);
  }

  logger.warn(`[templateResolver] Unknown template format: ${template}`);
  throw new Error(`Unknown template format: ${template}`);
}

/**
 * Resolve a path expression on an object
 * Supports: "output._id", "output[0]._id", "output[0].data.field", etc.
 */
function resolvePath(obj: any, path: string): any {
  if (!path) return obj;

  const parts = path.split(/[\.\[\]]+/).filter(Boolean);
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      throw new Error(`Cannot access property '${part}' on ${current}`);
    }

    // Handle array index
    const arrayIndex = parseInt(part, 10);
    if (!isNaN(arrayIndex) && Array.isArray(current)) {
      current = current[arrayIndex];
    } else {
      current = current[part];
    }
  }

  return current;
}

/**
 * Merge user inputs into parameters for a specific step
 * User inputs override template markers and existing values
 */
export function mergeUserInputsIntoParameters(
  params: Record<string, any>,
  stepId: string,
  userInputs?: Map<string, any>
): Record<string, any> {
  if (!userInputs) {
    return params;
  }

  const stepUserInputs = userInputs.get(stepId);
  if (!stepUserInputs || typeof stepUserInputs !== 'object') {
    return params;
  }

  // Deep merge user inputs into parameters
  const merged = { ...params };

  for (const [field, value] of Object.entries(stepUserInputs)) {
    // Use setNestedValue helper to handle dot notation fields
    setNestedValueInObject(merged, field, value);
  }

  return merged;
}

/**
 * Set a nested value in an object using dot notation
 */
function setNestedValueInObject(obj: any, path: string, value: any): void {
  const parts = path.split(/[\.\[\]]+/).filter(Boolean);
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const arrayIndex = parseInt(part, 10);
    
    if (!isNaN(arrayIndex) && Array.isArray(current)) {
      if (!current[arrayIndex]) {
        current[arrayIndex] = {};
      }
      current = current[arrayIndex];
    } else {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
  }

  const lastPart = parts[parts.length - 1];
  const lastArrayIndex = parseInt(lastPart, 10);
  
  if (!isNaN(lastArrayIndex) && Array.isArray(current)) {
    current[lastArrayIndex] = value;
  } else {
    current[lastPart] = value;
  }
}

/**
 * Resolve parameters with user inputs merged in first
 * This is the main function to use when user inputs are available
 */
export async function resolveParametersWithUserInputs(
  params: Record<string, any>,
  stepId: string,
  context: ExecutionContext
): Promise<Record<string, any>> {
  // First, merge user inputs into parameters (overrides template markers)
  const paramsWithUserInputs = mergeUserInputsIntoParameters(
    params,
    stepId,
    context.userInputs
  );

  // Then resolve templates in the merged parameters
  return await resolveParameters(paramsWithUserInputs, context);
}

/**
 * Resolve all templates in a parameters object
 * Recursively processes all string values that match template syntax
 */
export async function resolveParameters(
  params: Record<string, any>,
  context: ExecutionContext
): Promise<Record<string, any>> {
  const resolved: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && isTemplate(value)) {
      try {
        resolved[key] = resolveTemplate(value, context);
      } catch (error: any) {
        logger.error(`[templateResolver] Error resolving template ${value}:`, error);
        throw new Error(`Failed to resolve template ${value}: ${error.message}`);
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively resolve nested objects
      resolved[key] = await resolveParameters(value, context);
    } else if (Array.isArray(value)) {
      // Resolve templates in array elements
      resolved[key] = await Promise.all(
        value.map((item) => {
          if (typeof item === 'string' && isTemplate(item)) {
            return resolveTemplate(item, context);
          } else if (typeof item === 'object' && item !== null) {
            return resolveParameters(item, context);
          }
          return item;
        })
      );
    } else {
      // Pass through non-template values
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Check if parameters contain any unresolved user prompts
 */
export function hasUnresolvedPrompts(params: Record<string, any>): boolean {
  for (const value of Object.values(params)) {
    if (value === TEMPLATE_MARKERS.PROMPT_USER) {
      return true;
    }
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        if (value.some((item) => item === TEMPLATE_MARKERS.PROMPT_USER || (typeof item === 'object' && item !== null && hasUnresolvedPrompts(item)))) {
          return true;
        }
      } else if (hasUnresolvedPrompts(value)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if parameters contain any unresolved generation markers
 */
export function hasUnresolvedGenerations(params: Record<string, any>): boolean {
  for (const value of Object.values(params)) {
    if (value === TEMPLATE_MARKERS.GENERATE) {
      return true;
    }
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        if (value.some((item) => item === TEMPLATE_MARKERS.GENERATE || (typeof item === 'object' && item !== null && hasUnresolvedGenerations(item)))) {
          return true;
        }
      } else if (hasUnresolvedGenerations(value)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Extract all fields that need user input from parameters
 */
export function extractUserPromptFields(
  params: Record<string, any>,
  stepId: string,
  prefix = ''
): Array<{ stepId: string; field: string; description?: string }> {
  const fields: Array<{ stepId: string; field: string; description?: string }> = [];

  for (const [key, value] of Object.entries(params)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;

    if (value === TEMPLATE_MARKERS.PROMPT_USER) {
      fields.push({
        stepId,
        field: fieldPath,
        description: `Field ${fieldPath} requires user input`,
      });
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item === TEMPLATE_MARKERS.PROMPT_USER) {
            fields.push({
              stepId,
              field: `${fieldPath}[${index}]`,
              description: `Array element ${fieldPath}[${index}] requires user input`,
            });
          } else if (typeof item === 'object' && item !== null) {
            fields.push(...extractUserPromptFields(item, stepId, `${fieldPath}[${index}]`));
          }
        });
      } else {
        fields.push(...extractUserPromptFields(value, stepId, fieldPath));
      }
    }
  }

  return fields;
}

/**
 * Extract all fields that need generation from parameters
 */
export function extractGenerationFields(
  params: Record<string, any>,
  stepId: string,
  prefix = ''
): Array<{ stepId: string; field: string }> {
  const fields: Array<{ stepId: string; field: string }> = [];

  for (const [key, value] of Object.entries(params)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;

    if (value === TEMPLATE_MARKERS.GENERATE) {
      fields.push({
        stepId,
        field: fieldPath,
      });
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item === TEMPLATE_MARKERS.GENERATE) {
            fields.push({
              stepId,
              field: `${fieldPath}[${index}]`,
            });
          } else if (typeof item === 'object' && item !== null) {
            fields.push(...extractGenerationFields(item, stepId, `${fieldPath}[${index}]`));
          }
        });
      } else {
        fields.push(...extractGenerationFields(value, stepId, fieldPath));
      }
    }
  }

  return fields;
}

