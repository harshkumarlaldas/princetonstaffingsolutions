/**
 * Rate limiting utilities using Upstash Redis
 */

interface RateLimitConfig {
  identifier: string; // IP address or user identifier
  limit: number; // Number of requests allowed
  window: number; // Time window in seconds
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when the limit resets
  retryAfter?: number; // Seconds to wait before retrying
}

export class RateLimiter {
  private redis: any;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
    
    if (this.isConfigured) {
      // Dynamically import to avoid issues if Redis is not configured
      this.initRedis();
    }
  }

  private async initRedis() {
    try {
      const { Redis } = await import('@upstash/redis');
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isConfigured = false;
    }
  }

  async checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
    if (!this.isConfigured || !this.redis) {
      // If Redis is not configured, allow all requests (not recommended for production)
      console.warn('Rate limiting disabled - Redis not configured');
      return {
        success: true,
        limit: config.limit,
        remaining: config.limit - 1,
        reset: Date.now() + config.window * 1000,
      };
    }

    try {
      const key = `rate_limit:${config.identifier}`;
      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - config.window;

      // Get current requests in the window using zrange with scores
      const requests = await this.redis.zrange(key, 0, -1, { withScores: true });
      const currentCount = requests.filter((item: any) => item.score >= windowStart).length;

      if (currentCount >= config.limit) {
        // Rate limit exceeded
        const oldestRequest = requests[0];
        const resetTime = oldestRequest ? oldestRequest.score + config.window : now + config.window;
        
        return {
          success: false,
          limit: config.limit,
          remaining: 0,
          reset: resetTime * 1000,
          retryAfter: Math.max(0, resetTime - now),
        };
      }

      // Add current request to the sorted set
      await this.redis.zadd(key, { [now.toString()]: now });
      // Set expiration on the key
      await this.redis.expire(key, config.window);

      return {
        success: true,
        limit: config.limit,
        remaining: config.limit - currentCount - 1,
        reset: (now + config.window) * 1000,
      };
    } catch (error) {
      console.error('Rate limiting error:', error);
      // On error, allow the request but log the issue
      return {
        success: true,
        limit: config.limit,
        remaining: config.limit - 1,
        reset: Date.now() + config.window * 1000,
      };
    }
  }

  async isRateLimited(identifier: string, limit: number = 5, window: number = 60): Promise<boolean> {
    const result = await this.checkRateLimit({ identifier, limit, window });
    return !result.success;
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Helper function for contact form rate limiting
export async function checkContactFormRateLimit(ip: string): Promise<{
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}> {
  const result = await rateLimiter.checkRateLimit({
    identifier: `contact_form:${ip}`,
    limit: 5, // 5 submissions per IP
    window: 60, // per minute
  });

  return {
    allowed: result.success,
    retryAfter: result.retryAfter,
    remaining: result.remaining,
  };
}
