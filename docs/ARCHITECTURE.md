# Frontend Architecture

## 1. Mục tiêu

Kiến trúc feature-based cho Cinematic Web, hỗ trợ:

- Customer flows: khám phá phim, chọn rạp/suất, đặt ghế và theo dõi booking.
- Account/OIDC và route được bảo vệ.
- Admin flows theo permission backend.
- API client được sinh từ OpenAPI, không tự duy trì DTO trùng lặp.
- Responsive UI theo ảnh desktop/mobile và design tokens.
- Tách server state, client state, UI components và business feature.

## 2. Cấu trúc thư mục

```text
src/
├── app/
│   ├── App.vue
│   ├── bootstrap/
│   └── providers/
├── assets/
│   ├── icons/
│   ├── images/
│   └── placeholders/
├── components/
│   ├── ui/
│   ├── navigation/
│   └── feedback/
├── composables/
│   └── shared/
├── config/
│   ├── env.ts
│   └── oidc.ts
├── features/
│   ├── auth/
│   ├── home/
│   ├── movies/
│   ├── cinemas/
│   ├── showtimes/
│   ├── booking/
│   ├── payment/
│   ├── account/
│   ├── promotions/
│   └── admin/
├── layouts/
│   ├── CustomerLayout.vue
│   ├── AuthLayout.vue
│   └── AdminLayout.vue
├── router/
│   ├── index.ts
│   ├── guards.ts
│   └── route-meta.ts
├── services/
│   ├── api/
│   │   ├── generated/
│   │   └── index.ts
│   ├── http/
│   │   ├── axios-instance.ts
│   │   └── error-normalizer.ts
│   └── query-client.ts
├── stores/
│   ├── auth.store.ts
│   ├── booking-flow.store.ts
│   └── preferences.store.ts
├── styles/
│   ├── tokens.css
│   ├── base.css
│   └── main.css
├── types/
│   └── shared.ts
└── utils/
    ├── date.ts
    └── format.ts
```

Mỗi feature có cấu trúc nội bộ theo nhu cầu, ví dụ:

```text
features/movies/
├── api/
│   ├── movie-query-keys.ts
│   └── movie-queries.ts
├── components/
├── composables/
├── mappers/
├── models/
├── pages/
├── routes.ts
└── index.ts
```

Không tạo trước các file không cần thiết. Feature chỉ thêm lớp `api/`, `mappers/`, `models/` hoặc `components/` khi có logic tương ứng.

## 3. Ranh giới và chiều phụ thuộc

Chiều phụ thuộc:

```text
app → features → shared infrastructure
```

Shared infrastructure được tổ chức trong `components/`, `composables/`, `config/`, `services/`, `types/`, `utils/`, `assets/` và `styles/`.

Quy tắc:

- `app/` khởi tạo ứng dụng, router, providers và plugin.
- `features/` sở hữu business logic, pages, feature composables, query keys, mapper và UI models.
- Shared infrastructure không import ngược từ `features/`.
- Một feature không import file nội bộ của feature khác.
- Cross-feature use đi qua exports công khai trong `index.ts` hoặc shared abstraction.
- `components/` chỉ chứa component dùng chung. Component có nghiệp vụ riêng nằm trong feature sở hữu nó.
- View không gọi Axios trực tiếp.
- Vue Query composables là lớp truy cập server state cho pages/components.

## 4. API clients, DTO và domain/UI models

### Generated API clients

- Lưu Orval output trong `src/services/api/generated/`, chia theo backend service hoặc OpenAPI document.
- Không sửa generated files thủ công.
- Lưu OpenAPI snapshots đã kiểm tra trong thư mục gốc `openapi/`, kèm source service, backend commit và ngày export.
- Chỉ sinh client khi OpenAPI contract đã được kiểm tra và phê duyệt.
- Backend hiện không có snapshot OpenAPI JSON/YAML được commit; Swagger/OpenAPI được cấu hình động theo service.

### DTO

- Request/response DTO thuộc generated API client.
- Không tạo bản DTO thứ hai trong feature chỉ để đổi tên field.
- Nếu API contract chưa có, ghi rõ feature đang chờ contract; không tự tạo endpoint hoặc DTO.

### Domain/UI models

- Đặt UI/domain model tại feature sở hữu dữ liệu, ví dụ:
  - `features/movies/models/movie.model.ts`
  - `features/booking/models/booking-flow.model.ts`
