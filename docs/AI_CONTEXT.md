# AI Context

## Project summary

`cinematic-web` is the Vue frontend for a microservice-based Cinema Booking System.

The frontend is being rebuilt in a new repository and must match the supplied Figma design.

## Repositories

Frontend:

https://github.com/HuyKunNe/cinematic-web

Backend:

https://github.com/HuyKunNe/cinema-system

Figma:

https://www.figma.com/design/u8UwhKxDdk5qvK4WezjJnQ/Cinema-Web-UI-Cinematic-Dark?node-id=3-2

## Mandatory reading order

1. `AGENTS.md`
2. `docs/CURRENT_STATUS.md`
3. `docs/ROADMAP.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DESIGN_SYSTEM.md`
6. `docs/API_INTEGRATION.md`
7. `README.md`
8. Current code
9. Current Git status
10. Relevant backend code
11. Exact Figma node

## Non-negotiable constraints

- Repository is read-only for AI assistants.
- User applies all changes manually.
- No commit or push.
- No backend changes.
- No unapproved dependency.
- No hardcoded design values.
- Figma is the visual source of truth.
- Backend/OpenAPI is the API source of truth.
- Generated API code must not be edited manually.
- No frontend client secret.
- No username/password submission from Vue.
- No test, lint, type-check or build unless requested.

## Target stack

```text
Vue 3
TypeScript
Vite
Vue Router
Pinia
TanStack Vue Query
Axios
Orval
oidc-client-ts
Tailwind CSS
Reka UI
VueUse
VeeValidate
Zod
Vitest
Vue Test Utils
MSW
```

## Target architecture

```text
app → modules → shared
```

## Design policy

Every Figma-derived value must be represented by an appropriate token.

This includes:

- Colors
- Width
- Height
- Spacing
- Typography
- Radius
- Shadow
- Icon size
- Component dimensions

Use primitive, semantic and component token layers.

## State policy

- TanStack Vue Query owns server state.
- Pinia owns application/client state.
- Components own short-lived presentation state.

## API policy

- Inspect backend contracts.
- Generate clients with Orval.
- Centralize Axios configuration.
- Keep generated files isolated.
- Add adapters or mappers outside generated code.

## Current objective

Complete the project foundation before implementing application features.

Next planned task:

```text
F0.1 — Repository and Figma audit
```
