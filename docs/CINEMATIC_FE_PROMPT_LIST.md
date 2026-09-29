# Cinematic Web FE — Prompt List

Tài liệu này chứa các prompt dùng để xây dựng lại frontend Cinematic Web từ đầu bằng ChatGPT Work/Codex.

## Cách sử dụng

1. Mở workspace chứa cả hai repository frontend và backend.
2. Đính kèm hoặc đặt hai ảnh thiết kế vào `docs/design/reference/`.
3. Gửi `P00` một lần để thiết lập quy tắc toàn dự án.
4. Thực hiện lần lượt từng milestone từ `F0.1`.
5. Sau mỗi milestone, review thay đổi rồi mới gửi prompt tiếp theo.
6. Chỉ gửi prompt commit sau khi đã kiểm tra code.

Không gửi toàn bộ prompt trong tài liệu cùng lúc.

---

## P00 — Project Operating Instructions

~~~text
Bắt đầu xây dựng lại Cinematic Web Frontend từ đầu.

Repositories:
- Frontend được phép chỉnh sửa:
  https://github.com/HuyKunNe/cinematic-web
- Backend chỉ được phép đọc:
  https://github.com/HuyKunNe/cinema-system

Trạng thái backend:
- Backend đã hoàn thành các API cần thiết.
- R28 đang được hoãn và không thuộc phạm vi hiện tại.
- Không được chỉnh sửa, commit hoặc push backend.
- Phải đọc backend để lấy endpoint, DTO, enum, validation,
  authentication, authorization và error format thực tế.
- Không được tự đoán endpoint, request hoặc response.

Nguồn thiết kế:
- Figma hiện bị giới hạn và không được phép làm chậm tiến độ.
- Hai ảnh Cinematic Home Desktop và Cinematic Home Mobile là nguồn thiết kế chính.
- Nếu có trong repository, đọc:
  - docs/design/reference/cinematic-home-desktop.png
  - docs/design/reference/cinematic-home-mobile.png
- Không cần gọi Figma trong giai đoạn hiện tại.
- Không được dùng toàn bộ ảnh làm background để giả lập giao diện.
- Phải triển khai thành Vue components, semantic HTML và CSS thực tế.

Frontend stack:
- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Tailwind CSS
- Axios
- VueUse
- TanStack Vue Query khi phù hợp cho server state
- Zod hoặc Valibot khi cần validation

Quyền frontend:
- Được phép đọc, tạo và chỉnh sửa file frontend.
- Không được commit hoặc push trước khi tôi approve.
- Sau mỗi milestone phải dừng để tôi review.
- Bỏ qua automated tests trừ khi tôi yêu cầu rõ ràng.
- Có thể chạy typecheck, lint và production build.

Design rules:
- Phong cách cinematic dark theo hai ảnh reference.
- Desktop, tablet và mobile phải có responsive behavior thực tế.
- Không hardcode màu sắc, width, height, spacing, radius, shadow,
  z-index, breakpoint hoặc aspect ratio trong component.
