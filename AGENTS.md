# Backend Technical Task Guidelines

## Project intent

- Build this assignment with Express, TypeScript, Knex, a relational database, and Redis.
- Use Express as the application framework.
- Prefer a small, production-minded solution over unnecessary abstractions or dependencies.

## Architecture and responsibility boundaries

- Organize code by feature module, for example `products` and `tickets`.
- Controllers own HTTP concerns only: route definitions, request and response schemas, Swagger definitions, and delegation to services. Controllers must not contain business rules, query the database, or access Redis directly.
- Services own orchestration and business rules: validation beyond DTO syntax, duplicate detection, caching policy, and mapping domain results to application results. Services must not access Knex or database tables directly.
- Repositories own persistence only: Knex queries, transactions, and database-specific mapping. Repositories must not contain HTTP concerns, caching, or business policy.
- Use the repository pattern for every database-backed feature. Define the repository interface and its Knex implementation in the same repository file unless the interface is genuinely shared across modules. Export an injection token and inject the interface by token.
- Do not create service interfaces by default. Use concrete services. Add a service interface only when there are multiple implementations or it is a real module boundary that benefits from a stable contract.
- Keep Redis behind a small cache abstraction or a dedicated infrastructure provider. The product service decides when to read, write, and invalidate cache entries; the Redis provider only performs cache operations.

## Code quality

- Follow SOLID principles when they make the code clearer. Do not create abstractions solely to satisfy an acronym.
- Give classes, methods, DTOs, interfaces, and variables explicit, intention-revealing names.
- Add concise TSDoc to every exported class, interface, method, and function. For non-trivial private methods, document the why and any important invariant. Do not add boilerplate comments that merely restate the method name.
- TSDoc should explain purpose, parameters, return value when useful, thrown exceptions, side effects, and important assumptions. Keep it accurate when code changes.
- Add short clarifying comments around non-obvious logic, especially cache behaviour, uniqueness handling, and database transactions. Avoid comments for obvious syntax.
- Use strict TypeScript. Do not use `any`, unchecked type assertions, or swallowed errors.
- Prefer dependency injection, immutable values where practical, and small focused methods.
- Do not use an em dash anywhere in source code, documentation, commit messages, API messages, or examples. Use commas, parentheses, or a normal hyphen instead.

## API conventions

- Define a shared API contract in `docs/api-contract.md` and implement it with shared response helpers and error middleware.
- Successful responses must use this shape:

```ts
{
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  correlationId: string;
}
```

- Include `meta` only when it is useful, such as for pagination. For the product-list endpoint, add it if the endpoint supports pagination; otherwise omit it.
- Generate or propagate a `correlationId` for every request. Return it in successful and error responses, and include it in logs.
- Use global error middleware to normalize all errors. Error responses must use this shape:

```ts
{
  message: string;
  error: {
    code: string;
    details?: Array<{ field?: string; message: string }>;
  };
  correlationId: string;
}
```

- Map errors to accurate HTTP statuses. Use `400` for invalid request data, `404` for missing resources, `409` for a duplicate `ticket_number`, and `500` only for unexpected server failures.
- Never expose stack traces, raw database errors, secrets, or internal implementation details to API clients.
- Validate request schemas with Zod middleware. Reject unknown fields unless a route explicitly allows them.

## Swagger and documentation

- Keep feature Swagger definitions in a single feature-level file, such as `products.openapi.ts`. Route registration imports these reusable definitions.
- Document every public endpoint, input DTO, response DTO, successful response, and expected error response in Swagger.
- Keep project documentation concise and task-specific. Maintain a clear README with setup, environment variables, database migrations and seeds, Docker commands, test commands, endpoint examples, and caching behaviour.

## Data, caching, and reliability

- Use Knex migrations and seeds. Do not create or alter schema from application code.
- Enforce `ticket_number` uniqueness both with a database unique constraint and with application-level handling that returns a clear `409` response. The database constraint is the source of truth under concurrent requests.
- Cache the product-list response in Redis under a stable, namespaced key. Use a 120-second TTL. Cache only successful serialized responses and fail open when Redis is unavailable: log the issue and serve the database result.
- Define cache-key inputs explicitly. If pagination or filters are added, include all of them in the cache key.
- Use transactions for multi-step writes only when they are actually needed.

## Testing

- Co-locate a unit test beside every controller, service, and repository: `*.controller.spec.ts`, `*.service.spec.ts`, and `*.repository.spec.ts`.
- Unit tests must mock dependencies and verify behaviour, not implementation details.
- Add end-to-end tests for both required endpoints, including product cache miss and hit, ticket validation failures, successful ticket creation, and duplicate ticket rejection.
- Tests must be deterministic and must not require a developer's local Redis instance. Use test containers, a dedicated test service, or mock Redis as appropriate.

## Docker and delivery

- Dockerize the Express application and provide Docker Compose for the application, relational database, and Redis.
- Use environment variables with an `.env.example`. Never commit real credentials or secrets.
- Keep images small and reproducible. Use a multi-stage Docker build, run as a non-root user when practical, and include a health check.
- Before considering work complete, run formatting, linting, type checking, unit tests, end-to-end tests, and the Docker Compose stack.

## Working agreement for Codex

- Before changing code, inspect the relevant module, DTOs, repository contract, migrations, tests, and existing API contract.
- Make the smallest coherent change that satisfies the requirement. Do not refactor unrelated code.
- When adding a feature, update its migration, DTOs, repository, service, controller, Swagger file, tests, and documentation as applicable.
- Report assumptions, commands run, and validation results. Flag any requirement ambiguity that materially affects the solution.
