# Current Status

## Last updated

2026-09-28

## Repositories

- Frontend: `https://github.com/HuyKunNe/cinematic-web`
- Backend, read-only: `https://github.com/HuyKunNe/cinema-system`

## Current phase

```text
F0 — Discovery and architecture review
```

## Verified frontend state

- Frontend repository is a new Vue/Vite scaffold.
- Current `src/App.vue` still contains the starter page.
- Current router has no application routes.
- Pinia is registered; current counter store is scaffold sample code.
- Existing package manifest includes Vue Query, Axios, Orval, oidc-client-ts,
  Pinia, Vue Router, Tailwind CSS, VueUse, Reka UI, VeeValidate and Zod.
- Existing dependency versions and Vue release channel require review before
  implementation; do not update dependencies without approval.
- Repository instructions say do not commit or push before user approval.
- Repository is read-only for this workflow; proposed document changes are
  supplied for manual review/application.

## Discovery findings

- Backend API routes and DTOs were inventoried from controllers, request and
  response records, enums, security configuration, gateway routing and common
  response/error classes.
- API Gateway local base URL is `http://localhost:8080`.
- User Service owns OAuth2/OIDC; frontend authentication uses Authorization
  Code with PKCE. OIDC issuer/client/redirect settings must be confirmed for
  the target environment.
- Gateway CORS allows local `http://localhost:*` by default and defines allowed
  request/response headers in backend configuration.
- Backend has dynamic springdoc/Swagger configuration, but no committed static
  OpenAPI JSON/YAML snapshots were found.
- Booking create returns `202 Accepted` and is asynchronous.
- Backend does not currently expose confirmed contracts for promotions,
  membership/points, movie ratings or featured hero ordering.
- Permission mismatch exists for `inventory:write`, `payment:refund`,
  `payment:audit` and `payment:reconcile`; confirm backend grants before
  implementing those operations.
- R28 Notification Service is deferred and outside current scope.

## Architecture proposal

Proposed feature-based organization:

```text
src/
├── app/
├── assets/
├── components/
├── composables/
├── config/
├── features/
├── layouts/
├── router/
├── services/
├── stores/
├── styles/
├── types/
└── utils/
```

- Generated API clients: `src/services/api/generated/`
- DTO-to-UI mappers and feature models: `src/features/<feature>/mappers/` and
  `src/features/<feature>/models/`
- Vue Query keys/composables: `src/features/<feature>/api/`
- Pinia: cross-route client state only; server state remains in Vue Query.
- Route definitions: owned by feature and composed by `src/router/`.
- Error normalization: `src/services/http/error-normalizer.ts`.
- Environment parsing: `src/config/env.ts`.

See the proposed `docs/ARCHITECTURE.md` for the complete boundaries and
responsibilities.

## Current scope

- Use supplied desktop/mobile images as visual references.
- Do not use Figma unless explicitly requested.
- Do not implement Notification/R28.
- Do not write UI code until the architecture and next milestone are approved.
- Do not commit or push.

## Pending review

- Approve or revise feature folder structure and boundaries.
- Confirm where reviewed OpenAPI snapshots will be sourced from and captured.
- Confirm OIDC issuer, public client ID, redirect URI and frontend origin for
  the target environment.
- Resolve backend permission mismatches before enabling affected admin actions.
- Confirm treatment for homepage hero, promotion and membership sections without
  current backend data contracts.

## Next step

```text
F1 — Application foundation, after architecture review
```

F1 can define tokens/base styles, environment parsing, router/provider setup and
the shared HTTP/error infrastructure. Do not implement feature UI or R28 until
the relevant scope is approved.

## Verification status

No tests, lint, type-check or build have been run for this architecture
proposal.

## F1.3 — Customer navigation shell

Status: READY FOR REVIEW

- Added desktop/tablet `CustomerHeader` and responsive `CustomerMobileHeader`.
- Added accessible mobile menu with `aria-expanded`, Escape-to-close, and focus return.
- Added `MobileBottomNav` to `CustomerLayout` only; `AuthLayout` and `AdminLayout` are unchanged.
- Added CINEMATIC wordmark, primary navigation, search/location triggers, account control, and booking CTA.
- Active navigation state follows the current Vue Router route.
- Header reads authentication state from the Pinia auth store and makes no API calls.
- Added fixed-header and mobile-bottom-navigation content offsets, including safe-area spacing.
- Manual viewport checks at 390px, 768px, 1024px, and 1440px: NOT RUN.
- Automated tests: skipped for UI milestone, per project instruction.
- Repository files were not modified directly; proposed changes are supplied for review.
