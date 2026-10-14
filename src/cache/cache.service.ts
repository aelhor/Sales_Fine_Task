import type Redis from 'ioredis';

/**
 * Provides resilient JSON cache operations backed by Redis.
 */
export class CacheService {
  /**
   * Creates the cache service with a lazily connected Redis client.
   * @param redis Redis client used for cache operations.
   */
  constructor(private readonly redis: Redis) {}

  /**
   * Retrieves and deserializes a cached value.
   * @param key Namespaced cache key.
   * @returns Cached value, or null when unavailable or absent.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      await this.ensureConnected();
      const value = await this.redis.get(key);
      return value === null ? null : (JSON.parse(value) as T);
    } catch (error: unknown) {
      console.warn(`Cache read failed for ${key}: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  /**
   * Serializes and stores a value with a time-to-live value.
   * @param key Namespaced cache key.
   * @param value Value to serialize.
   * @param ttlSeconds Cache lifetime in seconds.
   * @returns Promise that resolves after the write attempt.
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.ensureConnected();
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error: unknown) {
      console.warn(`Cache write failed for ${key}: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Closes the Redis client during application shutdown.
   * @returns Nothing after disconnecting the client.
   */
  close(): void {
    this.redis.disconnect();
  }

  /**
   * Connects the Redis client only when a cache operation needs it.
   * @returns Promise that resolves when the client is ready.
   */
  private async ensureConnected(): Promise<void> {
    if (this.redis.status === 'wait') await this.redis.connect();
  }

  /**
   * Converts an unknown failure into a log-safe message.
   * @param error Thrown error value.
   * @returns String description for logs.
   */
  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown cache error';
  }
}