- Không dùng tùy tiện bg-[#...], text-[#...], w-[...], h-[...],
  rounded-[...], shadow-[...] hoặc z-[...].
- Mọi giá trị phải đi qua semantic CSS variables/design tokens.
- Tailwind phải tham chiếu CSS variables.
- Dùng flex/grid thay cho absolute positioning nếu có thể.
- Đảm bảo focus-visible, keyboard navigation và contrast cơ bản.

Architecture rules:
- CustomerLayout, AuthLayout và AdminLayout tách biệt.
- CustomerHeader, MobileBottomNav, AdminSidebar và AdminHeader độc lập.
- Feature-based folder structure.
- Vue component không gọi Axios trực tiếp.
- API client, DTO, mapper và composable/query phải tách lớp.
- Server state không được lưu lặp lại không cần thiết trong Pinia.
- Route public, protected và admin phải khai báo rõ.
- Admin route phải kiểm tra authentication và role/permission.
- Mọi màn hình gọi API phải có loading, empty, error và retry state.

Cách làm việc:
1. Đọc AGENTS.md, README.md, CURRENT_STATUS.md và ARCHITECTURE.md.
2. Đọc cấu trúc frontend hiện tại.
3. Đọc backend và OpenAPI/Swagger nếu có.
4. Đọc hai ảnh thiết kế reference.
5. Không triển khai R28.
6. Không sửa backend.
7. Trước khi sửa code, báo ngắn gọn phạm vi và kế hoạch.
8. Sau khi sửa:
   - liệt kê file tạo/sửa;
   - giải thích quyết định quan trọng;
   - đưa lệnh kiểm tra thủ công;
   - cập nhật CURRENT_STATUS.md;
   - dừng trước khi commit.

Chỉ xác nhận đã hiểu các quy tắc trên. Chưa sửa code.
~~~

---

## F0.1 — Repository Discovery và Backend API Inventory

~~~text
Tiếp tục F0.1 — Repository Discovery và Backend API Inventory.

Backend chỉ được phép đọc.

Thực hiện:
1. Đọc docs và cấu trúc frontend hiện tại.
2. Đọc toàn bộ backend controller liên quan đến frontend.
3. Kiểm tra OpenAPI/Swagger hoặc API specification.
4. Xác định authentication flow và CORS expectations.
5. Lập danh sách API frontend có thể sử dụng.

API inventory phải có:
- Service/base URL.
- HTTP method và URL.
- Public/protected/admin classification.
- Role/permission.
- Path/query parameters.
- Request DTO.
- Response DTO.
- Pagination format.
- Enum và trạng thái.
- Validation rules.
- Error response.
- Ghi chú integration.

R28 phải được đánh dấu DEFERRED và không được scaffold code.

Tạo hoặc cập nhật:
- docs/api/BACKEND_API_INVENTORY.md
- docs/api/AUTHENTICATION.md
- docs/api/ERROR_HANDLING.md
- docs/api/DEFERRED_FEATURES.md

Không triển khai UI hoặc API client trong bước này.
Đảm bảo Markdown fences đóng đúng và không bị lồng sai.
Báo cáo kết quả và dừng để tôi review.
~~~

---

## F0.2 — Image Design Analysis

~~~text
Tiếp tục F0.2 — Phân tích thiết kế từ ảnh reference.

Không sử dụng Figma.

Đọc:
- docs/design/reference/cinematic-home-desktop.png
- docs/design/reference/cinematic-home-mobile.png

Nếu file chưa tồn tại nhưng ảnh được đính kèm trong chat, dùng ảnh đính kèm.
Nếu không thể truy cập cả hai ảnh, dừng và yêu cầu tôi cung cấp lại.

Tạo:
- docs/design/DESIGN_ANALYSIS.md
- docs/design/DESIGN_TOKENS.md
- docs/design/RESPONSIVE_BEHAVIOR.md
- docs/design/COMPONENT_INVENTORY.md

Phân tích các phần:
- Desktop/mobile header.
- Hero banner và overlays.
- Quick booking desktop/mobile.
- MovieCard và movie carousel.
- Now showing và upcoming movies.
- Promotion banners.
- Membership section.
- Footer.
- Mobile bottom navigation.

DESIGN_TOKENS.md phải có:
- Token name.
- CSS variable.
- Giá trị đề xuất.
- Mục đích sử dụng.
- Responsive variation nếu có.

Không viết UI code.
Báo cáo các quyết định và dừng để tôi review.
~~~

---

## F0.3 — Frontend Architecture

~~~text
Tiếp tục F0.3 — Frontend architecture và folder structure.

Dựa trên API inventory và image design analysis, đề xuất kiến trúc feature-based.

Cấu trúc dự kiến:
src/
  app/
  assets/
  components/
  composables/
  config/
  features/
  layouts/
  router/
  services/
  stores/
  styles/
  types/
  utils/

Các feature:
- auth
- home
- movies
- cinemas
- showtimes
- booking
- payment
- account
- promotions
- admin

Chỉ rõ:
- Nơi đặt generated API client.
- Nơi đặt DTO và UI/domain models.
- Mapper DTO -> UI model.
- Query keys và Vue Query composables.
- Pinia store responsibilities.
- Shared components và feature components.
- Route ownership.
- Error normalization.
- Environment configuration.

Cập nhật:
- ARCHITECTURE.md
- AGENTS.md nếu cần
- CURRENT_STATUS.md

Không triển khai feature UI.
Báo cáo và dừng để tôi review.
~~~

---

## F1.1 — Design Foundations

~~~text
Tiếp tục F1.1 — Design foundations.

Triển khai design tokens dựa trên hai ảnh reference và DESIGN_TOKENS.md.

Tạo CSS variables cho:
- Primitive colors.
- Semantic colors.
- Typography.
- Spacing.
- Container widths.
- Header/sidebar/mobile navigation heights.
- Control heights.
- Poster và media aspect ratios.
- Radius.
- Shadow.
- Z-index.
- Motion duration/easing.

Token tối thiểu:
- --color-primary
- --color-primary-hover
- --color-secondary
- --color-background
- --color-surface
- --color-surface-raised
- --color-border
- --color-text-primary
- --color-text-secondary
- --container-width
- --header-height
- --admin-sidebar-width
- --mobile-nav-height
- --control-height-md
- --poster-aspect-ratio
- --radius-sm
- --radius-md
- --radius-lg
- --space-1 đến --space-16
- --shadow-card
- --z-header
- --z-sidebar
- --z-modal

Triển khai foundations:
- AppContainer
- AppButton
- AppLink
- AppBadge
- AppSelect
- AppSkeleton
- AppEmptyState
- AppErrorState

Không triển khai business feature.
Không dùng arbitrary hardcoded values trong Vue templates.
Chạy typecheck và build nếu scripts đã tồn tại.
Cập nhật CURRENT_STATUS.md và dừng trước khi commit.
~~~

---

## F1.2 — Router và Application Layouts

~~~text
Tiếp tục F1.2 — Router và application layouts.

Triển khai:
- Vue Router foundation.
- CustomerLayout.
- AuthLayout.
- AdminLayout.
- PlaceholderPage.
- Lazy-loaded routes.
- Route names/constants tập trung.
- Route metadata cho layout, auth và role.
- Route guards cơ bản.

Customer routes dự kiến:
- /
- /movies
- /movies/:movieId
- /cinemas
- /showtimes
- /promotions
- /booking/:showtimeId
- /account
- /account/bookings

Auth routes chỉ tạo nếu backend hỗ trợ:
- /login
- /register
- /forgot-password
- /auth/callback

Admin routes chỉ tạo cho backend module thực tế:
- /admin
- /admin/movies
- /admin/cinemas
- /admin/rooms
- /admin/showtimes
- /admin/bookings
- /admin/promotions
- /admin/users

Không tạo route thuộc R28.
Không dùng magic role strings rải rác.
Không triển khai nội dung feature hoàn chỉnh.
Báo cáo route table và dừng để tôi review.
~~~

---

## F1.3 — Customer Header và Mobile Navigation

~~~text
Tiếp tục F1.3 — Customer navigation shell.

Triển khai theo hai ảnh reference:
- CustomerHeader desktop/tablet.
- CustomerMobileHeader.
- MobileBottomNav.
- CINEMATIC wordmark.
- Navigation: Lịch chiếu, Phim, Rạp, Ưu đãi.
- Search trigger.
- Cinema/location selector.
- Login/account control.
- Đặt vé CTA.
- Active route state.
- Accessible mobile menu.

Yêu cầu:
- Header chỉ xử lý presentation và navigation.
- Auth state lấy từ store/composable.
- Không gọi API trực tiếp trong header.
- MobileBottomNav không xuất hiện trong AdminLayout hoặc AuthLayout.
- Nội dung không bị fixed header/bottom nav che.
- Dùng design tokens cho toàn bộ kích thước và màu sắc.

Kiểm tra thủ công tại 390px, 768px, 1024px và 1440px.
Cập nhật CURRENT_STATUS.md và dừng để tôi review.
~~~

---

## F1.4 — Admin Shell

~~~text
Tiếp tục F1.4 — Admin application shell.

Reference không có admin screen. Hãy tái sử dụng cùng design system,
không tuyên bố admin layout khớp pixel với ảnh customer.

Triển khai:
- AdminSidebar desktop.
- Collapsible sidebar tablet.
- Mobile admin drawer.
- AdminHeader.
- Breadcrumbs.
- User menu.
- Logout trigger.
- Permission-aware menu.
- Main content container.

Yêu cầu:
- Menu là typed configuration.
- Chỉ hiển thị module backend thực sự hỗ trợ.
- Menu được lọc theo role/permission.
- Không dùng magic strings rải rác.
- Sidebar width, collapsed width và header height dùng CSS variables.
- Không gọi API trực tiếp từ layout.
- Không triển khai admin feature cụ thể.

Kiểm tra responsive, cập nhật CURRENT_STATUS.md và dừng để review.
~~~

---

## F2.1 — Generated/Typed API Client

~~~text
Tiếp tục F2.1 — API integration foundation.

Dựa trên backend và OpenAPI thực tế:
1. Ưu tiên generate TypeScript client từ OpenAPI.
2. Nếu không generate được, tạo typed adapter từ backend source.
3. Không tự đoán endpoint hoặc DTO.

Thiết lập:
- API base URLs từ environment variables.
- Generated client hoặc Axios instance tập trung.
- Authorization handling.
- Refresh/re-authentication flow theo backend.
- Request/correlation ID nếu backend hỗ trợ.
- Error normalization.
- AbortSignal/cancellation.
- Typed pagination.
- Query key factories.
- DTO và mappers.

Generated code:
- Nằm trong folder riêng.
- Không được chỉnh sửa thủ công.
- Có command regenerate rõ ràng.

Chỉ tạo environment variables backend thực sự cần.

Tạo/cập nhật:
- docs/api/API_CLIENT.md
- docs/api/OPENAPI_GENERATION.md
- .env.example

Chưa triển khai feature page.
Chạy typecheck/build, cập nhật CURRENT_STATUS.md và dừng để review.
~~~

---

## F2.2 — Authentication và Login Form

~~~text
Tiếp tục F2.2 — Authentication và frontend login form.

Trước khi code, đọc lại authentication flow của backend.

Nếu backend hỗ trợ username/password login:
- Triển khai LoginPage trong AuthLayout.
- Field và request phải khớp DTO thật.
- Validation phải khớp backend.
- Có password visibility toggle.
- Có loading, field error và general API error.
- Hỗ trợ Enter submit và browser autofill.
- Redirect về route ban đầu sau login.

Nếu backend chỉ hỗ trợ OAuth2/OIDC authorization code hoặc PKCE:
- Không tự tạo password API.
- Dừng và báo rõ flow đúng trước khi triển khai form.

Triển khai:
- Auth service/composable.
- Auth store chỉ giữ client auth state cần thiết.
- Route guards.
- Role/permission helpers.
- Logout.
- Session restoration theo backend flow.

Không mặc định lưu access token trong localStorage.
Không tạo fake authentication.
Không sửa backend.

Chạy typecheck/build, cập nhật CURRENT_STATUS.md và dừng để review.
~~~

---

## F3.1 — Customer Home Page

~~~text
Tiếp tục F3.1 — Customer Home Page từ image reference.

Triển khai:
1. HeroBanner.
2. QuickBooking.
3. NowShowingSection.
4. UpcomingMoviesSection.
5. PromotionSection.
6. MembershipSection.
7. CustomerFooter.

API rules:
- Đọc controller, DTO và enum backend trước khi code.
- Sử dụng API thật cho movie, cinema và showtime.
- Không gọi Axios trực tiếp trong Vue component.
- Dùng typed service, mapper và Vue Query/composable.
- Nếu API chưa tồn tại, dùng isolated placeholder adapter và ghi chú rõ.

UI states:
- Loading skeleton.
- Empty state.
- Error và retry.
- Image fallback.
- Quick booking disabled/loading/error.
- Progressive selection: cinema -> movie -> date -> showtime.

Responsive:
- 390px theo mobile image.
- 768px dùng tablet composition.
- 1024px chuyển sang desktop navigation.
- 1440px theo desktop image.

Không hardcode colors, sizes, aspect ratios, radius, shadow hoặc z-index.
Chạy typecheck/build, cập nhật CURRENT_STATUS.md và dừng để review.
~~~

---

## F3.2 — Movies List và Movie Detail

~~~text
Tiếp tục F3.2 — Movies list và movie detail.

Đọc API backend và triển khai:
- MoviesPage.
- Now showing/upcoming filters.
- Search nếu backend hỗ trợ.
- Pagination hoặc infinite loading theo API thật.
- MovieDetailPage.
- Poster/backdrop.
- Metadata, genres, duration, age rating và release information.
- Trailer chỉ khi backend trả dữ liệu.
- Available showtimes CTA.

Tách:
- Movie API service.
- DTO types.
- Movie UI model.
- DTO mapper.
- Query keys/composables.
- Reusable MovieCard.

Có loading, empty, error, retry và image fallback.
Responsive theo design system của Home Page.
Không triển khai R28.
Chạy typecheck/build, cập nhật CURRENT_STATUS.md và dừng để review.
~~~

---

## F3.3 — Cinemas và Showtimes

~~~text
Tiếp tục F3.3 — Cinemas và showtime discovery.

Đọc backend và triển khai:
- CinemasPage.
- Cinema selector.
- Cinema detail nếu API hỗ trợ.
- ShowtimePage hoặc showtime section.
- Date selector.
- Movie/cinema filters theo API thật.
- Showtime cards/chips.
- Điều hướng tới booking bằng showtimeId thật.

Không tự tạo relationships không tồn tại trong API.
URL query parameters phải phản ánh filters quan trọng để có thể reload/share.
Có loading, empty, error và retry state.
Responsive desktop/tablet/mobile.
Chạy typecheck/build, cập nhật CURRENT_STATUS.md và dừng để review.
~~~

---

## F4.1 — Booking Flow Foundation

~~~text
Tiếp tục F4.1 — Booking flow foundation.

Trước khi code, đọc booking-service API, DTO, enum và validation.

Triển khai:
- Booking routes và BookingLayout nếu cần.
- Booking step indicator.
- Showtime summary.
- Reservation expiry/countdown nếu backend cung cấp expiredAt.
- Booking state chỉ giữ dữ liệu cần qua các bước.
- Reload/deep-link handling.
- Error normalization cho seat conflict và booking expiration.

Không reserve seat trong bước này.
Không giả định response.
Không triển khai R28.
Chạy typecheck/build, cập nhật CURRENT_STATUS.md và dừng để review.
~~~

---

## F4.2 — Seat Selection và Reserve Seat

~~~text
Tiếp tục F4.2 — Seat selection và reserve seat integration.

Đọc API seat/showtime/booking thực tế.

Triển khai:
- Seat map.
- Seat row/number labels.
- Available, selected, reserved, sold và disabled states theo backend enum.
- Seat legend.
- Keyboard-accessible seat controls.
- Price summary nếu API cung cấp giá.
- Reserve action bằng showtimeId và seat identifiers thật.
- Xử lý trường hợp hai người cùng chọn một ghế.
- Khi nhận conflict, refresh availability và thông báo rõ cho người dùng.
- Booking expiry/countdown theo response thật.

Không coi trạng thái UI local là nguồn sự thật cho seat availability.
Backend response sau reserve là nguồn sự thật.
Không sửa backend.

Có loading, submission, conflict, expired, error và retry states.
Chạy typecheck/build, cập nhật CURRENT_STATUS.md và dừng để review.
~~~

---

## F4.3 — Payment và Booking Result

~~~text
Tiếp tục F4.3 — Payment integration và booking result.

Đọc payment-service và booking status API thực tế.

Triển khai theo backend hỗ trợ:
- Booking summary.
- Payment initiation.
- Redirect/callback flow nếu có.
- Payment pending state.
- Payment success page.
- Payment failure/cancel page.
- Booking status refresh/polling chỉ khi cần.
- Idempotent UI behavior khi reload callback.

Không tự giả định payment provider hoặc callback parameters.
Không hiển thị success chỉ dựa vào query string nếu backend chưa xác nhận.
Không log token hoặc dữ liệu thanh toán nhạy cảm.

Có loading, timeout, pending, success, failure và retry state.
Chạy typecheck/build, cập nhật CURRENT_STATUS.md và dừng để review.
~~~

---

## F5.1 — Customer Account

~~~text
Tiếp tục F5.1 — Customer account.

Đọc user và booking APIs rồi triển khai những phần backend hỗ trợ:
- Account overview.
- Profile details.
- Edit profile.
- Booking history.
- Booking detail.
- Ticket/QR chỉ khi backend trả dữ liệu.
- Account navigation responsive.

Protected routes phải redirect đúng khi chưa đăng nhập.
Không lưu dữ liệu người dùng nhạy cảm lâu hơn cần thiết.
Có loading, empty, error và retry states.
Chạy typecheck/build, cập nhật CURRENT_STATUS.md và dừng để review.
~~~

---

## F6.1 — Admin Dashboard

~~~text
Tiếp tục F6.1 — Admin dashboard.

Chỉ sử dụng analytics/statistics API backend thực sự có.

Triển khai:
- Dashboard summary cards.
- Recent bookings/activity nếu API hỗ trợ.
- Operational alerts nếu API hỗ trợ.
- Empty/error/loading states.
- Permission-aware content.

Không tạo fake revenue hoặc chart data trong production path.
Nếu thiếu analytics API, hiển thị dashboard navigation/operations phù hợp
và ghi rõ giới hạn thay vì giả lập số liệu.

Chạy typecheck/build, cập nhật CURRENT_STATUS.md và dừng để review.
~~~

---

## F6.2 — Admin CRUD Template

Sử dụng prompt này riêng cho từng module: movies, cinemas, rooms, showtimes, promotions hoặc users.

~~~text
Tiếp tục <MILESTONE> — Admin <MODULE_NAME>.

Đọc controller, DTO, enum, validation và permissions của module này.

Chỉ triển khai operation backend hỗ trợ:
- List.
- Search/filter.
- Pagination.
- Create.
- View detail.
- Update.
- Activate/deactivate hoặc delete.

Yêu cầu:
- Data table responsive.
- Mobile card representation nếu table không phù hợp.
- Create/edit form dùng validation khớp backend.
- Confirmation dialog cho destructive action.
- Permission-aware buttons.
- Loading, empty, error, retry và submission states.
- Backend validation errors map về đúng field nếu có thể.
- Không optimistic update cho thao tác nguy hiểm.
- Không gọi Axios trực tiếp trong component.
- Không triển khai R28.

Chạy typecheck/build, cập nhật CURRENT_STATUS.md và dừng để review.
~~~

Thứ tự đề xuất:

1. `F6.2` — Movies
2. `F6.3` — Cinemas và Rooms
3. `F6.4` — Showtimes
4. `F6.5` — Bookings
5. `F6.6` — Promotions
6. `F6.7` — Users, chỉ khi API và permissions tồn tại

---

## F7.1 — Responsive và Accessibility Review

~~~text
Tiếp tục F7.1 — Responsive và accessibility review.

Review toàn bộ customer, auth và admin UI tại:
- 390px
- 768px
- 1024px
- 1440px

Kiểm tra và sửa:
- Overflow ngang.
- Fixed header/sidebar/bottom nav che nội dung.
- Text clipping.
- Long Vietnamese labels.
- Touch targets tối thiểu 44px.
- Keyboard navigation.
- Focus-visible.
- Semantic landmarks và headings.
- Form labels và accessible names.
- Dialog focus handling.
- Color contrast.
- Loading và live status announcements khi phù hợp.
- Reduced motion preference.

Không thêm automated tests trong bước này.
Chạy typecheck, lint và build.
Cập nhật docs và CURRENT_STATUS.md, sau đó dừng để review.
~~~

---

## F7.2 — Integration Audit và Documentation

~~~text
Tiếp tục F7.2 — Final integration audit và documentation.

Audit:
- Không có component gọi Axios trực tiếp.
- Không có endpoint tự đoán.
- Không có DTO duplicate không cần thiết.
- Không có magic role strings.
- Không có hardcoded design values ngoài token source.
- Không có production mock data bị dùng nhầm.
- Không có feature R28 được triển khai.
- Generated API code không bị sửa thủ công.
- Environment variables được mô tả đầy đủ.
- Error/loading/empty states nhất quán.

Cập nhật:
- README.md
- AGENTS.md
- ARCHITECTURE.md
- CURRENT_STATUS.md
- docs/api/API_CLIENT.md
- docs/development/LOCAL_SETUP.md
- docs/development/MANUAL_VERIFICATION.md

Chạy typecheck, lint và production build.
Không chạy hoặc thêm automated tests nếu tôi chưa yêu cầu.
Không commit.
Báo cáo kết quả và dừng để tôi review.
~~~

---

## C01 — Review trước khi commit

~~~text
Review toàn bộ thay đổi của milestone hiện tại trước khi commit.

Thực hiện:
- Kiểm tra git status và git diff.
- Không sửa backend.
- Không xóa hoặc ghi đè thay đổi không liên quan của tôi.
- Kiểm tra không có secrets, token hoặc credentials.
- Kiểm tra không có file build/cache không cần thiết.
- Chạy typecheck, lint và production build nếu scripts tồn tại.
- Không chạy automated tests.
- Xác nhận CURRENT_STATUS.md đã đồng bộ.

Chưa commit.
Hãy đề xuất commit message theo Conventional Commits và dừng để tôi approve.
~~~

---

## C02 — Commit sau khi approve

~~~text
Tôi approve thay đổi hiện tại.

Hãy commit chỉ các file thuộc milestone đã review.
Không push.
Không amend commit cũ.
Không đưa file hoặc thay đổi không liên quan vào commit.

Sau khi commit:
- cung cấp commit hash;
- commit message;
- danh sách file đã commit;
- git status còn lại;
- milestone tiếp theo được đề xuất.
~~~

---

## R01 — Resume trong chat mới hoặc máy mới

~~~text
Tiếp tục dự án Cinematic Web Frontend.

Repositories:
- Frontend editable: https://github.com/HuyKunNe/cinematic-web
- Backend read-only: https://github.com/HuyKunNe/cinema-system

Quy tắc:
- Backend đã hoàn thành, trừ R28 đang DEFERRED.
- Không chỉnh sửa backend.
- Không commit hoặc push frontend trước khi tôi approve.
- Không dùng Figma vì đang bị giới hạn.
- Dùng hai ảnh trong docs/design/reference làm nguồn thiết kế.
- Không hardcode design values; dùng semantic CSS variables.
- Không gọi Axios trực tiếp trong Vue component.
- Bỏ qua automated tests trừ khi tôi yêu cầu.

Trước khi làm tiếp:
1. Đọc AGENTS.md.
2. Đọc README.md.
3. Đọc ARCHITECTURE.md.
4. Đọc CURRENT_STATUS.md.
5. Đọc docs/api và docs/design.
6. Kiểm tra git log gần nhất và git status.
7. Đọc code liên quan tới milestone hiện tại.

Không đọc lại toàn bộ repository nếu docs và code liên quan đã đủ.
Không sửa code ngay.

Hãy báo:
- milestone gần nhất đã hoàn thành;
- trạng thái working tree;
- việc còn dang dở;
- milestone tiếp theo;
- các blocker hoặc assumption.

Sau đó dừng để tôi xác nhận tiếp tục.
~~~

---

## S01 — Mẫu prompt tiếp tục milestone bất kỳ

~~~text
Tiếp tục <MILESTONE_ID> — <MILESTONE_NAME>.

Trước khi code:
1. Đọc CURRENT_STATUS.md.
2. Đọc docs liên quan.
3. Đọc API backend liên quan; backend chỉ được đọc.
4. Đọc component/design reference liên quan.
5. Xác nhận phần này không thuộc R28.
6. Báo ngắn gọn kế hoạch và file dự kiến thay đổi.

Khi triển khai:
- Dùng API thật.
- Không tự đoán endpoint hoặc DTO.
- Không gọi Axios trực tiếp trong Vue component.
- Dùng typed service, DTO mapper và query/composable.
- Có loading, empty, error và retry states.
- Dùng design tokens, không hardcode arbitrary values.
- Responsive desktop/tablet/mobile.
- Accessibility cơ bản.
- Không sửa backend.
- Không commit hoặc push.
- Không chạy automated tests.

Sau khi hoàn tất:
- Liệt kê file tạo/sửa.
- Liệt kê API đã tích hợp.
- Giải thích quyết định chính.
- Đưa hướng dẫn kiểm tra thủ công.
- Chạy typecheck/lint/build nếu có.
- Cập nhật CURRENT_STATUS.md.
- Dừng để tôi review.
~~~

---

## Roadmap tóm tắt

| Thứ tự | Milestone | Kết quả |
|---:|---|---|
| 1 | P00 | Thiết lập quy tắc |
| 2 | F0.1 | API inventory |
| 3 | F0.2 | Phân tích hai ảnh |
| 4 | F0.3 | Kiến trúc frontend |
| 5 | F1.1 | Design foundations |
| 6 | F1.2 | Router và layouts |
| 7 | F1.3 | Customer navigation |
| 8 | F1.4 | Admin shell |
| 9 | F2.1 | Typed API client |
| 10 | F2.2 | Authentication |
| 11 | F3.1 | Home page |
| 12 | F3.2 | Movies |
| 13 | F3.3 | Cinemas/showtimes |
| 14 | F4.1 | Booking foundation |
| 15 | F4.2 | Seat reservation |
| 16 | F4.3 | Payment/result |
| 17 | F5.1 | Customer account |
| 18 | F6.x | Admin features |
| 19 | F7.1 | Responsive/a11y review |
| 20 | F7.2 | Integration/docs audit |

