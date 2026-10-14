import type { Response } from 'express';

/**
 * Describes pagination metadata returned by collection endpoints.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Describes the standard envelope for successful API responses.
 */
export interface ApiSuccessResponse<T> {
  message: string;
  data: T;
  meta?: PaginationMeta;
  correlationId: string;
}

/**
 * Describes one client-safe detail associated with an API error.
 */
export interface ApiErrorDetail {
  field?: string;
  message: string;
}

/**
 * Describes the standard envelope for failed API responses.
 */
export interface ApiErrorResponse {
  message: string;
  error: { code: string; details?: ApiErrorDetail[] };
  correlationId: string;
}

/**
 * Sends a success response using the shared API contract.
 * @param response Express response used to send the result.
 * @param correlationId Request correlation identifier.
 * @param message Client-safe success message.
 * @param data Endpoint result payload.
 * @param options Optional response status and pagination metadata.
 * @returns Nothing after sending the standardized payload.
 */
export function sendSuccess<T>(
  response: Response,
  correlationId: string,
  message: string,
  data: T,
  options: { status?: number; meta?: PaginationMeta } = {},
): void {
  const payload: ApiSuccessResponse<T> = {
    message,
    data,
    ...(options.meta === undefined ? {} : { meta: options.meta }),
    correlationId,
  };
  response.status(options.status ?? 200).json(payload);
}
