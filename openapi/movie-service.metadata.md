# Movie Service OpenAPI snapshot

- Service: movie-service
- Source URL: http://localhost:8081/v3/api-docs
- Backend source revision reviewed: ac0915521d5562d4836ab1d95a5a3883a835148a
- Backend source working tree: dirty; read-only inspection
- Runtime build revision: unknown; /actuator/info returned {}
- Exported at: 2026-11-06T10:01:37.5814391+07:00
- OpenAPI version: 3.0.1
- Snapshot SHA-256: 205EB26641DCD3A780FB87DF5F05251D04E2E1DE72701E932C92D1BAF0E3AD7E

## Reviewed change

A0.2: exported the specification served by the configured local Movie Service.
Reviewed CreateMovieRequest/UpdateMovieRequest.screeningVersions against source DTOs,
plus create/save/response screening-version fields, defaults and enums.
ProjectionTechnology is STANDARD/IMAX/FOUR_DX/SCREEN_X; ContentFormat is 2D/3D.
Save items retain id/expectedVersion for existing definitions and require active.
Generated response/item null unions are retained as served; not manually strengthened.

The existing `npm run api` regenerated all five configured services successfully using
Orval 8.38.0, with no generated content diff. Movie operation IDs matched 19 generated
functions. See `docs/api/OPENAPI_GENERATION.md` for scope and limitations.

## Remaining work

The source revision above identifies inspected source, not the running binary.
Runtime provenance remains unconfirmed. No business mutation, browser verification,
tests, build, lint or type-check was performed. This is a scoped contract review,
not a full audit of Movie APIs. R28 Notification is excluded.
