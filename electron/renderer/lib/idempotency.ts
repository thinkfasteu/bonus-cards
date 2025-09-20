import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique idempotency key for API requests
 * This ensures that repeated operations (like scanner double-reads) don't cause duplicate actions
 */
export function generateIdempotencyKey(): string {
  return uuidv4();
}

/**
 * Creates a debounced function that delays execution until after wait milliseconds
 * have elapsed since the last time it was invoked
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}