/**
 * Builds the OpenAPI paths for product endpoints.
 * @returns OpenAPI path definitions for product routes.
 */
export function createProductOpenApiPaths(): Record<string, object> {
  return {
    '/products': {
      get: {
        tags: ['Products'],
        summary: 'List products',
        description: 'Retrieves a product page using a 120-second Redis cache.',
        parameters: [
          {
            name: 'page',
            in: 'query',
            required: false,
            description: 'One-based page number. Defaults to 1.',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Number of products per page. Defaults to 20 and cannot exceed 100.',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          '200': {
            description: 'Products retrieved successfully.',
            headers: {
              'X-Cache': {
                description: 'Whether the product list was served from Redis.',
                schema: { type: 'string', enum: ['HIT', 'MISS'] },
              },
            },
            content: {
              'application/json': {
                example: {
                  message: 'Products retrieved successfully',
                  data: [
                    {
                      product_code: 'PRD-001',
                      product_title: 'Wireless Keyboard',
                      product_price: 49.99,
                    },
                  ],
                  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
                  correlationId: '8e2cb7b2-41b1-4205-8df4-83e7e53999db',
                },
              },
            },
          },
        },
      },
    },
  };
}
