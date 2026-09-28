# AGENTS.md

## 1. Project

`cinematic-web` is the Vue frontend for the Cinema Booking System.

Repository:

- Frontend: https://github.com/HuyKunNe/cinematic-web
- Backend: https://github.com/HuyKunNe/cinema-system
- Figma: https://www.figma.com/design/u8UwhKxDdk5qvK4WezjJnQ/Cinema-Web-UI-Cinematic-Dark?node-id=3-2

## 2. Scope

These instructions apply to the entire frontend repository.

If another `AGENTS.md` exists in a nested directory, the nearest file takes precedence for that directory.

## 3. Repository permissions

Treat this repository as read-only unless the user explicitly changes the permission for the current task.

Default behavior:

- Do not create files directly.
- Do not edit files directly.
- Do not delete or rename files.
- Do not create branches.
- Do not commit.
- Do not push.
- Do not modify the backend repository.
- Provide all proposed changes through complete code or Markdown blocks.
- The user applies and commits changes manually.

Before proposing a change:

1. State the objective.
2. List files to create or modify.
3. Explain the architectural impact.
4. Provide complete file contents or clearly identifiable replacement blocks.
5. Provide a manual verification checklist.
6. Stop and wait for user confirmation.

## 4. Source of truth

For API contracts, use this order:

1. Current backend controller, DTO, validation, enum and security configuration.
2. Runtime OpenAPI specification served by the backend, after checking the source service and environment.
3. Reviewed OpenAPI snapshots in the frontend repository.
4. Frontend API inventory documentation.
5. Other backend and frontend documentation.

For visual implementation, use this order:

1. Current user-provided desktop and mobile reference images.
2. `docs/design/reference/cinematic-home-desktop.png` and `docs/design/reference/cinematic-home-mobile.png`, when present.
3. Approved frontend design analysis and design tokens.
4. Current frontend implementation.

Do not use Figma unless the user explicitly requests it. Do not let unavailable
Figma access block work when the user has supplied reference images.

If source code conflicts with documentation, report the discrepancy and prefer the source code for API contracts. Do not invent endpoints, response fields,permission grants or product data.

## 5. Required technology

Use the existing versions found in `package.json` and the lock file.

Expected stack:

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

Do not add a dependency without:

1. Explaining its purpose.
2. Checking whether an existing dependency already solves the problem.
3. Explaining bundle and maintenance impact.
4. Receiving user approval.

## 6. Architecture

The frontend follows this dependency direction:

```text
app → features → shared infrastructure
```

Shared infrastructure is organized under `components/`, `composables/`, `config/`, `services/`, `types/`, `utils/`, `assets/`, and `styles/`.

Rules:

- `app` owns bootstrap, application providers and plugin registration.
- `features` owns business capabilities, feature pages, API composables, query keys, mappers and domain/UI models.
- Shared infrastructure must not import from `features`.
- A feature must not import another feature's internal files.
- Cross-feature use goes through the owning feature's public `index.ts` exports or a shared abstraction.
- Shared components must not contain feature-specific business logic.
- Pages compose feature components and composables; they should not call Axios.
- TanStack Vue Query owns server state. Pinia owns only cross-route client state.

## 7. Image-reference-first implementation

Before implementing a screen or component:

1. Read the approved design analysis, design tokens and responsive behavior.
2. Inspect the provided desktop/mobile reference images or repository copies.
3. Identify visible structure, hierarchy, spacing, colors, responsive changes and interaction states.
4. Check API contracts before binding product data.
5. Implement the UI using Vue components and CSS; never use a full screenshot as the page background or as a fake UI.
6. Report assumptions for states or details not visible in the references.

Do not call Figma unless the user explicitly requests it.

Use backend data for product content. If an API does not provide an image, use a project-owned placeholder asset. Do not invent product data to fill a visual
section.

## 8. Design tokens

Do not hardcode design values in Vue templates, inline styles or arbitrary Tailwind classes.

Forbidden examples:

```text
bg-[#b91c35]
text-[#f5f2ed]
w-[280px]
h-[420px]
max-w-[1280px]
rounded-[14px]
gap-[18px]
text-[15px]
```

Use CSS variables and semantic classes instead.

All Figma-derived values must use variables, including:

- Colors
- Width
- Height
- Min/max dimensions
- Spacing
- Padding
- Margin
- Gap
- Typography
- Radius
- Border
- Shadow
- Icon size
- Opacity
- Transition duration
- Z-index

Token levels:

1. Primitive tokens
2. Semantic tokens
3. Component tokens

Breakpoints must be defined centrally in Tailwind or responsive configuration because CSS variables cannot reliably be used in media query conditions.

## 9. UI libraries

Use Reka UI for behavior-heavy accessible primitives such as:

- Dialog
- Drawer
- Dropdown menu
- Popover
- Select
- Tabs
- Tooltip

Reka UI controls behavior and accessibility only. Styling must follow Figma.

Do not introduce Vuetify, PrimeVue, Element Plus or another complete design system without explicit approval.

Use Lucide icons only when the icon matches Figma. If Figma supplies a specific SVG, use the exact asset.

## 10. API integration

Use Orval to generate API clients from OpenAPI.

Rules:

- Generated files must live under `src/services/api/generated`.
- Never edit generated files manually.
- Use a centralized Axios instance.
- API base URLs come from Vite environment variables.
- Authentication tokens are attached through the shared HTTP infrastructure.
- Do not duplicate backend DTOs manually without a documented reason.
- Use mappers when transport DTOs differ from frontend domain models.
- TanStack Vue Query owns server state.
- Pinia owns application and client state.
- Feature-specific query keys, Vue Query composables, DTO-to-UI mappers and domain/UI models live under the owning `src/features/<feature>/` directory.
- Generated DTOs remain in the generated API output and are never edited by hand.
- Store reviewed OpenAPI snapshots under the repository-level `openapi/` directory with source service and backend commit metadata.
- Do not generate or scaffold R28 Notification clients while R28 is deferred.
  Read the backend repository before defining an API contract.

## 11. Authentication

Use Authorization Code with PKCE.

Never:

- Add a client secret to the frontend.
- Store a client secret in an environment file.
- Submit a username and password directly from Vue.
- Treat a frontend route guard as backend authorization.
- Invent an authentication endpoint.

The login action must redirect to the User Service authorization endpoint.

## 12. Verification

Do not run the following unless the user explicitly requests it:

- Tests
- Lint
- Type checking
- Build
- Automatic formatting across the repository

Never claim verification passed when it was not run.

Manual verification steps may still be proposed.

## 13. Response format

For implementation guidance, respond in this order:

1. Objective
2. Files affected
3. Implementation
4. Explanation
5. Manual verification
6. Risks or remaining work
7. Stop and wait for confirmation

Use one clearly labelled code block per file.

Do not provide broken or nested Markdown fences.
