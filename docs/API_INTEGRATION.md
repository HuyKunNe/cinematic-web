# API Integration

## 1. Source of truth

Backend repository:

https://github.com/HuyKunNe/cinema-system

Backend code and published OpenAPI specifications are the source of truth for API contracts.

Do not infer contracts from old frontend code.

## 2. Tooling

Use:

- Axios for HTTP transport
- Orval for OpenAPI generation
- TanStack Vue Query for server state
- MSW for optional development mocks
- Zod only where runtime validation is explicitly required

## 3. Target structure

```text
openapi/
├── README.md
├── gateway.json
├── user-service.json
├── movie-service.json
├── showtime-service.json
└── booking-service.json

src/shared/api/
├── generated/
├── http/
│   ├── axios-instance.ts
│   ├── error-normalizer.ts
│   └── request-context.ts
├── mappers/
└── index.ts

orval.config.ts
```

Actual service files depend on backend OpenAPI availability.

## 4. Generation rules

- Generate clients from validated OpenAPI documents.
- Prefer stable local OpenAPI snapshots for reproducible generation.
- Use `client: "vue-query"`.
- Use `mode: "tags-split"` where backend tags are reliable.
- Store schemas separately.
- Use the centralized Axios instance.
- Never edit generated files.
- Regenerate when the OpenAPI contract changes.
- Review generated diffs before committing.

## 5. Planned scripts

```json
{
  "scripts": {
    "api:generate": "orval --config ./orval.config.ts",
    "api:watch": "orval --config ./orval.config.ts --watch"
  }
}
```

These scripts are planned and must not be added until dependencies and paths are approved.

## 6. HTTP client responsibilities

The shared Axios instance may handle:

- Base URL
- Access token
- Request identifier
- Locale
- Timeout
- Normalized transport errors

It must not contain feature-specific business logic.

## 7. Environment variables

Planned variables:

```text
VITE_APP_NAME
VITE_API_BASE_URL
VITE_OIDC_AUTHORITY
VITE_OIDC_CLIENT_ID
VITE_OIDC_REDIRECT_URI
VITE_OIDC_POST_LOGOUT_REDIRECT_URI
VITE_OIDC_SCOPE
```

Do not put secrets in any `VITE_*` variable because Vite exposes them to browser code.

## 8. Error model

Normalize transport errors into a frontend-safe structure:

```text
status
code
message
fieldErrors
correlationId
```

Preserve backend business error codes when available.

Do not display raw stack traces or internal server messages.

## 9. Server state

TanStack Vue Query owns:

- Query cache
- Mutation state
- Pagination
- Retry
- Refetching
- Invalidation

Pinia must not duplicate these responses.

## 10. Contract audit checklist

Before generating clients:

1. Identify OpenAPI endpoints.
2. Confirm Gateway aggregation availability.
3. Review tags.
4. Review operation IDs.
5. Review duplicate schemas.
6. Review pagination formats.
7. Review enum values.
8. Review date/time formats.
9. Review authentication schemes.
10. Review error schemas.
11. Report unstable or missing contracts.
12. Wait for approval.
