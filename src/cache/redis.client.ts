import Redis from 'ioredis';
import type { EnvironmentConfiguration } from '../config/environment.validation';

/**
 * Creates the lazy Redis client used by cache services.
 * @param configuration Validated runtime configuration.
 * @returns Redis client that connects on the first cache operation.
 */
export function createRedisClient(configuration: EnvironmentConfiguration): Redis {
  return new Redis({
    host: configuration.REDIS_HOST,
    port: configuration.REDIS_PORT,
    password: configuration.REDIS_PASSWORD,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
}
