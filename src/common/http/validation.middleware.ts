/* eslint-disable @typescript-eslint/no-namespace */
import type { NextFunction, Request, Response } from 'express';
import type { ZodType, ZodTypeAny } from 'zod';
import { AppException } from '../exceptions/app.exception';

declare global {
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
    }
  }
}

/**
 * Validates a request body with a Zod schema before passing it to a route handler.
 * @param schema Zod schema used to validate the request body.
 * @returns Express middleware that either assigns validated data or forwards an error.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const requestBody: unknown = request.body;
    const result = schema.safeParse(requestBody);
    if (result.success) {
      request.body = result.data;
      next();
      return;
    }

    next(
      new AppException({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      }),
    );
  };
}

/**
 * Validates query parameters before passing a route handler its normalized values.
 * @param schema Zod schema used to validate the query parameters.
 * @returns Express middleware that assigns validated query data or forwards an error.
 */
export function validateQuery<TSchema extends ZodTypeAny>(schema: TSchema) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request.query);
    if (result.success) {
      request.validatedQuery = result.data;
      next();
      return;
    }

    next(
      new AppException({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      }),
    );
  };
}