- UI model chỉ giữ dữ liệu cần cho presentation/business flow.
- Model dùng chung giữa nhiều feature chỉ đưa vào `types/` khi thực sự không thuộc một feature.

### DTO → UI model mapper

- Đặt mapper tại feature sở hữu model, ví dụ:
  - `features/movies/mappers/movie.mapper.ts`
  - `features/showtimes/mappers/showtime.mapper.ts`
- Mapper chuyển UUID/date/enum/nullable fields sang dạng UI cần dùng; không thay đổi ý nghĩa backend contract.
- Không để component presentation phụ thuộc vào DTO generated nếu mapper giúp tách API schema khỏi UI.

## 5. Vue Query và query keys

Vue Query sở hữu mọi server state: movies, cinemas, showtimes, show-seats, bookings, profile và dữ liệu admin.

Query keys đặt trong feature, ví dụ:

```text
features/movies/api/movie-query-keys.ts
features/cinemas/api/cinema-query-keys.ts
features/showtimes/api/showtime-query-keys.ts
features/booking/api/booking-query-keys.ts
features/account/api/account-query-keys.ts
```

Ví dụ cấu trúc key:

```ts
movies: {
  all: ['movies'],
  lists: () => ['movies', 'list'],
  list: (filters) => ['movies', 'list', filters],
  detail: (id) => ['movies', 'detail', id],
}

showtimes: {
  all: ['showtimes'],
  byMovie: (movieId, range) => ['showtimes', 'movie', movieId, range],
  byRoom: (roomId) => ['showtimes', 'room', roomId],
  byRange: (range) => ['showtimes', 'range', range],
}

bookings: {
  all: ['bookings'],
  list: (page, size) => ['bookings', 'list', page, size],
  detail: (id) => ['bookings', 'detail', id],
}
```

Đây là quy ước đề xuất; key cuối cùng phải phản ánh đúng query parameters thật.

- Vue Query composables nằm trong feature, ví dụ `useMoviesQuery`, `useShowtimesByMovieQuery`, `useCreateBookingMutation`.
- Query/mutation dùng generated client qua `services/api`.
- Mutation invalidate các query keys liên quan.
- Booking create trả `202 Accepted`; frontend dùng query detail để cập nhật trạng thái.
- Không chuyển query cache sang Pinia.
- Không giả định search/filter/pagination cho movies vì API hiện chưa khai báo các query này.

## 6. Pinia store responsibilities

Pinia chỉ quản lý client/application state dùng xuyên route:

- `auth.store.ts`: trạng thái đăng nhập tối thiểu phục vụ navigation/guards, role và permission đã xác minh; không lưu bản sao server data hoặc tự thay thế OIDC client.
- `booking-flow.store.ts`: lựa chọn tạm thời xuyên bước booking như cinema, movie, showtime, ghế và client request ID. Xóa/reset khi hoàn tất, hủy hoặc bắt đầu flow mới.
- `preferences.store.ts`: lựa chọn giao diện dùng xuyên trang, ví dụ thành phố/rạp ưu tiên nếu trải nghiệm cần giữ lại.

Local component state dùng cho dialog open state, tab đang chọn, hover và input chưa submit.

Không tự tạo cơ chế lưu access/refresh token thay thế `oidc-client-ts`. Không lưu toàn bộ movies/showtimes/bookings vào Pinia.

## 7. Shared components và feature components

### Shared components

Đặt trong `src/components/`:

- `ui/`: `AppButton`, `AppIcon`, `AppLink`, `AppBadge`, `AppSelect`, `AppSkeleton`, dialog/drawer và form primitives.
- `navigation/`: `CustomerHeader`, `CustomerMobileHeader`, `MobileBottomNav`, `AdminSidebar`, `AdminHeader`, `Breadcrumbs`.
- `feedback/`: trạng thái loading, error, empty và success dùng chung.

Shared component không chứa API call hay nghiệp vụ riêng như booking hoặc movie selection.

### Feature components

Đặt trong feature sở hữu chúng:

- `home/`: `HeroBanner`, `QuickBooking`, home section composition.
- `movies/`: `MovieCard`, `MovieCarousel`, `UpcomingMovieCard`.
- `promotions/`: `PromotionBanner` khi backend có contract hoặc nội dung được duyệt.
- `account/`: account-specific member presentation nếu có API hỗ trợ.
- `admin/`: các component chỉ dùng trong admin pages.

