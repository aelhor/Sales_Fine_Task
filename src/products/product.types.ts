import type { PaginationMeta } from '../common/dto/api-response.interface';

/**
 * Describes a product exposed by the public API.
 */
export interface Product {
  product_code: string;
  product_title: string;
  product_price: number;
}

/**
 * Describes the origin of a product-list result.
 */
export type ProductCacheStatus = 'HIT' | 'MISS';

/**
 * Describes the pagination values used to retrieve a product page.
 */
export interface ProductPagination {
  page: number;
  limit: number;
}

/**
 * Describes a product page returned by the persistence layer.
 */
export interface ProductPage {
  products: Product[];
  total: number;
}

/**
 * Describes a product-list result, pagination metadata, and its cache state.
 */
export interface ProductListResult {
  products: Product[];
  meta: PaginationMeta;
  cacheStatus: ProductCacheStatus;
}
