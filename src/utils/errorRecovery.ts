import { logger } from './logger.js';

/**
 * Error categories for different recovery strategies
 */
export enum ErrorCategory {
  RETRYABLE = 'retryable', // Network errors, timeouts, transient failures
  NON_RETRYABLE = 'non_retryable', // Validation errors, auth errors, invalid params
  RECOVERABLE = 'recoverable', // Partial failures, can skip or use fallback
}

/**
 * Determine if an error is retryable
 */
export function categorizeError(error: any): ErrorCategory {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorName = error?.name?.toLowerCase() || '';

  // Network-related errors (retryable)
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes('etimedout') ||
    errorName === 'timeouterror' ||
    errorName === 'networkerror'
  ) {
    return ErrorCategory.RETRYABLE;
  }

  // Server errors (5xx) - retryable
  if (error?.response?.status >= 500 && error?.response?.status < 600) {
    return ErrorCategory.RETRYABLE;
  }

  // Rate limiting (429) - retryable with backoff
  if (error?.response?.status === 429) {
    return ErrorCategory.RETRYABLE;
  }

  // Validation errors (non-retryable)
  if (
    errorMessage.includes('validation') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('missing required') ||
    errorMessage.includes('not found') ||
    error?.response?.status === 400 ||
    error?.response?.status === 404
  ) {
    return ErrorCategory.NON_RETRYABLE;
  }

  // Authentication errors (non-retryable)
  if (
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('forbidden') ||
    errorMessage.includes('authentication') ||
    errorMessage.includes('auth') ||
    error?.response?.status === 401 ||
    error?.response?.status === 403
  ) {
    return ErrorCategory.NON_RETRYABLE;
  }

  // Tool execution errors (check if it's a tool error)
  if (errorMessage.includes('tool') && errorMessage.includes('failed')) {
    // Check if it's a validation error from tool
    if (errorMessage.includes('not found') || errorMessage.includes('invalid')) {
      return ErrorCategory.NON_RETRYABLE;
    }
    // Otherwise might be retryable
    return ErrorCategory.RETRYABLE;
  }

  // Default: treat as retryable for transient issues
  return ErrorCategory.RETRYABLE;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  return categorizeError(error) === ErrorCategory.RETRYABLE;
}

/**
 * Check if an error is recoverable (can skip step or use fallback)
 */
export function isRecoverableError(error: any): boolean {
  return categorizeError(error) === ErrorCategory.RECOVERABLE;
}

/**
 * Create error context for logging
 */
export function createErrorContext(
  stepId: string,
  attempt: number,
  error: any,
  params?: Record<string, any>
): {
  stepId: string;
  attempt: number;
  errorType: string;
  errorMessage: string;
  errorCategory: ErrorCategory;
  timestamp: string;
  params?: Record<string, any>;
} {
  return {
    stepId,
    attempt,
    errorType: error?.name || 'Error',
    errorMessage: error?.message || String(error),
    errorCategory: categorizeError(error),
    timestamp: new Date().toISOString(),
    params: params ? sanitizeParams(params) : undefined,
  };
}

/**
 * Sanitize parameters for logging (remove sensitive data)
 */
function sanitizeParams(params: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ['password', 'apiKey', 'token', 'secret', 'auth'];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    const keyLower = key.toLowerCase();
    if (sensitiveKeys.some((sk) => keyLower.includes(sk))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeParams(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(attempt: number, baseDelay: number = 1000): number {
  // Exponential backoff: baseDelay * 2^attempt
  // Max delay: 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt), 30000);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay; // 0-30% jitter
  
  return Math.floor(delay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        logger.warn(`[retryWithBackoff] Non-retryable error on attempt ${attempt}:`, error.message);
        throw error;
      }

      // If this was the last attempt, throw
      if (attempt >= maxRetries) {
        logger.error(`[retryWithBackoff] Max retries (${maxRetries}) exceeded`);
        throw error;
      }

      // Calculate backoff delay
      const delay = calculateBackoffDelay(attempt, baseDelay);
      logger.info(`[retryWithBackoff] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

