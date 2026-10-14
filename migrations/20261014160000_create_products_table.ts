import type { Knex } from 'knex';

/**
 * Creates the products table used by the product-list endpoint.
 * @param knex Knex client executing the schema change.
 * @returns Nothing after the table and its constraints are created.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('products', (table) => {
    table.bigIncrements('id').primary();
    table.string('product_code', 100).notNullable().unique();
    table.string('product_title', 255).notNullable();
    table.decimal('product_price', 12, 2).notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(
    'ALTER TABLE products ADD CONSTRAINT products_product_price_non_negative CHECK (product_price >= 0)',
  );
}

/**
 * Removes the products table when rolling back the schema change.
 * @param knex Knex client executing the schema rollback.
 * @returns Nothing after the products table is removed.
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('products');
}
