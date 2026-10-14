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
import { ProductController } from './products/product.controller';
import { KnexProductRepository } from './products/product.repository';
import { createProductRouter } from './products/product.router';
import { ProductService } from './products/product.service';

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
  const productRepository = new KnexProductRepository(database);
  const productService = new ProductService(productRepository, cacheService);
  const productController = new ProductController(productService);

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(correlationIdMiddleware);
  app.use(`/${configuration.API_PREFIX}/health`, createHealthRouter(healthService));
  app.use(`/${configuration.API_PREFIX}/products`, createProductRouter(productController));
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
