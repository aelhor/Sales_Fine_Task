# API Contract

## Scope

This document defines the response envelope shared by all HTTP endpoints in this application.

## Success responses

All successful responses use the following shape:

```ts
interface ApiSuccessResponse<T> {
  message: string;
  data: T;
  meta?: PaginationMeta;
  correlationId: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

| Field | Required | Description |
| --- | --- | --- |
| `message` | Yes | Concise, client-safe success message. |
| `data` | Yes | Endpoint result payload. It may be an object, array, or `null` when applicable. |
| `meta` | No | Pagination information. Include only for paginated collections. |
| `correlationId` | Yes | Request identifier used to trace logs and support requests. |

### Example: product list

```json
{
  "message": "Products retrieved successfully",
  "data": [
    {
      "productCode": "PRD-001",
      "productTitle": "Mechanical Keyboard",
      "productPrice": 99.99
    }
  ],
  "correlationId": "8e2cb7b2-41b1-4205-8df4-83e7e53999db"
}
```

### Example: paginated collection

```json
{
  "message": "Products retrieved successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  },
  "correlationId": "8e2cb7b2-41b1-4205-8df4-83e7e53999db"
}
```

## Error responses

All errors use the following shape:

```ts
interface ApiErrorResponse {
  message: string;
  error: {
    code: string;
    details?: ApiErrorDetail[];
  };
  correlationId: string;
}

interface ApiErrorDetail {
  field?: string;
  message: string;
}
```

| Field | Required | Description |
| --- | --- | --- |
| `message` | Yes | Concise, client-safe summary of the error. |
| `error.code` | Yes | Stable, machine-readable application error code. |
| `error.details` | No | Field-level or contextual error details. |
| `correlationId` | Yes | Request identifier used to trace logs and support requests. |

### Example: validation error

```json
{
  "message": "Request validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "ticketNumber",
        "message": "ticketNumber must be an integer"
      }
    ]
  },
  "correlationId": "8e2cb7b2-41b1-4205-8df4-83e7e53999db"
}
```

### Example: duplicate ticket number

```json
{
  "message": "A ticket with this ticket number already exists",
  "error": {
    "code": "TICKET_NUMBER_ALREADY_EXISTS",
    "details": [
      {
        "field": "ticketNumber",
        "message": "ticketNumber must be unique"
      }
    ]
  },
  "correlationId": "8e2cb7b2-41b1-4205-8df4-83e7e53999db"
}
```

## HTTP status mapping

| Status | When to use it | Suggested error code |
| --- | --- | --- |
| `400 Bad Request` | Invalid request body, parameters, or query string. | `VALIDATION_ERROR` |
| `404 Not Found` | Requested resource does not exist. | `RESOURCE_NOT_FOUND` |
| `409 Conflict` | A unique constraint or state conflict prevents completion. | `TICKET_NUMBER_ALREADY_EXISTS` |
| `500 Internal Server Error` | Unexpected server failure. Do not expose implementation details. | `INTERNAL_SERVER_ERROR` |

## Correlation ID rules

- Read the incoming `x-correlation-id` header when present and valid; otherwise generate a UUID for the request.
- Return the value in the `correlationId` response field and in the `x-correlation-id` response header.
- Include the value in every structured log entry produced while handling that request.
- Never trust a correlation ID as authentication or authorization data.

## Naming rules

- HTTP JSON fields use `camelCase`.
- Database columns may use `snake_case` and are mapped inside repositories.
- Prices are returned as JSON numbers. The database stores them as a fixed-precision decimal type.
- Dates, if added later, use ISO 8601 UTC strings.
