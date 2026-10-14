import { knex, type Knex } from 'knex';
import type { EnvironmentConfiguration } from '../config/environment.validation';

/**
 * Creates the shared Knex client used by repositories.
 * @param configuration Validated runtime configuration.
 * @returns Configured Knex client with lazy database connections.
 */
export function createDatabaseClient(configuration: EnvironmentConfiguration): Knex {
  return knex({
    client: 'pg',
    connection: {
      host: configuration.DB_HOST,
      port: configuration.DB_PORT,
      database: configuration.DB_NAME,
      user: configuration.DB_USER,
      password: configuration.DB_PASSWORD,
      ssl: configuration.DB_SSL ? { rejectUnauthorized: false } : false,
    },
  });
}
