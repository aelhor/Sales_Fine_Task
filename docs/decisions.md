# Engineering Decisions

This record captures the decisions that shape the API, data model, and operational behaviour of the service.

## Relational data model

### Decision

PostgreSQL is the system of record. The service uses Knex migrations to manage the `products` and `tickets` tables. `products.product_code` and `tickets.ticket_number` are protected by database unique constraints. Product prices use `NUMERIC(12,2)` with a non-negative check constraint.

### Rationale

Constraints placed in the database protect data integrity for every access path, including concurrent requests. `NUMERIC(12,2)` stores decimal prices exactly and avoids floating-point storage errors.

### Consequences

Seed data is provided for products because the API exposes product retrieval without a product-creation route. Supporting multiple currencies would require an explicit currency field and pricing policy.

## Product-list caching

### Decision

The product list uses the cache-aside pattern with Redis and validated `page` and `limit` query parameters. The service reads a versioned key in the form `products:list:v1:page:{page}:limit:{limit}` before querying PostgreSQL. On a cache miss, it loads the requested page, stores only that page and its total count in Redis for 120 seconds, and then returns it to the caller.

### Rationale

Cache-aside keeps PostgreSQL as the source of truth while reducing repeated read load. Page-specific keys prevent one pagination result from being served for a different page or page size. A versioned key allows the cached representation to change safely without reusing incompatible values.

### Consequences

The API constructs the response envelope for every request. It never caches a completed HTTP response, which ensures each request receives a unique correlation ID. Redis read and write failures fall back to PostgreSQL so the cache is not a source of API unavailability. Product write operations must invalidate product-list cache entries when they are introduced.

## Concurrent cache-miss protection

### Decision

The product service uses in-process single-flight request coalescing. For a given cache key, the first cache-miss request starts the database load and concurrent requests await that same in-progress operation.

### Rationale

Without coordination, simultaneous cache misses can create a cache stampede, where many requests bypass Redis and query PostgreSQL at once. Coalescing requests reduces unnecessary database load while retaining cache-aside behaviour.

### Consequences

This approach coordinates requests inside one API process, which matches the current deployment. A horizontally scaled deployment would require a Redis-backed distributed lock or equivalent cross-process coordination.

## Ticket persistence and retrieval

### Decision

Ticket creation relies on the `ticket_number` unique constraint. PostgreSQL uses `ON CONFLICT DO NOTHING`, and the service translates a non-created ticket into a `409 Conflict` response. Ticket collection retrieval is paginated, ordered by newest first, and is not cached.

### Rationale

The database constraint remains correct under concurrent writes. Pagination keeps collection responses bounded as ticket volume grows. Ticket data is operational data, so reads favour freshness over a cache layer.

### Consequences

The application does not perform a pre-insert uniqueness check as its only duplicate defence. Such a check can race with another request.

## API contract and errors

### Decision

All successful and failed responses follow `docs/api-contract.md`. Request bodies are validated at the HTTP boundary with Zod. Expected application errors use `AppException` and are formatted by a single global error handler.

### Rationale

The shared contract keeps endpoint behaviour predictable. Boundary validation prevents invalid input from entering services, while centralized error handling keeps controllers focused on HTTP mapping.

### Consequences

Each request receives a correlation ID that is returned in both successful and failed responses. Client-safe error codes remain stable even when internal implementation details change.

## Application composition

### Decision

The application uses feature-oriented folders. Routes and controllers handle HTTP concerns, services contain business logic, repositories own Knex queries, and infrastructure services own Redis and database clients. Dependencies are composed explicitly in `app.ts`.

### Rationale

Explicit composition makes dependencies visible and keeps feature code easy to test without a framework-specific dependency injection container.

## Verification and delivery

### Decision

Unit tests verify service behaviour with mocked dependencies. End-to-end tests verify the HTTP contract against PostgreSQL and Redis. Docker Compose provides the local runtime, while GitHub Actions verifies linting, type checking, migrations, tests, the production build, and Docker image creation.

### Rationale

The combination checks business behaviour, API integration, and reproducible delivery from a clean environment.
