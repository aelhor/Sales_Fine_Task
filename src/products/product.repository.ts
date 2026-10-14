import type { Knex } from 'knex';
import type { Product, ProductPage, ProductPagination } from './product.types';

/**
 * Defines persistence operations required by the product service.
 */
export interface ProductRepository {
  findPage(pagination: ProductPagination): Promise<ProductPage>;
}

/**
 * Retrieves products from PostgreSQL through Knex.
 */
export class KnexProductRepository implements ProductRepository {
  /**
   * Creates a product repository using the shared Knex client.
   * @param database Knex client used for product queries.
   */
  constructor(private readonly database: Knex) {}

  /**
   * Retrieves one product page and the total number of products.
   * @param pagination Requested page and page size.
   * @returns Public product records and their total count.
   */
  async findPage(pagination: ProductPagination): Promise<ProductPage> {
    const [products, totalRow] = await Promise.all([
      this.database.raw<{ rows: Product[] }>(
        `
          SELECT product_code, product_title, product_price::double precision AS product_price
          FROM products
          ORDER BY product_code ASC
          LIMIT ?
          OFFSET ?
        `,
        [pagination.limit, (pagination.page - 1) * pagination.limit],
      ),
      this.database('products').count<{ count: string }>('id as count').first(),
    ]);

    return { products: products.rows, total: Number(totalRow?.count ?? 0) };
  }
}
