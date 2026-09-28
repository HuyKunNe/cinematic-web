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

Use information in this order:

1. Current frontend code.
2. Current frontend Git commit.
3. The exact Figma frame or component.
4. Backend source code and OpenAPI contracts.
5. `docs/CURRENT_STATUS.md`.
6. `docs/ARCHITECTURE.md`.
7. `docs/DESIGN_SYSTEM.md`.
8. `docs/API_INTEGRATION.md`.
9. `docs/ROADMAP.md`.
10. `README.md`.
11. Previous conversation history.

If documentation conflicts with code:

- Prefer the current code.
- Report the conflict.
- Do not silently update documentation.

For visual implementation:

- Figma is the source of truth.
- Existing UI is not the source of truth when it differs from Figma.

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

Required dependency direction:

```text
app → modules → shared
```

Rules:

- `app` contains application bootstrap, router, layouts and providers.
- `modules` contains business features.
- `shared` contains reusable infrastructure and UI primitives.
- `shared` must not import from `modules`.
- A module must not import another module's internal implementation.
- Cross-module communication must use public exports, routes or shared abstractions.
- Pages should compose feature components instead of containing all business logic.

## 7. Figma-first implementation

Before implementing a page or component:

1. Read the exact Figma node.
2. Request or retrieve a screenshot of that node.
3. Inspect visible child nodes when the first response is incomplete.
4. Identify dimensions, spacing, typography, assets and states.
5. Compare the design with the current code.
6. Report mismatches.
7. Wait for approval.

If Figma cannot be accessed:

- Stop.
- Ask for the exact node link or screenshot.
- Do not infer the final layout.

Never use a screenshot as an implementation asset.

Every visible Figma asset must be accounted for.

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

- Generated files must live under `src/shared/api/generated`.
- Never edit generated files manually.
- Use a centralized Axios instance.
- API base URLs come from Vite environment variables.
- Authentication tokens are attached through the shared HTTP infrastructure.
- Do not duplicate backend DTOs manually without a documented reason.
- Use mappers when transport DTOs differ from frontend domain models.
- TanStack Vue Query owns server state.
- Pinia owns application and client state.

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
