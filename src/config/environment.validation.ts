/**
 * Defines the supported runtime environments.
 */
export type NodeEnvironment = 'development' | 'test' | 'production';

/**
 * Describes validated environment configuration consumed by the application.
 */
export interface EnvironmentConfiguration {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  API_PREFIX: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SSL: boolean;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
}

/**
 * Validates and normalizes runtime environment variables during application startup.
 * @param environment Unvalidated environment values.
 * @returns Typed configuration that infrastructure providers can safely consume.
 * @throws Error When a required value is absent or invalid.
 */
export function validateEnvironment(
  environment: Record<string, unknown>,
): EnvironmentConfiguration {
  const nodeEnvironment = readOptionalString(environment, 'NODE_ENV') ?? 'development';
  if (!isNodeEnvironment(nodeEnvironment)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const apiPrefix = readOptionalString(environment, 'API_PREFIX') ?? 'api/v1';
  if (!/^[a-z0-9]+(?:\/[a-z0-9-]+)*$/i.test(apiPrefix)) {
    throw new Error('API_PREFIX must contain path segments without leading or trailing slashes');
  }

  return {
    NODE_ENV: nodeEnvironment,
    PORT: readPort(environment, 'PORT', 3000),
    API_PREFIX: apiPrefix,
    DB_HOST: readRequiredString(environment, 'DB_HOST'),
    DB_PORT: readPort(environment, 'DB_PORT', 5432),
    DB_NAME: readRequiredString(environment, 'DB_NAME'),
    DB_USER: readRequiredString(environment, 'DB_USER'),
    DB_PASSWORD: readRequiredString(environment, 'DB_PASSWORD'),
    DB_SSL: readBoolean(environment, 'DB_SSL', false),
    REDIS_HOST: readRequiredString(environment, 'REDIS_HOST'),
    REDIS_PORT: readPort(environment, 'REDIS_PORT', 6379),
    REDIS_PASSWORD: readOptionalString(environment, 'REDIS_PASSWORD'),
  };
}

/**
 * Reads a mandatory non-empty string environment value.
 * @param environment Source environment values.
 * @param key Environment variable name.
 * @returns Trimmed string value.
 * @throws Error When the value is absent.
 */
function readRequiredString(environment: Record<string, unknown>, key: string): string {
  const value = readOptionalString(environment, key);
  if (value === undefined) throw new Error(`${key} is required`);
  return value;
}

/**
 * Reads an optional non-empty string environment value.
 * @param environment Source environment values.
 * @param key Environment variable name.
 * @returns Trimmed value, or undefined when omitted.
 */
function readOptionalString(environment: Record<string, unknown>, key: string): string | undefined {
  const value = environment[key];
  if (typeof value !== 'string') return undefined;
  const normalizedValue = value.trim();
  return normalizedValue.length === 0 ? undefined : normalizedValue;
}

/**
 * Reads and validates a TCP port.
 * @param environment Source environment values.
 * @param key Environment variable name.
 * @param fallback Value used when the variable is omitted.
 * @returns Valid TCP port.
 */
function readPort(environment: Record<string, unknown>, key: string, fallback: number): number {
  const rawValue = readOptionalString(environment, key);
  if (rawValue === undefined) return fallback;
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${key} must be an integer between 1 and 65535`);
  }
  return value;
}

/**
 * Reads and validates a boolean environment value.
 * @param environment Source environment values.
 * @param key Environment variable name.
 * @param fallback Value used when the variable is omitted.
 * @returns Parsed boolean value.
 */
function readBoolean(
  environment: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const rawValue = readOptionalString(environment, key);
  if (rawValue === undefined) return fallback;
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;
  throw new Error(`${key} must be true or false`);
}

/**
 * Checks whether a value is a supported runtime environment.
 * @param value Candidate environment value.
 * @returns Whether the value is supported.
 */
function isNodeEnvironment(value: string): value is NodeEnvironment {
  return value === 'development' || value === 'test' || value === 'production';
}
