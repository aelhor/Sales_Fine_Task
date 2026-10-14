import 'dotenv/config';
import type { Knex } from 'knex';

/**
 * Produces the shared PostgreSQL configuration used by Knex CLI commands.
 * @returns Knex configuration for the active environment.
 */
const createKnexConfiguration = (): Knex.Config => ({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? 'backend_task',
    user: process.env.DB_USER ?? 'backend_task',
    password: process.env.DB_PASSWORD ?? 'backend_task',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './seeds',
  },
});

const configuration: Record<string, Knex.Config> = {
  development: createKnexConfiguration(),
  test: createKnexConfiguration(),
  production: createKnexConfiguration(),
};

export default configuration;
