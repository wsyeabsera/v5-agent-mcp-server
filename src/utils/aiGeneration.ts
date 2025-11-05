import { logger } from './logger.js';
import { aiCallTools } from '../tools/aiCallTools.js';

/**
 * Enhanced AI generation with context-aware prompts
 */
export class AIGenerator {
  /**
   * Generate a value for a field with context
   */
  async generateValue(
    field: string,
    fieldType: string,
    stepContext: {
      stepId: string;
      action: string;
      parameters?: Record<string, any>;
      expectedOutput?: Record<string, any>;
    },
    agentConfigId: string
  ): Promise<any> {
    try {
      // Build context-aware prompt
      const prompt = this.buildGenerationPrompt(field, fieldType, stepContext);

      const result = await aiCallTools.execute_ai_call.handler({
        agentConfigId,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        maxTokens: 200,
        responseFormat: { type: 'json_object' },
      });

      if ('isError' in result && result.isError) {
        throw new Error(result.content?.[0]?.text || 'AI generation failed');
      }

      // Extract generated value
      const contentText = result.content?.[0]?.text || '';
      
      // Parse JSON response
      let generatedData: any;
      try {
        generatedData = JSON.parse(contentText);
      } catch {
        // If not JSON, try to extract value from text
        generatedData = { value: contentText.trim() };
      }

      // Extract value from response (could be { value: ... } or direct value)
      let generatedValue = generatedData.value || generatedData[field] || generatedData;

      // Validate and transform based on field type
      generatedValue = this.validateAndTransformValue(generatedValue, fieldType, field);

      return generatedValue;
    } catch (error: any) {
      logger.error(`[AIGenerator] Error generating value for ${field}:`, error);
      throw new Error(`Failed to generate value for ${field}: ${error.message}`);
    }
  }

  /**
   * Build context-aware prompt for generation
   */
  private buildGenerationPrompt(
    field: string,
    fieldType: string,
    stepContext: {
      stepId: string;
      action: string;
      parameters?: Record<string, any>;
      expectedOutput?: Record<string, any>;
    }
  ): string {
    const stepInfo = `Step: ${stepContext.stepId} (Action: ${stepContext.action})`;
    const fieldInfo = `Field: ${field} (Type: ${fieldType})`;
    
    let contextInfo = '';
    if (stepContext.parameters) {
      const relevantParams = Object.entries(stepContext.parameters)
        .filter(([key]) => key !== field)
        .map(([key, value]) => {
          // Sanitize value for prompt
          const sanitized = typeof value === 'string' && value.length > 100 
            ? value.substring(0, 100) + '...' 
            : value;
          return `  - ${key}: ${JSON.stringify(sanitized)}`;
        })
        .join('\n');
      
      if (relevantParams) {
        contextInfo = `\n\nContext from other parameters:\n${relevantParams}`;
      }
    }

    const typeGuidance = this.getTypeGuidance(fieldType, field);

    return `Generate a value for the following field:

${stepInfo}
${fieldInfo}${contextInfo}

${typeGuidance}

Requirements:
- Provide only the value, no explanation or additional text
- The value must be valid for the field type and context
- Return your response as JSON: { "value": <generated_value> }

Generate the value now:`;
  }

  /**
   * Get type-specific guidance for generation
   */
  private getTypeGuidance(fieldType: string, fieldName: string): string {
    const fieldLower = fieldName.toLowerCase();
    
    // ID fields
    if (fieldLower.includes('id') || fieldLower.includes('_id')) {
      return `Guidance: This appears to be an ID field. Generate a valid identifier (e.g., MongoDB ObjectId format, UUID, or simple ID string).`;
    }

    // Timestamp fields
    if (fieldLower.includes('timestamp') || fieldLower.includes('time') || fieldLower.includes('date')) {
      return `Guidance: This appears to be a timestamp/date field. Generate an ISO 8601 timestamp (e.g., "2025-01-15T10:30:00.000Z").`;
    }

    // Reference fields
    if (fieldLower.includes('reference') || fieldLower.includes('ref')) {
      return `Guidance: This appears to be a reference field. Generate a reference code or ID (e.g., "REF-2025-001").`;
    }

    // String fields
    if (fieldType === 'string') {
      if (fieldLower.includes('name')) {
        return `Guidance: Generate a descriptive name (2-50 characters).`;
      }
      if (fieldLower.includes('code')) {
        return `Guidance: Generate a short code (uppercase, alphanumeric, 3-10 characters).`;
      }
      if (fieldLower.includes('description')) {
        return `Guidance: Generate a brief description (1-2 sentences).`;
      }
      return `Guidance: Generate a meaningful string value (1-100 characters).`;
    }

    // Number fields
    if (fieldType === 'number' || fieldType === 'integer') {
      return `Guidance: Generate a valid number. Consider the context to determine appropriate range.`;
    }

    // Boolean fields
    if (fieldType === 'boolean') {
      return `Guidance: Generate a boolean value (true or false).`;
    }

    return `Guidance: Generate a value appropriate for type "${fieldType}". Consider the field name and context.`;
  }

  /**
   * Validate and transform generated value based on type
   */
  private validateAndTransformValue(value: any, fieldType: string, fieldName: string): any {
    const fieldLower = fieldName.toLowerCase();

    // Handle timestamp fields
    if (fieldLower.includes('timestamp') || fieldLower.includes('time') || fieldLower.includes('date')) {
      if (typeof value === 'string') {
        // Try to parse as ISO timestamp
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      // If not valid, generate current timestamp
      return new Date().toISOString();
    }

    // Handle ID fields - ensure it's a string
    if (fieldLower.includes('id') || fieldLower.includes('_id')) {
      return String(value);
    }

    // Type-specific validation
    switch (fieldType) {
      case 'string':
        return String(value);
      case 'number':
      case 'integer':
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      default:
        return value;
    }
  }
}

// Export singleton instance
export const aiGenerator = new AIGenerator();

