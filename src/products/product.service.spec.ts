import type { ProductRepository } from './product.repository';
import {
  PRODUCT_LIST_CACHE_TTL_SECONDS,
  ProductService,
  createProductListCacheKey,
  type ProductCacheStore,
} from './product.service';
import type { Product, ProductPage, ProductPagination } from './product.types';

/**
 * Creates a promise whose resolution is controlled by the test.
 * @returns Deferred promise and its resolver.
 */
function createDeferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return { promise, resolve: resolvePromise };
}

describe('ProductService', () => {
  const products: Product[] = [
    {
      product_code: 'PRD-001',
      product_title: 'Wireless Keyboard',
      product_price: 49.99,
    },
  ];
  const pagination: ProductPagination = { page: 1, limit: 20 };
  const productPage: ProductPage = { products, total: 1 };
  let productRepository: jest.Mocked<ProductRepository>;
  let cache: jest.Mocked<ProductCacheStore>;
  let productService: ProductService;

  beforeEach(() => {
    productRepository = { findPage: jest.fn() };
    cache = { get: jest.fn(), set: jest.fn() };
    productService = new ProductService(productRepository, cache);
  });

  /**
   * Verifies that cached data avoids an unnecessary database query.
   * @returns Promise that resolves after the cache-hit assertions complete.
   */
  it('returns products from Redis on a cache hit', async () => {
    cache.get.mockResolvedValue(productPage);

    await expect(productService.getProducts(pagination)).resolves.toEqual({
      products,
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      cacheStatus: 'HIT',
    });

    expect(cache.get.mock.calls).toEqual([[createProductListCacheKey(pagination)]]);
    expect(productRepository.findPage.mock.calls).toHaveLength(0);
    expect(cache.set.mock.calls).toHaveLength(0);
  });

  /**
   * Verifies that a cache miss loads PostgreSQL data and applies the required TTL.
   * @returns Promise that resolves after the cache-miss assertions complete.
   */
  it('loads and caches products on a cache miss', async () => {
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue();
    productRepository.findPage.mockResolvedValue(productPage);

    await expect(productService.getProducts(pagination)).resolves.toEqual({
      products,
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      cacheStatus: 'MISS',
    });

    expect(productRepository.findPage.mock.calls).toEqual([[pagination]]);
    expect(cache.set.mock.calls).toEqual([
      [createProductListCacheKey(pagination), productPage, PRODUCT_LIST_CACHE_TTL_SECONDS],
    ]);
  });

  /**
   * Verifies that concurrent cache misses share one repository request.
   * @returns Promise that resolves after concurrent request assertions complete.
   */
  it('coalesces concurrent cache misses into one database query', async () => {
    const deferredProducts = createDeferred<ProductPage>();
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue();
    productRepository.findPage.mockReturnValue(deferredProducts.promise);

    const firstRequest = productService.getProducts(pagination);
    const secondRequest = productService.getProducts(pagination);
    await Promise.resolve();
    await Promise.resolve();

    expect(productRepository.findPage.mock.calls).toHaveLength(1);

    deferredProducts.resolve(productPage);

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      {
        products,
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        cacheStatus: 'MISS',
      },
      {
        products,
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        cacheStatus: 'MISS',
      },
    ]);
  });

  /**
   * Verifies that distinct pagination requests do not share a cache entry.
   * @returns Promise that resolves after the cache-key assertions complete.
   */
  it('uses independent cache keys for distinct product pages', async () => {
    const secondPagination: ProductPagination = { page: 2, limit: 20 };
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue();
    productRepository.findPage.mockResolvedValue(productPage);

    await productService.getProducts(pagination);
    await productService.getProducts(secondPagination);

    expect(cache.set.mock.calls).toEqual([
      [createProductListCacheKey(pagination), productPage, PRODUCT_LIST_CACHE_TTL_SECONDS],
      [createProductListCacheKey(secondPagination), productPage, PRODUCT_LIST_CACHE_TTL_SECONDS],
    ]);
  });

  /**
   * Verifies that a rejected database request does not leave a stale in-flight entry.
   * @returns Promise that resolves after a subsequent request successfully retries.
   */
  it('retries a cache miss after an in-flight database request fails', async () => {
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue();
    productRepository.findPage.mockRejectedValueOnce(new Error('Database unavailable'));

    await expect(productService.getProducts(pagination)).rejects.toThrow('Database unavailable');

    productRepository.findPage.mockResolvedValueOnce(productPage);

    await expect(productService.getProducts(pagination)).resolves.toEqual({
      products,
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      cacheStatus: 'MISS',
    });
    expect(productRepository.findPage.mock.calls).toHaveLength(2);
  });

  /**
   * Verifies that pagination metadata represents empty and partial final pages.
   * @returns Promise that resolves after the metadata assertions complete.
   */
  it('creates accurate metadata for empty and partial pages', async () => {
    cache.get
      .mockResolvedValueOnce({ products: [], total: 0 })
      .mockResolvedValueOnce({ products, total: 21 });

    await expect(productService.getProducts(pagination)).resolves.toMatchObject({
      products: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      cacheStatus: 'HIT',
    });
    await expect(productService.getProducts({ page: 2, limit: 20 })).resolves.toMatchObject({
      products,
      meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
      cacheStatus: 'HIT',
    });
  });
});
