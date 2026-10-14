# Backend Technical Task

Express API using PostgreSQL, Knex, and Redis. The application provides a cached product-list endpoint and the shared infrastructure for ticket features.

## Prerequisites

- Node.js 22 or later
- Docker Desktop with Docker Compose

## Setup

```bash
copy .env.example .env
npm install
docker compose up --build
```

Docker Compose runs migrations and product seeds before starting the API. The API starts at `http://localhost:3000`, Swagger is available at `http://localhost:3000/api/docs`, and the health endpoint is `GET /api/v1/health`.

## Endpoints

### List products

```text
GET /api/v1/products?page=1&limit=20
```

Returns `product_code`, `product_title`, and `product_price` with pagination metadata. `page` defaults to `1`; `limit` defaults to `20` and is capped at `100`. The endpoint uses Redis cache-aside with a 120-second TTL. The `X-Cache` response header is `MISS` when PostgreSQL supplies the response and `HIT` when Redis supplies it. Each page and limit combination has its own cache entry.

## Environment variables

Copy `.env.example` to `.env`. All variables except `REDIS_PASSWORD` are required by the application.

| Variable | Local Docker value | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Runtime environment: development, test, or production. |
| `PORT` | `3000` | HTTP server port. |
| `API_PREFIX` | `api/v1` | Versioned prefix applied to application routes. |
| `DB_HOST` | `localhost` | PostgreSQL host for commands run from the machine. |
| `DB_PORT` | `5433` | PostgreSQL host port exposed by Docker Compose. |
| `DB_NAME` | `backend_task` | PostgreSQL database name. |
| `DB_USER` | `backend_task` | PostgreSQL user. |
| `DB_PASSWORD` | `backend_task` | PostgreSQL password for local development only. |
| `DB_SSL` | `false` | Whether PostgreSQL uses TLS. |
| `POSTGRES_PORT` | `5433` | Host port Docker Compose maps to PostgreSQL. |
| `REDIS_HOST` | `localhost` | Redis host for commands run from the machine. |
| `REDIS_PORT` | `6379` | Redis host port exposed by Docker Compose. |
| `REDIS_PASSWORD` | empty | Optional Redis password. |

## Database commands

```bash
npm run db:migrate
npm run db:rollback
npm run db:seed
```

Run database commands from a shell with values from `.env` available. When the application is running inside Docker, the database host is `postgres`.
PostgreSQL is exposed to the host on port `5433` by default to avoid conflicts with a local PostgreSQL installation.

## Test environment convention

Unit tests mock repositories and cache services. End-to-end tests verify HTTP behaviour against PostgreSQL and Redis. GitHub Actions provisions isolated PostgreSQL and Redis services for these tests. Locally, run migrations and seeds before executing the end-to-end suite.

## Verification commands

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

## Documentation

- `docs/api-contract.md` defines successful and failed HTTP response envelopes.
- `docs/decisions.md` records significant design choices and their consequences.
- `docs/commit-pr-standard.md` defines the commit, pull request, and issue conventions.
