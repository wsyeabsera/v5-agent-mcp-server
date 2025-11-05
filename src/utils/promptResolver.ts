/**
 * Resolve a prompt template by replacing placeholders with provided arguments
 * Supports both {{variable}} and ${variable} formats
 */
export function resolvePromptTemplate(
  template: string,
  arguments_: Record<string, any>
): string {
  let resolved = template;

  // Replace {{variable}} format
  resolved = resolved.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in arguments_) {
      return String(arguments_[key]);
    }
    return match; // Keep original if not found
  });

  // Replace ${variable} format
  resolved = resolved.replace(/\$\{(\w+)\}/g, (match, key) => {
    if (key in arguments_) {
      return String(arguments_[key]);
    }
    return match; // Keep original if not found
  });

  return resolved;
}

/**
 * Validate that all required arguments are provided
 */
export function validatePromptArguments(
  promptArguments: Array<{ name: string; required?: boolean }>,
  providedArguments: Record<string, any>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const arg of promptArguments) {
    if (arg.required && !(arg.name in providedArguments)) {
      missing.push(arg.name);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

