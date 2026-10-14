import type { ApiErrorDetail } from '../dto/api-response.interface';

/**
 * Describes the stable data carried by a known application error.
 */
export interface AppExceptionOptions {
  status: number;
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

/**
 * Represents a known client-safe error with a stable API error code.
 */
export class AppException extends Error {
  /**
   * Creates an application exception from stable API error data.
   * @param options HTTP status, error code, message, and optional details.
   */
  constructor(private readonly appError: AppExceptionOptions) {
    super(appError.message);
    this.name = AppException.name;
  }

  /**
   * Returns the HTTP status for this error.
   * @returns HTTP status code.
   */
  get status(): number {
    return this.appError.status;
  }

  /**
   * Returns the stable machine-readable error code.
   * @returns Application error code.
   */
  get code(): string {
    return this.appError.code;
  }

  /**
   * Returns optional client-safe error details.
   * @returns Field-level or contextual error details.
   */
  get details(): ApiErrorDetail[] | undefined {
    return this.appError.details;
  }
}
