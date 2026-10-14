/* eslint-disable @typescript-eslint/no-namespace */
import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

declare global {
  namespace Express {
    /**
     * Request data added by correlation ID middleware.
     */
    interface Request {
      correlationId: string;
    }
  }
}

/**
 * Adds or propagates a correlation identifier for every HTTP request.
 * @param request Incoming Express request.
 * @param response Outgoing Express response.
 * @param next Express continuation callback.
 * @returns Nothing after passing control to the next middleware.
 */
export const correlationIdMiddleware: RequestHandler = (request, response, next): void => {
  const incomingCorrelationId = request.header('x-correlation-id');
  const correlationId = incomingCorrelationId?.trim() || randomUUID();
  request.correlationId = correlationId;
  response.setHeader('x-correlation-id', correlationId);
  next();
};
