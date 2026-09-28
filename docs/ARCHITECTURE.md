# Frontend Architecture

## 1. Purpose

This document defines the target architecture for `cinematic-web`.

The architecture must support:

- Customer-facing cinema flows
- Staff and administrator flows
- OAuth 2.0 / OIDC authentication
- Generated API clients
- Responsive Figma-based UI
- Feature-level maintainability
- Future backend service expansion

## 2. Dependency direction

```text
app → modules → shared
```

Dependencies must flow from higher-level composition toward lower-level reusable infrastructure.

## 3. Target directory structure

```text
src/
├── app/
│   ├── layouts/
│   ├── providers/
│   ├── router/
│   ├── styles/
│   ├── App.vue
│   └── main.ts
├── modules/
│   ├── auth/
│   ├── booking/
│   ├── cinema/
│   ├── home/
│   ├── movie/
│   ├── payment/
│   ├── profile/
│   ├── seat/
│   ├── showtime/
│   └── admin/
├── shared/
│   ├── api/
│   │   ├── generated/
│   │   ├── http/
│   │   └── mappers/
│   ├── assets/
│   ├── composables/
│   ├── config/
│   ├── constants/
│   ├── lib/
│   ├── types/
│   ├── ui/
│   └── utils/
├── styles/
│   ├── tokens/
│   ├── base.css
│   └── main.css
└── vite-env.d.ts

docs/
openapi/
orval.config.ts
```

The final structure must be validated against actual project requirements before creation.

## 4. App layer

The `app` layer owns application composition.

Responsibilities:

- Vue application bootstrap
- Plugin registration
- Router creation
- Root layouts
- Global error boundaries
- Query client provider
- Authentication bootstrap
- Global styles

The app layer may import modules and shared code.

Business logic should not be implemented directly in `App.vue`.

## 5. Modules layer

Each module represents a business capability.

Suggested internal structure:

```text
modules/movie/
├── api/
├── components/
├── composables/
├── mappers/
├── pages/
├── routes/
├── types/
└── index.ts
```

Rules:

- Internal files should not be imported directly by other modules.
- Public exports go through `index.ts`.
- API DTOs should not leak unnecessarily into presentation components.
- Pages compose components and feature composables.
- Components should not call Axios directly.

## 6. Shared layer

The `shared` layer contains reusable code without feature ownership.

Examples:

- HTTP client
- Generated API clients
- Base UI primitives
- Generic composables
- Environment configuration
- Generic types
- Formatting utilities
- Common assets

The shared layer must not import from `modules` or `app`.

## 7. State ownership

### TanStack Vue Query

Use for server state:

- Movies
- Cinemas
- Showtimes
- Seats
- Bookings
- Payments
- User profile
- Admin resources

It owns:

- Fetching
- Caching
- Retry
- Invalidation
- Pagination
- Loading state
- Mutation state

### Pinia

Use for application state:

- Authentication summary
- Current booking flow
- Navigation state
- User interface preferences
- Data that must survive route composition but is not server cache

Do not copy every API response into Pinia.

### Local component state

Use for temporary presentation state:

- Open/closed state
- Hover state
- Selected tab
- Unsaved local input

## 8. API architecture

```text
OpenAPI
   ↓
Orval
   ↓
Generated clients and Vue Query composables
   ↓
Feature API adapter or mapper
   ↓
Feature composable
   ↓
Page or component
```

Generated code is an implementation detail and must not contain manually maintained business logic.

## 9. Authentication architecture

```text
Cinema Web
   ↓ authorization redirect
User Service
   ↓ callback with authorization code
Cinema Web callback route
   ↓ PKCE token exchange
Authenticated frontend session
```

Security rules:

- No client secret in the browser.
- No password submission from Vue.
- Route guards improve navigation UX but are not security boundaries.
- Backend services must enforce authorization.
- Role and permission claims must be validated against backend behavior.

## 10. Routing

Expected layout groups:

- Public/customer layout
- Authentication callback layout
- Account layout
- Admin layout
- Error layout

Route metadata may describe:

- Authentication requirement
- Allowed roles
- Required permissions
- Layout
- Page title

Route metadata does not replace backend authorization.

## 11. Error handling

Error handling must distinguish:

- Network failure
- Timeout
- Authentication failure
- Authorization failure
- Validation error
- Business rule conflict
- Not found
- Server failure

UI components should receive normalized errors rather than raw Axios errors.

## 12. Architectural constraints

- No direct Axios calls in view templates.
- No backend DTO duplication without justification.
- No feature-specific logic in shared UI components.
- No circular module dependencies.
- No hardcoded service URLs.
- No hardcoded design values.
- No client secret.
- No manually edited generated API files.
