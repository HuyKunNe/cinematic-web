# Authentication and Authorization

## Nguồn xác thực

User Service là OAuth2 Authorization Server và OpenID Connect provider. Frontend dùng Authorization Code with PKCE qua `oidc-client-ts`.

Backend không cung cấp API đăng nhập JSON/password cho Vue. `/login` là trang đăng nhập HTML do User Service phục vụ trong quá trình authorization redirect.

Không gửi username/password từ frontend tới API business. Không lưu client secret trong Vue hoặc biến `VITE_*`.

## OIDC flow

1. Frontend khởi tạo OIDC Authorization Code flow với PKCE.
2. Browser được redirect tới authorization endpoint của User Service.
3. Nếu chưa có session, User Service hiển thị trang `/login`.
4. Sau xác thực, Authorization Server redirect về URI đã đăng ký với authorization code.
5. OIDC client đổi code lấy token theo PKCE.
6. Frontend gửi access token dưới dạng `Authorization: Bearer <token>` tới API Gateway.
7. Logout sử dụng cơ chế OIDC RP-Initiated Logout được User Service cấu hình.

Grant types được Authorization Server cho phép: `authorization_code`, `refresh_token`, `client_credentials`. Frontend customer flow dùng Authorization Code with PKCE; không dùng client credentials trong browser.

Backend tài liệu hóa access token JWT RS256, issuer và audience validation. Resource servers kiểm tra issuer, chữ ký, thời hạn và audience `cinema-api`.

## Endpoint và URL

- Local User Service port mặc định: `8082`.
- OpenAPI properties mặc định khai báo authorization URL `http://localhost:8082/oauth2/authorize` và token URL `http://localhost:8082/oauth2/token`.
- Authorization Server issuer thực tế được cấu hình qua `AuthorizationServerProperties`; giá trị theo môi trường chưa xác nhận.
- Frontend phải lấy issuer/client ID/redirect URI từ cấu hình môi trường đã được backend xác nhận.
- Gateway chỉ route `/api/v1/users/**` tới User Service; cấu hình hiện tại không route `/oauth2/**`, `/login`, hoặc OIDC discovery/JWK endpoints qua Gateway.
- Authorization Server sử dụng các endpoint mặc định của Spring Authorization Server và bật OIDC; cần đối chiếu metadata discovery/runtime theo issuer môi trường trước khi chốt cấu hình client.

Không hardcode production issuer, client ID hoặc redirect URI dựa trên giá trị local.

## API base URL

API nghiệp vụ nên dùng API Gateway:

```text
VITE_API_BASE_URL=http://localhost:8080
```

Giá trị này là ví dụ local theo cấu hình gateway. Production base URL chưa được xác nhận.

OIDC authority là cấu hình riêng, không mặc định bằng API Gateway:

```text
VITE_OIDC_AUTHORITY=<issuer được backend xác nhận>
VITE_OIDC_CLIENT_ID=<public client ID được backend xác nhận>
VITE_OIDC_REDIRECT_URI=<URI đã đăng ký>
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=<URI đã đăng ký>
VITE_OIDC_SCOPE=<scope đã được cấp cho client>
```

Không đưa secret vào các biến `VITE_*`.

## Token claims và quyền

Backend JWT converter đọc claims:

- `roles`
- `permissions`

Role được chuyển thành authority có prefix `ROLE_`; permission được dùng trực tiếp. Claims cần lấy từ token/session đã xác thực; không tự tạo quyền từ tên route.

Roles trong backend: `USER`, `STAFF`, `ADMIN`, `SERVICE`.

Permissions được seed trong migration hiện tại:

- `booking:create`
- `booking:read`
- `booking:cancel`
- `movie:manage`
- `showtime:manage`
- `inventory:manage`
- `payment:read`
- `notification:manage`
- `user:manage`

Seed migration gán:

- `USER`: booking create/read/cancel.
- `STAFF`: booking read/cancel, movie manage, showtime manage, inventory manage, payment read, notification manage.
- `ADMIN`: toàn bộ permissions được seed.
- `SERVICE`: role service; không được suy ra đây là role đăng nhập UI.

Một số security rules yêu cầu permission không có trong enum/seed hiện tại: `inventory:write`, `payment:refund`, `payment:audit`, `payment:reconcile`. Phải xác nhận backend cấp các permission này trước khi xem các trang/thao tác đó là khả dụng.

## Phân loại quyền theo endpoint

### Public

GET catalog/inventory được cho phép không token:

- Movies, genres.
- Cinemas, rooms, physical seats.
- Showtimes và show-seats.

Public read không áp dụng cho mutation tương ứng.

### Authenticated customer

- `/api/v1/bookings/**`: cần authenticated bearer token. Controller truyền `CurrentUser.id()` vào service; không nhận user ID từ request body.
- `/api/v1/users/me/**`: cần authenticated session/token theo User Service security chain.

Booking security config yêu cầu authenticated tại URL pattern; `booking:create/read/cancel` có trong authority seed, nhưng không nên khẳng định từng route bắt buộc authority cụ thể nếu controller/security config không khai báo matcher riêng.

### Admin/protected

- Movie/genre mutation: `movie:manage`.
- Showtime create/update/state transitions: `showtime:manage`.
- Cinema/room/seat mutation; show-seat generation và available/unavailable: `inventory:manage`.
- Show-seat hold/book/release: `inventory:write` (permission chưa có trong seed hiện tại).
- User lock/unlock/disable/enable: `user:manage`.
- Payment refund/audit/reconciliation: lần lượt `payment:refund`, `payment:audit`, `payment:reconcile` (chưa có trong seed hiện tại).

Frontend route guard chỉ điều khiển trải nghiệm và điều hướng. API backend là ranh giới bảo mật.

## CORS

Gateway local config:

- Origin pattern mặc định: `http://localhost:*`; có thể thay bằng `CORS_ALLOWED_ORIGIN_PATTERN`.
- Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
- Allowed headers: `Authorization`, `Content-Type`, `Accept`, `Origin`, `X-Requested-With`, `X-Request-Id`, `X-Correlation-Id`.
- Exposed headers: `X-Request-Id`, `X-Correlation-Id`.
- `allow-credentials: true`.
- Preflight max age: 3600 giây.

User Service bật CORS trên Authorization Server/application security chains. CORS production và redirect origins phải được backend cấu hình đúng; không mở rộng origin từ frontend.

## Integration notes

- Dùng một Axios instance cho API nghiệp vụ qua Gateway.
- Gắn access token qua interceptor theo trạng thái OIDC.
- Không retry mù các mutation như tạo booking.
- Booking dùng `clientRequestId` để idempotency; giữ cùng ID khi retry cùng một request.
- Token hết hạn/refresh lỗi cần đưa người dùng qua OIDC flow phù hợp.
- 401 là chưa xác thực/không còn phiên hợp lệ; 403 là đã xác thực nhưng không đủ quyền.
