import express, { type Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { CacheService } from './cache/cache.service';
import { createRedisClient } from './cache/redis.client';
import { correlationIdMiddleware } from './common/correlation/correlation-id.middleware';
import { errorHandlerMiddleware } from './common/http/error-handler.middleware';
import type { EnvironmentConfiguration } from './config/environment.validation';
import { createDatabaseClient } from './database/database.client';
import { createHealthRouter } from './health/health.router';
import { HealthService } from './health/health.service';
import { createOpenApiDocument } from './openapi/openapi.document';

/**
 * Holds shared infrastructure resources for controlled application shutdown.
 */
export interface ApplicationResources {
  close(): Promise<void>;
}

/**
 * Creates the configured Express application and its infrastructure resources.
 * @param configuration Validated runtime configuration.
 * @returns Express application and shutdown resources.
 */
export function createApplication(configuration: EnvironmentConfiguration): {
  app: Express;
  resources: ApplicationResources;
} {
  const app = express();
  const database = createDatabaseClient(configuration);
  const cacheService = new CacheService(createRedisClient(configuration));
  const healthService = new HealthService();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(correlationIdMiddleware);
  app.use(`/${configuration.API_PREFIX}/health`, createHealthRouter(healthService));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(createOpenApiDocument(configuration)));
  app.use(errorHandlerMiddleware);

  return {
    app,
    resources: {
      async close(): Promise<void> {
        cacheService.close();
        await database.destroy();
      },
    },
  };
}
