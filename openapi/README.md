# OpenAPI Contracts

This directory stores stable OpenAPI snapshots used to generate frontend API clients.

## Rules

- Backend code is the source of truth.
- Do not manually invent or modify schemas to hide backend contract problems.
- Record the source service and backend commit for every snapshot.
- Review contract changes before regenerating clients.
- Do not manually edit generated frontend files.
- Do not include secrets or private environment information.

## Planned files

```text
gateway.json
user-service.json
movie-service.json
showtime-service.json
booking-service.json
payment-service.json
```

Only add specifications that are actually exposed by the backend.

## Generation flow

```text
Backend OpenAPI
    ↓
OpenAPI snapshot
    ↓
Orval
    ↓
src/shared/api/generated
    ↓
Feature adapters and composables
```

## Snapshot metadata

When adding a specification, document:

- Service name
- Source URL
- Backend commit
- Export date
- OpenAPI version
- Known contract issues
