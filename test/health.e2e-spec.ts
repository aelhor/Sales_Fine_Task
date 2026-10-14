import request from 'supertest';
import { createApplication, type ApplicationResources } from '../src/app';
import type { ApiSuccessResponse } from '../src/common/dto/api-response.interface';
import { createTestConfiguration } from './support/test-configuration';

/**
 * Checks whether a JSON value matches the expected health endpoint envelope.
 * @param value Parsed JSON value to validate.
 * @returns Whether the value is a valid health response envelope.
 */
function isHealthResponse(
  value: unknown,
): value is ApiSuccessResponse<{ status: string; timestamp: string }> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.message === 'Application is healthy' &&
    typeof candidate.correlationId === 'string' &&
    typeof candidate.data === 'object' &&
    candidate.data !== null &&
    (candidate.data as Record<string, unknown>).status === 'ok'
  );
}

describe('Health endpoint', () => {
  let application: ReturnType<typeof createApplication>['app'];
  let resources: ApplicationResources;

  beforeAll(() => {
    const createdApplication = createApplication(createTestConfiguration());
    application = createdApplication.app;
    resources = createdApplication.resources;
  });

  afterAll(async () => {
    await resources.close();
  });

  /**
   * Verifies that the application exposes its liveness endpoint.
   * @returns Promise that resolves after response assertions complete.
   */
  it('returns the shared success response envelope', async () => {
    const response = await request(application).get('/api/v1/health').expect(200);
    const responseBody: unknown = JSON.parse(response.text);

    expect(response.headers['x-correlation-id']).toEqual(expect.any(String));
    expect(isHealthResponse(responseBody)).toBe(true);
    if (!isHealthResponse(responseBody))
      throw new Error('Health response did not match the API contract');
    expect(responseBody.data.status).toBe('ok');
    expect(Number.isNaN(Date.parse(responseBody.data.timestamp))).toBe(false);
  });
});
