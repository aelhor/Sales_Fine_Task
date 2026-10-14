import type { Knex } from 'knex';

/**
 * Creates the tickets table used by the ticket endpoints.
 * @param knex Knex client executing the schema change.
 * @returns Nothing after the table is created.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tickets', (table) => {
    table.bigIncrements('id').primary();
    table.integer('ticket_number').notNullable().unique();
    table.string('subject', 255).notNullable();
    table.text('description').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

/**
 * Removes the tickets table when rolling back the schema change.
 * @param knex Knex client executing the schema rollback.
 * @returns Nothing after the tickets table is removed.
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tickets');
}
