import type { ProductRepository } from './product.repository';
import type { ProductListResult, ProductPage, ProductPagination } from './product.types';

/**
 * Cache key used for the versioned product-list representation.
 */
export const PRODUCT_LIST_CACHE_KEY_PREFIX = 'products:list:v1';

/**
 * Cache lifetime required for the product-list representation.
 */
export const PRODUCT_LIST_CACHE_TTL_SECONDS = 120;

/**
 * Defines cache operations required by the product service.
 */
export interface ProductCacheStore {
  get(key: string): Promise<ProductPage | null>;
  set(key: string, value: ProductPage, ttlSeconds: number): Promise<void>;
}

/**
 * Builds the Redis key for one cached product page.
 * @param pagination Requested page and page size.
 * @returns Versioned key for the requested product page.
 */
export function createProductListCacheKey(pagination: ProductPagination): string {
  return `${PRODUCT_LIST_CACHE_KEY_PREFIX}:page:${pagination.page}:limit:${pagination.limit}`;
}

/**
 * Retrieves products with cache-aside and cache-stampede protection.
 */
export class ProductService {
  private readonly inFlightLoads = new Map<string, Promise<ProductPage>>();

  /**
   * Creates a product service with persistence and cache dependencies.
   * @param productRepository Repository used to retrieve products.
   * @param cache Cache used to store the product-list representation.
   */
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly cache: ProductCacheStore,
  ) {}

  /**
   * Retrieves one product page from Redis or PostgreSQL.
   * @param pagination Requested page and page size.
   * @returns Product list, pagination metadata, and the cache state.
   */
  async getProducts(pagination: ProductPagination): Promise<ProductListResult> {
    const cacheKey = createProductListCacheKey(pagination);
    const cachedPage = await this.cache.get(cacheKey);
    if (cachedPage !== null) {
      return this.createResult(cachedPage, pagination, 'HIT');
    }

    const productPage = await this.loadProductsForCacheMiss(cacheKey, pagination);
    return this.createResult(productPage, pagination, 'MISS');
  }

  /**
   * Shares one database load between concurrent requests for the same key.
   * @param cacheKey Redis key for the requested product page.
   * @param pagination Requested page and page size.
   * @returns Product page loaded for a cache miss.
   */
  private async loadProductsForCacheMiss(
    cacheKey: string,
    pagination: ProductPagination,
  ): Promise<ProductPage> {
    const existingLoad = this.inFlightLoads.get(cacheKey);
    if (existingLoad !== undefined) return existingLoad;

    const load = this.loadAndCacheProducts(cacheKey, pagination);
    this.inFlightLoads.set(cacheKey, load);

    try {
      return await load;
    } finally {
      this.inFlightLoads.delete(cacheKey);
    }
  }

  /**
   * Loads a product page from PostgreSQL and populates the Redis cache.
   * @param cacheKey Redis key for the requested product page.
   * @param pagination Requested page and page size.
   * @returns Product page retrieved from the repository.
   */
  private async loadAndCacheProducts(
    cacheKey: string,
    pagination: ProductPagination,
  ): Promise<ProductPage> {
    const productPage = await this.productRepository.findPage(pagination);
    await this.cache.set(cacheKey, productPage, PRODUCT_LIST_CACHE_TTL_SECONDS);
    return productPage;
  }

  /**
   * Creates the API-ready result for a cached or database-backed product page.
   * @param productPage Product records and their total count.
   * @param pagination Requested page and page size.
   * @param cacheStatus Cache state for the current request.
   * @returns Product result with pagination metadata.
   */
  private createResult(
    productPage: ProductPage,
    pagination: ProductPagination,
    cacheStatus: ProductListResult['cacheStatus'],
  ): ProductListResult {
    return {
      products: productPage.products,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: productPage.total,
        totalPages: Math.ceil(productPage.total / pagination.limit),
      },
      cacheStatus,
    };
  }
}
