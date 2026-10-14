import type { EnvironmentConfiguration } from '../config/environment.validation';
import { createProductOpenApiPaths } from '../products/product.openapi';

/**
 * Builds the OpenAPI document served by Swagger UI.
 * @param configuration Validated runtime configuration.
 * @returns OpenAPI document for the currently registered Express routes.
 */
export function createOpenApiDocument(configuration: EnvironmentConfiguration): object {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Backend Technical Task API',
      version: '1.0.0',
      description: 'Product listing and ticket submission API.',
    },
    servers: [{ url: `/${configuration.API_PREFIX}` }],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Check application liveness',
          responses: {
            '200': {
              description: 'Application is running.',
              content: {
                'application/json': {
                  example: {
                    message: 'Application is healthy',
                    data: { status: 'ok', timestamp: '2026-10-14T12:00:00.000Z' },
                    correlationId: '8e2cb7b2-41b1-4205-8df4-83e7e53999db',
                  },
                },
              },
            },
          },
        },
      },
      ...createProductOpenApiPaths(),
    },
  };
}
