# API Client

## Base URL

Frontend gọi API nghiệp vụ qua API Gateway bằng `VITE_API_BASE_URL`.
Giá trị local theo backend inventory là `http://localhost:8080`.
Không cấu hình URL trực tiếp từng microservice trong ứng dụng frontend.

## HTTP client

`src/services/http/axios-instance.ts` là Axios instance duy nhất cho API nghiệp vụ.

- Thêm `Authorization: Bearer ...` khi auth integration cung cấp access token.
- Tạo `X-Request-Id` cho request nếu browser hỗ trợ `crypto.randomUUID()`.
- Giữ `X-Correlation-Id` do booking hoặc flow caller cung cấp.
- Nhận `AbortSignal` qua Axios request config.
- Dùng `apiRequest<T>` làm mutator cho client Orval.
- Không gọi Axios trực tiếp từ page hoặc component.

## Authentication

User Service là OAuth2/OIDC provider. Frontend dùng Authorization Code with PKCE
qua `oidc-client-ts`; không gửi username/password tới business API.

Auth integration đăng ký các callback trong `auth-session.ts`:

- `getAccessToken`
- `refreshAccessToken`
- `onReauthenticationRequired`

Backend cho phép refresh token grant, nhưng client registration và việc cấp
refresh token cho frontend cần được xác nhận. Nếu refresh không thành công,
client phát event `cinematic:authentication-required` để auth flow điều hướng
tới OIDC authorization flow.

## Error handling

`normalizeApiError` chuẩn hóa common REST error envelope:

- HTTP status
- error code, message, category
- field-level details nếu có
- `X-Request-Id` và `X-Correlation-Id` từ response headers
- cờ retryable cho lỗi mạng và HTTP 5xx

OAuth/OIDC protocol errors, provider webhook responses và response HTML không
theo common REST envelope; chúng không được ép qua business API parser.

401 có thể kích hoạt một lần refresh session. Sau refresh, chỉ request GET,
HEAD hoặc OPTIONS mới tự gửi lại. Mutation không tự retry. 403 không kích hoạt
refresh/re-auth.

## Pagination

Booking list dùng `BackendPageResponseDto<T>`:

- `content`
- `page.page`
- `page.size`
- `page.totalElements`
- `page.totalPages`
- `page.first`
- `page.last`

Dùng `mapBackendPage` để chuyển sang UI `PageModel<T>`. Các API trả list trực
tiếp không được bọc giả thành pagination.

## DTO và mapper

Request/response DTO nghiệp vụ thuộc generated output sau khi OpenAPI snapshots
được kiểm chứng. Không tự duy trì DTO trùng lặp với generated code.

Mapper DTO sang UI model thuộc feature sở hữu dữ liệu, ví dụ
`src/features/movies/mappers/`. Mapper pagination dùng chung ở
`src/services/api/page-mapper.ts`.

## Query keys

Feature tạo query key qua `createQueryKeyFactory` trong thư mục API của feature.
Server state thuộc TanStack Vue Query; không sao chép server data vào Pinia.
