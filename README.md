# Cinematic Web

Frontend application for the Cinema Booking System.

## Links

- Frontend repository: https://github.com/HuyKunNe/cinematic-web
- Backend repository: https://github.com/HuyKunNe/cinema-system
- Figma: https://www.figma.com/design/u8UwhKxDdk5qvK4WezjJnQ/Cinema-Web-UI-Cinematic-Dark?node-id=3-2

## Status

The frontend is being rebuilt from a new repository.

Current phase:

```text
F0 — Project foundation and documentation
```

See [CURRENT_STATUS.md](docs/CURRENT_STATUS.md) for the latest verified status.

## Technology

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- TanStack Vue Query
- Axios
- Orval
- oidc-client-ts
- Tailwind CSS
- Reka UI
- VueUse
- VeeValidate
- Zod
- Vitest
- Vue Test Utils
- MSW

Exact versions must be read from `package.json` and the lock file after project initialization.

## Architecture

The application follows this dependency direction:

```text
app → modules → shared
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Design

Figma is the source of truth for:

- Layout
- Dimensions
- Responsive behavior
- Typography
- Colors
- Spacing
- Assets
- Component states

Design values must be represented by CSS variables instead of hardcoded classes.

See [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).

## API generation

API clients are generated from backend OpenAPI contracts using Orval.

Generated code must not be edited manually.

See [API_INTEGRATION.md](docs/API_INTEGRATION.md).

## Authentication

The frontend uses OAuth 2.0 / OpenID Connect Authorization Code with PKCE.

The frontend must not contain a client secret or submit user credentials directly.

## Planned commands

The following commands become available after project initialization:

```bash
npm install
npm run dev
npm run api:generate
npm run api:watch
npm run test:unit
npm run type-check
npm run lint
npm run build
```

Do not assume every command exists until it is added to `package.json`.

## Documentation

- [AI context](docs/AI_CONTEXT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [API integration](docs/API_INTEGRATION.md)
- [Current status](docs/CURRENT_STATUS.md)
- [Roadmap](docs/ROADMAP.md)
- [Agent instructions](AGENTS.md)

## Contribution workflow

1. Read `AGENTS.md`.
2. Read `docs/CURRENT_STATUS.md`.
3. Select one roadmap item.
4. Audit Figma and existing code.
5. Propose the affected files.
6. Obtain approval.
7. Implement one scoped item.
8. Verify manually or run requested checks.
9. Update project documentation.
10. Commit only after user review.
