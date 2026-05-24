import { RateLimiter } from './rate-limiter';

// Create a rate limiter that allows 10 requests per minute
const limiter = new RateLimiter(10);

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  shouldRetry?: (error: any) => boolean;
}

export class RetryError extends Error {
  public attempts: number;
  public lastError: Error;

  constructor(message: string, attempts: number, lastError: Error) {
    super(message);
    this.name = 'RetryError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 4,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    shouldRetry = () => true
  } = options;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Wait for rate limiter
      await limiter.removeTokens(1);
      
      // Execute operation
      const result = await operation();
      
      // If successful, return result
      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error);
      
      // Check if we should retry
      if (!shouldRetry(error) || attempt === maxAttempts) {
        throw new RetryError(
          `Operation failed after ${attempt} attempts`,
          attempt,
          error
        );
      }
      
      // Calculate next delay with exponential backoff
      delay = Math.min(delay * factor, maxDelay);
      
      console.log(`Retrying in ${delay}ms...`);
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never happen due to the throw in the loop
  throw new Error('Unexpected retry error');
} 