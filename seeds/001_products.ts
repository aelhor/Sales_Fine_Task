import type { Knex } from 'knex';

/**
 * Inserts the baseline product catalog used by the product-list endpoint.
 * @param knex Knex client executing the seed operation.
 * @returns Nothing after inserting any missing product records.
 */
export async function seed(knex: Knex): Promise<void> {
  await knex('products')
    .insert([
      {
        product_code: 'PRD-001',
        product_title: 'Wireless Keyboard',
        product_price: '49.99',
      },
      {
        product_code: 'PRD-002',
        product_title: 'Ergonomic Mouse',
        product_price: '34.50',
      },
      {
        product_code: 'PRD-003',
        product_title: 'USB-C Docking Station',
        product_price: '129.00',
      },
    ])
    .onConflict('product_code')
    .ignore();
}
