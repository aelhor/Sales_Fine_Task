# Commit and Pull Request Standard

## Commit message convention

Use Conventional Commits for every commit.

```text
<type>(<scope>): <subject>
```

### Subject rules

- Keep the subject at 50 characters or fewer.
- Use imperative mood, for example `add` rather than `added`.
- Do not end the subject with a period.
- Keep each commit focused on one coherent change.
- Use the optional body only when the rationale is not clear from the subject. Wrap body lines at 72 characters and keep it to three lines or fewer.

### Types

| Type | Use for |
| --- | --- |
| `feat` | A new endpoint, capability, or user-visible behaviour. |
| `fix` | A defect correction. |
| `docs` | Documentation-only changes. |
| `refactor` | Internal restructuring without behaviour changes. |
| `test` | Adding or updating tests. |
| `chore` | Tooling, dependencies, or maintenance work. |
| `infra` | Docker, database, Redis, CI, or environment changes. |

### Scopes

| Scope | Use for |
| --- | --- |
| `products` | Product API, product cache, and product persistence. |
| `tickets` | Ticket API, validation, and ticket persistence. |
| `common` | Shared DTOs, interceptors, filters, logging, and utilities. |
| `database` | Knex configuration, migrations, and seeds. |
| `cache` | Redis client and cache infrastructure. |
| `docs` | README, API contract, Swagger, and delivery documentation. |
| `infra` | Dockerfiles, Compose, environment configuration, and CI. |

### Examples

```text
feat(products): cache product list response
feat(tickets): reject duplicate ticket number
fix(common): return correlation ID on errors
infra(database): add products and tickets migrations
test(tickets): cover duplicate ticket submission
docs(api): document shared response contract
```

## Pull request standard

Every pull request is a concise implementation record. Keep the description factual and easy to review.

### Required description sections

```md
## Summary
What changed and why?

## Approach
How does the implementation work? Mention important architectural decisions.

## Trade-offs
What limitations, alternatives, or follow-up work exist? Write `None` if not applicable.

## Verification
List the commands and manual checks performed.
```

### Pull request checklist

#### Architecture and code quality

- [ ] The change has clear controller, service, repository, and infrastructure responsibilities.
- [ ] Controllers do not access Knex or Redis directly.
- [ ] Services do not access Knex or database tables directly.
- [ ] Repositories contain only persistence operations.
- [ ] Exported code has accurate, concise TSDoc.
- [ ] No em dash is introduced in code or documentation.

#### API and documentation

- [ ] Successful and error responses follow `docs/api-contract.md`.
- [ ] Relevant Swagger definitions and endpoint documentation are updated.
- [ ] API behaviour, environment variables, or Docker instructions are documented when changed.

#### Data and caching

- [ ] A Knex migration exists for every schema change.
- [ ] A database unique constraint protects `ticket_number` when ticket data changes.
- [ ] Cache keys, TTL, invalidation, and Redis-failure behaviour are considered when product caching changes.

#### Testing and verification

- [ ] Controller, service, and repository unit tests are added or updated.
- [ ] End-to-end coverage is added or updated for endpoint behaviour.
- [ ] Formatting, linting, type checking, and tests pass locally.
- [ ] Docker Compose starts the application, database, and Redis successfully when infrastructure changes.

## Issue template

Use this structure for bugs, enhancements, and task follow-ups.

```md
## Description
What is missing or incorrect? Keep it to two or three sentences.

## Expected result
What should happen instead?

## Reproduction steps
1. ...
2. ...
3. ...

## Proposed approach
Describe the intended solution, constraints, and any API, database, or cache impact.

## Acceptance criteria
- [ ] ...
- [ ] ...
```
