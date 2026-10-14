import type { NextFunction, Request, Response } from 'express';
import { errorHandlerMiddleware } from './error-handler.middleware';

/**
 * Creates a response mock that supports Express response chaining.
 * @returns Response mock and its observable status and JSON methods.
 */
function createResponseMock(): {
  response: Response;
  status: jest.Mock;
  json: jest.Mock;
} {
  const status = jest.fn();
  const json = jest.fn();
  const response = { status, json } as unknown as Response;
  status.mockReturnValue(response);

  return { response, status, json };
}

describe('errorHandlerMiddleware', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  /**
   * Verifies that unexpected failures use the shared internal-server-error envelope.
   * @returns Nothing after the response contract assertions complete.
   */
  it('returns the standardized response for an unexpected error', () => {
    const { response, status, json } = createResponseMock();
    const request = {
      correlationId: '0f2daaf8-9d0f-4a3e-91ed-2b4bd4f2a993',
      method: 'GET',
      originalUrl: '/api/v1/products',
    } as Request;

    errorHandlerMiddleware(
      new Error('Database unavailable'),
      request,
      response,
      jest.fn() as NextFunction,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      message: 'An unexpected error occurred',
      error: { code: 'INTERNAL_SERVER_ERROR' },
      correlationId: request.correlationId,
    });
  });
});
