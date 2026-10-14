import type Redis from 'ioredis';
import { CacheService } from './cache.service';

/**
 * Creates a ready Redis mock for cache-service tests.
 * @returns Redis client mock with no network connection requirement.
 */
function createRedisMock(): jest.Mocked<Pick<Redis, 'get' | 'set' | 'del' | 'disconnect'>> & {
  status: Redis['status'];
} {
  return {
    status: 'ready',
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    disconnect: jest.fn(),
  };
}

describe('CacheService', () => {
  let redis: ReturnType<typeof createRedisMock>;
  let cacheService: CacheService;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    redis = createRedisMock();
    cacheService = new CacheService(redis as unknown as Redis);
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  /**
   * Verifies that a Redis read outage is converted to a cache miss.
   * @returns Promise that resolves after the fail-open assertions complete.
   */
  it('returns a cache miss when Redis reads fail', async () => {
    redis.get.mockRejectedValue(new Error('Redis unavailable'));

    await expect(cacheService.get('products:list:v1:page:1:limit:20')).resolves.toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cache read failed for products:list:v1:page:1:limit:20'),
    );
  });

  /**
   * Verifies that a Redis write outage does not prevent a successful API response.
   * @returns Promise that resolves after the fail-open assertions complete.
   */
  it('does not throw when Redis writes fail', async () => {
    redis.set.mockRejectedValue(new Error('Redis unavailable'));

    await expect(
      cacheService.set('products:list:v1:page:1:limit:20', { products: [] }, 120),
    ).resolves.toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cache write failed for products:list:v1:page:1:limit:20'),
    );
  });
});
