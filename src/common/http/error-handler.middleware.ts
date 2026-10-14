import type { ErrorRequestHandler } from 'express';
import type { ApiErrorResponse } from '../dto/api-response.interface';
import { AppException } from '../exceptions/app.exception';

/**
 * Converts thrown errors into the shared API error envelope.
 */
export const errorHandlerMiddleware: ErrorRequestHandler = (
  error,
  request,
  response,
  next,
): void => {
  void next;
  const knownError = error instanceof AppException ? error : undefined;
  const status = knownError?.status ?? 500;
  const payload: ApiErrorResponse = {
    message: knownError?.message ?? 'An unexpected error occurred',
    error: {
      code: knownError?.code ?? 'INTERNAL_SERVER_ERROR',
      ...(knownError?.details === undefined ? {} : { details: knownError.details }),
    },
    correlationId: request.correlationId,
  };

  console.error({
    correlationId: request.correlationId,
    method: request.method,
    path: request.originalUrl,
    status,
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  response.status(status).json(payload);
};
