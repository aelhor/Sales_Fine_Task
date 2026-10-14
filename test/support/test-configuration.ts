import type { EnvironmentConfiguration } from '../../src/config/environment.validation';

/**
 * Builds the environment configuration used by database-backed end-to-end tests.
 * @returns Test configuration derived from the process environment.
 */
export function createTestConfiguration(): EnvironmentConfiguration {
  return {
    NODE_ENV: 'test',
    PORT: 3000,
    API_PREFIX: 'api/v1',
    DB_HOST: process.env.DB_HOST ?? 'localhost',
    DB_PORT: Number(process.env.DB_PORT ?? 5433),
    DB_NAME: process.env.DB_NAME ?? 'backend_task',
    DB_USER: process.env.DB_USER ?? 'backend_task',
    DB_PASSWORD: process.env.DB_PASSWORD ?? 'backend_task',
    DB_SSL: process.env.DB_SSL === 'true',
    REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
    REDIS_PORT: Number(process.env.REDIS_PORT ?? 6379),
    ...(process.env.REDIS_PASSWORD === undefined
      ? {}
      : { REDIS_PASSWORD: process.env.REDIS_PASSWORD }),
  };
}
