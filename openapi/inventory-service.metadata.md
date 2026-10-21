# Inventory Service OpenAPI snapshot

- Service: inventory-service
- Source URL: http://localhost:8083/v3/api-docs
- Backend source revision reviewed: 22dfdc130bec4939ed6613ab01ed1b37f0e616da
- Runtime revision declared by operator: 22dfdc130bec4939ed6613ab01ed1b37f0e616da
- Exported at (UTC): 2026-10-21T08:02:43.2951354+00:00
- OpenAPI version: 3.1.0

## Scope

Exported from the locally running Inventory Service.

Checked operation IDs:
- getCinemaPricingSaleScopes
- replaceCinemaPricingSaleScopes
- getCinemaPricingPolicyFareMatrix
- previewDraftCinemaFareMatrix

Checked contract markers:
- PreviewDraftFareMatrixRequest contains simulatedReleaseDate.
- PreviewDraftFareMatrixRequest does not contain simulatedFirstShowing.
- The specification contains NOT_FOR_SALE.

## Limitations

The export script checks contract markers, not runtime build provenance.
The operator must ensure the running service uses the declared revision.

Draft simulation is not operational showtime pricing preview.
It does not produce a booking quote or authorize publication.
Sale scopes do not certify full-policy coverage.
No tests, lint, type checking or build were run by this export.