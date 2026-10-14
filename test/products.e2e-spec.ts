import request from 'supertest';
import { createApplication, type ApplicationResources } from '../src/app';
import { CacheService } from '../src/cache/cache.service';
import { createRedisClient } from '../src/cache/redis.client';
import type { ApiSuccessResponse, PaginationMeta } from '../src/common/dto/api-response.interface';
import { createDatabaseClient } from '../src/database/database.client';
import { createProductListCacheKey } from '../src/products/product.service';
import type { Product, ProductPagination } from '../src/products/product.types';
import { createTestConfiguration } from './support/test-configuration';

/**
 * Checks whether an unknown value is a products success response.
 * @param value Parsed response body to validate.
 * @returns Whether the value follows the products success response contract.
 */
function isProductsResponse(
  value: unknown,
): value is ApiSuccessResponse<Product[]> & { meta: PaginationMeta } {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.message === 'Products retrieved successfully' &&
    typeof candidate.correlationId === 'string' &&
    Array.isArray(candidate.data) &&
    typeof candidate.meta === 'object' &&
    candidate.meta !== null
  );
}

describe('Products endpoint', () => {
  const configuration = createTestConfiguration();
  const testProduct: Product = {
    product_code: 'E2E-PRODUCT-001',
    product_title: 'E2E Cache Test Product',
    product_price: 19.99,
  };
  const pagination: ProductPagination = { page: 1, limit: 20 };
  const cachedPaginations: ProductPagination[] = [
    pagination,
    { page: 1, limit: 1 },
    { page: 2, limit: 1 },
    { page: 1, limit: 100 },
    { page: 9_999, limit: 20 },
  ];
  let application: ReturnType<typeof createApplication>['app'];
  let applicationResources: ApplicationResources;
  let database: ReturnType<typeof createDatabaseClient>;
  let cache: CacheService;

  beforeAll(async () => {
    database = createDatabaseClient(configuration);
    cache = new CacheService(createRedisClient(configuration));
    await database('products').insert(testProduct).onConflict('product_code').merge(testProduct);
    await clearProductPageCache();

    const createdApplication = createApplication(configuration);
    application = createdApplication.app;
    applicationResources = createdApplication.resources;
  });

  afterAll(async () => {
    await applicationResources.close();
    await clearProductPageCache();
    cache.close();
    await database('products').where('product_code', testProduct.product_code).delete();
    await database.destroy();
  });

  /**
   * Verifies cache-aside behaviour for the public product-list endpoint.
   * @returns Promise that resolves after the cache miss and hit assertions complete.
   */
  it('returns a database result on a miss and a Redis result on a later request', async () => {
    const firstResponse = await request(application)
      .get('/api/v1/products?page=1&limit=20')
      .expect(200);
    const firstBody: unknown = JSON.parse(firstResponse.text);

    expect(firstResponse.headers['x-cache']).toBe('MISS');
    expect(isProductsResponse(firstBody)).toBe(true);
    if (!isProductsResponse(firstBody))
      throw new Error('Products response did not match the API contract');
    expect(firstBody.data).toContainEqual(testProduct);
    expect(firstBody.meta).toMatchObject({ page: 1, limit: 20 });

    await database('products')
      .where('product_code', testProduct.product_code)
      .update({ product_title: 'Changed after cache population' });

    const secondResponse = await request(application)
      .get('/api/v1/products?page=1&limit=20')
      .expect(200);
    const secondBody: unknown = JSON.parse(secondResponse.text);

    expect(secondResponse.headers['x-cache']).toBe('HIT');
    expect(isProductsResponse(secondBody)).toBe(true);
    if (!isProductsResponse(secondBody))
      throw new Error('Products response did not match the API contract');
    expect(secondBody.data).toContainEqual(testProduct);
    expect(secondBody.correlationId).not.toBe(firstBody.correlationId);
  });

  /**
   * Verifies that invalid pagination parameters use the shared error contract.
   * @returns Promise that resolves after the validation assertions complete.
   */
  it('rejects an invalid page number', async () => {
    const response = await request(application).get('/api/v1/products?page=0').expect(400);
    const responseBody: unknown = JSON.parse(response.text);

    expect(response.headers['x-correlation-id']).toEqual(expect.any(String));
    expect(responseBody).toMatchObject({
      message: 'Request validation failed',
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  /**
   * Verifies that omitted query parameters use the documented pagination defaults.
   * @returns Promise that resolves after the default-pagination assertions complete.
   */
  it('uses default pagination when no query parameters are supplied', async () => {
    const response = await request(application).get('/api/v1/products').expect(200);
    const responseBody: unknown = JSON.parse(response.text);

    expect(isProductsResponse(responseBody)).toBe(true);
    if (!isProductsResponse(responseBody))
      throw new Error('Products response did not match the API contract');
    expect(responseBody.meta).toMatchObject({ page: 1, limit: 20 });
  });

  /**
   * Verifies that the documented minimum and maximum page sizes are accepted.
   * @returns Promise that resolves after the pagination-boundary assertions complete.
   */
  it('accepts the minimum and maximum page sizes', async () => {
    const minimumResponse = await request(application)
      .get('/api/v1/products?page=1&limit=1')
      .expect(200);
    const maximumResponse = await request(application)
      .get('/api/v1/products?page=1&limit=100')
      .expect(200);
    const minimumBody: unknown = JSON.parse(minimumResponse.text);
    const maximumBody: unknown = JSON.parse(maximumResponse.text);

    expect(isProductsResponse(minimumBody)).toBe(true);
    expect(isProductsResponse(maximumBody)).toBe(true);
    if (!isProductsResponse(minimumBody) || !isProductsResponse(maximumBody)) {
      throw new Error('Products response did not match the API contract');
    }
    expect(minimumBody.data).toHaveLength(1);
    expect(minimumBody.meta).toMatchObject({ page: 1, limit: 1 });
    expect(maximumBody.meta).toMatchObject({ page: 1, limit: 100 });
  });

  /**
   * Verifies that invalid page-size values use the shared validation envelope.
   * @param invalidLimit Invalid query value supplied for the limit parameter.
   * @returns Promise that resolves after the validation assertions complete.
   */
  it.each(['0', '101', '1.5', 'not-a-number'])('rejects invalid limit %s', async (invalidLimit) => {
    const response = await request(application)
      .get(`/api/v1/products?limit=${invalidLimit}`)
      .expect(400);
    const responseBody: unknown = JSON.parse(response.text);

    expect(responseBody).toMatchObject({
      message: 'Request validation failed',
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  /**
   * Verifies that a page beyond the available records is a valid empty result.
   * @returns Promise that resolves after the empty-page assertions complete.
   */
  it('returns an empty result for a page beyond the available products', async () => {
    const response = await request(application)
      .get('/api/v1/products?page=9999&limit=20')
      .expect(200);
    const responseBody: unknown = JSON.parse(response.text);

    expect(isProductsResponse(responseBody)).toBe(true);
    if (!isProductsResponse(responseBody))
      throw new Error('Products response did not match the API contract');
    expect(responseBody.data).toEqual([]);
    expect(responseBody.meta.page).toBe(9_999);
    expect(responseBody.meta.limit).toBe(20);
    expect(responseBody.meta.total).toBeGreaterThanOrEqual(1);
    expect(responseBody.meta.totalPages).toBeGreaterThanOrEqual(1);
  });

  /**
   * Verifies that adjacent pages use a stable order without overlapping records.
   * @returns Promise that resolves after the page-isolation assertions complete.
   */
  it('returns distinct records for adjacent product pages', async () => {
    const firstPageResponse = await request(application)
      .get('/api/v1/products?page=1&limit=1')
      .expect(200);
    const secondPageResponse = await request(application)
      .get('/api/v1/products?page=2&limit=1')
      .expect(200);
    const firstPageBody: unknown = JSON.parse(firstPageResponse.text);
    const secondPageBody: unknown = JSON.parse(secondPageResponse.text);

    expect(isProductsResponse(firstPageBody)).toBe(true);
    expect(isProductsResponse(secondPageBody)).toBe(true);
    if (!isProductsResponse(firstPageBody) || !isProductsResponse(secondPageBody)) {
      throw new Error('Products response did not match the API contract');
    }
    expect(firstPageBody.data).toHaveLength(1);
    expect(secondPageBody.data).toHaveLength(1);
    const firstProduct = firstPageBody.data[0];
    const secondProduct = secondPageBody.data[0];
    if (firstProduct === undefined || secondProduct === undefined) {
      throw new Error('Expected one product on each page');
    }
    expect(secondProduct.product_code).not.toBe(firstProduct.product_code);
    expect(secondPageBody.meta.total).toBe(firstPageBody.meta.total);
  });

  /**
   * Removes cached test pages to prevent previous runs from affecting assertions.
   * @returns Promise that resolves once each test cache key has been deleted.
   */
  async function clearProductPageCache(): Promise<void> {
    for (const cachedPagination of cachedPaginations) {
      await cache.delete(createProductListCacheKey(cachedPagination));
    }
  }
});