Nếu một feature cần dùng component của feature khác, import từ `index.ts` của feature đó.

## 8. Route ownership và layouts

- `router/index.ts` kết hợp route exports từ từng feature.
- Route definitions thuộc `features/{feature}/routes.ts`.
- Mọi page route lazy-load.
- Customer pages dùng `CustomerLayout`; auth callback/status dùng `AuthLayout`; admin pages dùng `AdminLayout`.
- Admin route metadata có thể khai báo authentication, role, permission và page title.
- Guards hỗ trợ điều hướng; backend authorization vẫn là nguồn quyết định cuối cùng.

| Feature      | Route ownership                                                               |
| ------------ | ----------------------------------------------------------------------------- |
| `home`       | Trang chủ                                                                     |
| `movies`     | Danh sách phim và chi tiết phim                                               |
| `cinemas`    | Danh sách/chi tiết rạp                                                        |
| `showtimes`  | Lịch chiếu và chọn suất                                                       |
| `booking`    | Chọn ghế, booking detail/history                                              |
| `payment`    | Trạng thái payment được backend expose; không tự tạo payment initiation route |
| `account`    | Profile, account và booking history nếu được route ở đây                      |
| `promotions` | Chỉ đăng ký route khi API/nội dung được xác nhận                              |
| `auth`       | OIDC callback, logout/callback status                                         |
| `admin`      | Dashboard và route quản trị theo quyền backend                                |

## 9. Error normalization

- Axios instance và error normalizer đặt trong `src/services/http/`.
- Chuẩn hóa `ApiResponse.error`, direct HTTP error, network/timeout, 401/403 và OAuth2/OIDC errors thành model frontend-safe.
- Giữ `status`, `code`, `message`, `category`, `fieldErrors`, `requestId`, `correlationId`.
- Không hiển thị stack trace hoặc raw internal exception.
- Không giả định mọi successful response dùng `ApiResponse`; Booking bọc response, nhiều endpoint khác trả DTO/list trực tiếp, một số trả `204`.
- OIDC protocol errors và provider webhook response có format riêng.
- Trang/component hiển thị loading, error, empty và success states theo feature.

## 10. Environment configuration

Đọc/validate environment một lần qua `src/config/env.ts`.

Biến dự kiến:

```text
VITE_API_BASE_URL
VITE_OIDC_AUTHORITY
VITE_OIDC_CLIENT_ID
VITE_OIDC_REDIRECT_URI
VITE_OIDC_POST_LOGOUT_REDIRECT_URI
VITE_OIDC_SCOPE
```

- `VITE_API_BASE_URL` trỏ tới gateway; local default dự kiến `http://localhost:8080`.
- OIDC authority trỏ tới issuer User Service đã xác nhận theo môi trường; không mặc định production URL.
- Không đưa client secret hoặc bất kỳ secret nào vào `VITE_*`.
- Có thể cung cấp `.env.example` với placeholder không nhạy cảm.
- `.env.local` không commit.
- Không hardcode service URL trong feature/API client.

## 11. Backend constraints cần lưu ý

- API Gateway là base URL nghiệp vụ; OIDC protocol routes hiện không được gateway route.
- Booking create là bất đồng bộ và trả `202`; backend giới hạn tối đa 10 ghế/request, request có `clientRequestId`.
- `GET /movies` chưa khai báo search/filter/pagination.
- Backend chưa có API contract xác nhận cho promotion, membership/points, rating hoặc featured hero ordering.
- Security config yêu cầu `inventory:write`, `payment:refund`, `payment:audit`, `payment:reconcile`, nhưng các permission này chưa có trong permission enum/seed đã kiểm tra.
- Không scaffold Notification/R28.

## 12. Responsive UI

- CSS variables/design tokens nằm trong `src/styles/tokens.css`.
- Breakpoints khai báo tập trung trong cấu hình Tailwind/responsive.
- Hỗ trợ kiểm tra tại 390px, 768px, 1024px và 1440px.
- Mobile dùng layout riêng: header gọn, quick booking dọc, movie carousel ngang, bottom nav fixed và safe-area spacing.
- Không nhúng ảnh screenshot reference làm giao diện; poster/banner lấy từ API hoặc placeholder asset riêng.
