# USER FE — đối chiếu Lumière Cinema

Nguồn giao diện: `docs/design/reference/lumiere-cinema/index.html`, README,
`assets/css/styles.css` và các template header/footer/home/movies/movieDetail/
schedule/cinemas/booking/account/tickets trong `assets/js/app.js`. Bộ ảnh SVG
và video đi kèm thuộc demo, không được coi là ảnh/nội dung của phim từ API.
Không sửa các file reference.

## Các trang và route

| Reference | USER FE | Triển khai / giới hạn |
| --- | --- | --- |
| Header, footer | `CustomerLayout`, header desktop/mobile, footer | Nhận diện Lumière, nền kem, nav, thanh thông tin, footer dùng chung trên các trang USER. Giữ chọn địa điểm, tìm phim, menu mobile và điều hướng bàn phím. |
| Home | `/` | Hero từ API; đặt vé nhanh hiện có; hai tab Đang chiếu/Sắp chiếu với grid 4/3/2 cột; thẻ rạp thật và liên kết Vé của tôi. |
| Movies | `/movies` | Áp dụng typography, bộ lọc, poster và CTA theo palette Lumière. Giữ tìm kiếm/lọc/sắp xếp/tải thêm hiện có. |
| Movie detail | `/movies/:movieId` | Hero thông tin nền sage, poster, metadata, synopsis, trailer và lịch chiếu hiện có. Không thêm đạo diễn/diễn viên nếu API không cung cấp. |
| Schedule | `/showtimes`, `/booking` | Dùng lại `BookingStartPage` và dữ liệu/lựa chọn suất hiện có, thay placeholder lịch chiếu. Heading riêng cho lịch chiếu. |
| Cinemas | `/cinemas` | Card ảnh minh họa chung, địa chỉ/tên/thành phố từ API, bộ lọc và chọn rạp giữ nguyên. Không lấy ảnh/địa chỉ rạp demo làm dữ liệu thật. |
| Seats / checkout | `/booking/:showtimeId` | Palette và panel/summary theo reference, tiến trình 3 bước đang hỗ trợ, giữ ghế qua booking API và theo dõi kết quả. |
| Account | `/account` | Nav hồ sơ/vé, thông tin sẵn có từ phiên OIDC và đăng xuất thật. Không có form hồ sơ giả hoặc cập nhật local. |
| Tickets / order | `/account/bookings?bookingId=…` | Đơn của chính tài khoản, chi tiết giá/ghế đã lưu, trạng thái, hạn giữ ghế và xác nhận hủy RESERVED còn hạn. |
| Offers | `/promotions` | Heading và empty state theo reference. Chưa có Promotions API nên không hiển thị mã/giá ưu đãi giả. |

## File và mục đích

- `src/styles/customer-lumiere.css`: primitive/semantic/component tokens cho USER,
  palette, hình học và các override theo trang. Chỉ kích hoạt trong customer layout
  (kể cả portal), không theme Admin hoặc staff.
- `src/styles/main.css`: khai báo tập trung breakpoint Lumière 960/760px.
- `src/components/navigation/CustomerBrand.vue`, `CustomerAccountNav.vue`: nhận diện
  và điều hướng dùng lại; không chứa dữ liệu nghiệp vụ giả.
- `CustomerHeader.vue`, `CustomerMobileHeader.vue`, `CustomerFooter.vue`,
  `src/layouts/CustomerLayout.vue`: layout dùng chung, footer chuyển khỏi riêng Home.
- `src/features/home/components/HomeProgramme.vue`: tab Reka và grid phim thật.
- `HomeCinemaDiscovery.vue`: danh sách rạp từ cinema feature public API, chọn rạp
  và dẫn sang luồng đặt vé; fallback được ghi rõ là ảnh minh họa.
- `src/features/home/pages/HomePage.vue`, `components/HeroBanner.vue`: ghép các
  section mới, bỏ promo/điểm thưởng minh họa và đồng bộ chữ nhận diện.
- `src/features/home/presentation/artwork.ts`, `public/customer/*.svg`: fallback
  thuộc dự án; sửa các URL ảnh `/home/*.jpg` vốn không có file trong working tree.
- `src/features/movies/pages/MoviesPage.vue`,
  `src/features/cinemas/pages/CinemasPage.vue`: heading/card cùng phong cách.
- `src/features/account/pages/AccountPage.vue`,
  `src/features/home/pages/OffersPage.vue`: thay các placeholder USER bằng trang
  có điều hướng và trạng thái phù hợp khả năng hiện có.
- `src/features/booking/components/BookingProgress.vue`, các page booking và
  `src/styles/customer-bookings.css`: tiến trình, nội dung và trạng thái đơn.
- `src/features/booking/api/customer-bookings.ts`, `BookingCheckout.vue`: tích hợp
  generated client hiện có, kiểm tra contract, idempotency, query theo chủ đơn.
- `src/router/index.ts`, `customer-navigation.ts`: nối route/điều hướng USER.

## Khác biệt có chủ đích

- Reference là demo localStorage, cho đặt không đăng nhập và thanh toán mô phỏng.
  Sản phẩm giữ OIDC, booking thuộc CurrentUser, không dùng tài khoản/mật khẩu demo.
- Chưa có API checkout/payment cho USER, QR, bắp nước, membership hoặc promotions:
  không dựng thao tác không có hành vi, không giả lập thành công, điểm hay mã ưu đãi.
- API ghế hiện đang dùng có rowLabel/seatNumber, chưa cung cấp tọa độ sơ đồ:
  vẫn hiển thị theo hàng và ghi rõ không phải vị trí thực trong phòng.
- Thời hạn giữ ghế do booking.expiresAt quyết định; không gán 10 phút hoặc giới hạn
  khách từ demo. Báo giá và trạng thái do API thật quyết định.
- Lịch sử đơn hiện thiếu metadata phim/rạp trong response; dùng mã đơn/suất thay vì
  dựng tên, poster, QR hoặc phân loại Sắp xem/Đã xem thiếu dữ liệu.
- Duy trì bottom navigation mobile hiện có; không thêm route membership/support giả.

## Kiểm tra

Đã parse/compile cú pháp SFC Vue, parse TypeScript/CSS, kiểm tra import cục bộ và
`git diff --check`. Chạy `npm run dev -- --host 127.0.0.1`; Vite phục vụ CSS Lumière,
HomeProgramme, HomeCinemaDiscovery, MyBookings và AccountPage qua HTTP 200.
Không chạy test, build hoặc typecheck. Computer Use không kết nối được native pipe,
nên chưa có xác nhận screenshot/visual runtime. Không gọi mutation hoặc database
trong lúc kiểm tra.

Kiểm tra thủ công: desktop 1440/1024px và mobile 390/320px; menu/nav/footer trên
mọi route; tab phim và fallback ảnh; chọn rạp; tìm phim; lịch chiếu; chọn ghế,
báo giá/tạo đơn; Vé của tôi, lỗi mạng/retry cùng request; hủy đơn giữ ghế; đăng xuất.
Xem thêm `docs/USER_BOOKING_FLOW.md` cho các tình huống nghiệp vụ cần BE đang chạy.
