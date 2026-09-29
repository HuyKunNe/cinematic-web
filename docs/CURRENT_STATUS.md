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

Status: PROPOSED FOR REVIEW — NOT APPLIED

- Visual source of truth: `docs/design/reference/html-convert/`.
- Desktop navigation follows the reference header hierarchy and 1180px compact behavior.
- Mobile header uses a sticky bar and accessible menu drawer with overlay, Escape handling, focus management, and body scroll restoration.
- Mobile bottom navigation follows the reference items: Home, Lịch chiếu, Vé của tôi, Tài khoản.
- Navigation uses centralized route names and auth state from the existing Pinia store.
- Tokens are reused; existing semantic palette and header/navigation dimensions are aligned to the reference.
- `AuthLayout`, `AdminLayout`, API integration, HomePage sections, and R28 are outside this milestone.
- Automated tests were not run, per project instruction.
- Requested viewport checks for 375×667, 390×844, 768×1024, 1024×768, 1440×900, and 1912×1080: NOT RUN against this proposed implementation.
- Repository remains read-only; proposed changes were supplied as code blocks.

## F1.4 — Admin application shell

Status: PROPOSED FOR REVIEW — NOT APPLIED

- Admin shell dựa trên design tokens hiện có; không được xem là pixel match với customer references.
- Menu chỉ liệt kê Movies, Cinemas, Rooms, Showtimes và Users theo các API admin đã xác nhận trong backend inventory.
- Booking admin bị loại khỏi menu vì backend chỉ có API booking theo người dùng hiện tại.
- Menu lọc theo role và permission từ auth store, dùng route/authorization constants.
- Sidebar hỗ trợ desktop, thu gọn tablet và drawer mobile; header có user menu và logout trigger.
- Logout hiện xóa authorization context phía client và chuyển tới auth placeholder. Cần nối OIDC end-session khi auth feature được triển khai.
- Responsive CSS đã được rà soát ở mức mã nguồn; browser verification tại 375×667, 390×844, 768×1024, 1024×768, 1440×900 và 1912×1080: NOT RUN.
- Automated tests không chạy theo yêu cầu.
- Repository vẫn read-only; thay đổi được cung cấp qua code blocks.

### `docs/CURRENT_STATUS.md` — thêm mục F2.1

```md
## F2.1 — API integration foundation

Status: PROPOSED FOR REVIEW — NOT APPLIED

- API business base URL dùng API Gateway local `http://localhost:8080` làm default
  và có thể override bằng `VITE_API_BASE_URL`.
- Axios client tập trung có auth callbacks, request ID, correlation ID passthrough,
  error normalization và AbortSignal support.
- Refresh phụ thuộc vào OIDC client/session callback; backend cho phép refresh
  token grant nhưng client registration/refresh-token issuance frontend chưa
  được xác nhận.
- OpenAPI được cấu hình động; chưa có snapshots trong repository và runtime
  `/v3/api-docs` chưa được kiểm chứng.
- Orval config và command `npm run api:generate` được đề xuất; chưa thể generate
  tới khi snapshots được kiểm tra và đưa vào `openapi/`.
- Kiểu pagination/error dùng chung và pagination mapper dựa trên backend
  inventory đã xác nhận.
- Feature DTOs/query composables chưa được tạo; sẽ lấy từ generated output khi
  OpenAPI snapshots sẵn sàng.
- `npm run type-check`: NOT RUN — không có local checkout/dependencies trong
  workspace hiện tại.
- `npm run build`: NOT RUN — không có local checkout/dependencies trong
  workspace hiện tại.
- Không có automated tests chạy.
- Repository vẫn read-only; các thay đổi được cung cấp qua code blocks.
```
