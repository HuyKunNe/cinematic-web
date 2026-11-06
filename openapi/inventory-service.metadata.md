# Inventory Service OpenAPI snapshot

- Service: inventory-service
- Source URL: http://localhost:8083/v3/api-docs
- Backend source revision reviewed: ac0915521d5562d4836ab1d95a5a3883a835148a
- Backend source working tree: dirty; read-only inspection
- Runtime build revision: unknown; /actuator/info returned {}
- Exported at: 2026-11-06T10:01:38.1128229+07:00
- OpenAPI version: 3.1.0
- Snapshot SHA-256: EA6A4D775443F06D1F01BAFF1A051252BB850D2F1C543987E2DF972BBD44DED6

## Scope

Exported from the locally running Inventory Service during A0.2.

Reviewed ShowtimeScreeningVersionResponse against the source DTO/enums:
projectionTechnology is STANDARD/IMAX/FOUR_DX/SCREEN_X, separate from 2D/3D contentFormat.
The runtime schema has no required list, so generated properties remain optional.

Reviewed matrix dimensions/indexed seats and create/replace request boundaries against
CreateRoomLayoutRequest, ReplaceRoomLayoutContentRequest and matrix DTOs.
The existing script regenerated all five services; Inventory operation IDs matched 66
generated functions, with no generated content diff. No Notification paths were present.

The previous snapshot's sale-scopes/preview operations are absent in current runtime
and source controllers. They are not preserved as invented endpoints in this export.

## Limitations

The source revision above identifies inspected source, not runtime build provenance.
No operator declaration of the runtime commit was obtained in this round.

This scoped review does not certify full pricing-policy coverage, publication or
matrix persistence round trips. No business mutations, browser checks, tests, lint,
type checking or build were run. See `docs/api/OPENAPI_GENERATION.md`.
