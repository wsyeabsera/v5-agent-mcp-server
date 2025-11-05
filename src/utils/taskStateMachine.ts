import { logger } from './logger.js';

/**
 * Task status types
 */
export type TaskStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['in_progress', 'failed', 'cancelled'],
  in_progress: ['completed', 'failed', 'paused', 'cancelled'],
  paused: ['in_progress', 'failed', 'cancelled'],
  completed: [], // Terminal state
  failed: ['in_progress', 'cancelled'], // Can retry
  cancelled: [], // Terminal state
};

/**
 * Validate state transition
 */
export function validateStateTransition(
  currentStatus: TaskStatus,
  newStatus: TaskStatus
): boolean {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
  const isValid = allowedTransitions.includes(newStatus);

  if (!isValid) {
    logger.warn(
      `[taskStateMachine] Invalid state transition: ${currentStatus} -> ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`
    );
  }

  return isValid;
}

/**
 * Check if status is terminal (cannot transition from)
 */
export function isTerminalStatus(status: TaskStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

/**
 * Check if status allows retry
 */
export function canRetryStatus(status: TaskStatus): boolean {
  return status === 'failed';
}

/**
 * Generate a unique lock token
 */
export function generateLockToken(): string {
  return `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

