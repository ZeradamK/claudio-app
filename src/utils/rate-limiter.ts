export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private tokensPerInterval: number;
  private intervalMs: number;

  constructor(tokensPerInterval: number, intervalMs: number = 60000) {
    this.tokens = tokensPerInterval;
    this.lastRefill = Date.now();
    this.tokensPerInterval = tokensPerInterval;
    this.intervalMs = intervalMs;
  }

  async removeTokens(count: number): Promise<void> {
    // Refill tokens if enough time has passed
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(timePassed / this.intervalMs) * this.tokensPerInterval;
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.tokensPerInterval, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }

    // If not enough tokens, wait until next refill
    if (this.tokens < count) {
      const waitTime = this.intervalMs - (now - this.lastRefill);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.removeTokens(count);
    }

    this.tokens -= count;
  }
} 