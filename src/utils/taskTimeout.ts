import { logger } from './logger.js';

/**
 * Create a timeout promise that rejects after specified milliseconds
 */
export function createTimeout(timeoutMs: number, message: string = 'Operation timed out'): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${message} (${timeoutMs}ms)`));
    }, timeoutMs);
  });
}

/**
 * Execute a promise with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    createTimeout(timeoutMs, timeoutMessage || `Operation timed out after ${timeoutMs}ms`),
  ]);
}

/**
 * Create a timeout error
 */
export class TimeoutError extends Error {
  constructor(timeoutMs: number, operation: string) {
    super(`Operation "${operation}" timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

