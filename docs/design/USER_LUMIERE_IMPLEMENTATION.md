# USER FE — đối chiếu Lumière Cinema

Nguồn giao diện: `docs/design/reference/lumiere-cinema/index.html`, README,
`assets/css/styles.css` và các template header/footer/home/movies/movieDetail/
schedule/cinemas/booking/account/tickets trong `assets/js/app.js`. Bộ ảnh SVG
và video đi kèm thuộc demo, không được coi là ảnh/nội dung của phim từ API.
Không sửa các file reference.

## Các trang và route

| Reference        | USER FE                                         | Triển khai / giới hạn                                                                                                                                                                |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Header, footer   | `CustomerLayout`, header desktop/mobile, footer | Nhận diện Lumière, nền kem, nav, thanh thông tin, footer dùng chung trên các trang USER. Giữ chọn địa điểm, tìm phim, menu mobile và điều hướng bàn phím.                            |
| Home             | `/`                                             | Hero từ API; đặt vé nhanh hiện có; hai tab Đang chiếu/Sắp chiếu với grid 4/3/2 cột; thẻ rạp thật và liên kết Vé của tôi.                                                             |
| Movies           | `/movies`                                       | Áp dụng typography, bộ lọc, poster và CTA theo palette Lumière. Giữ tìm kiếm/lọc/sắp xếp/tải thêm hiện có.                                                                           |
| Movie detail     | `/movies/:movieId`                              | Hero thông tin nền sage, poster, metadata, synopsis, trailer và lịch chiếu hiện có. Không thêm đạo diễn/diễn viên nếu API không cung cấp.                                            |
| Schedule         | `/showtimes`, `/booking`                        | `/showtimes` dùng `ShowtimesPage`: tab Theo phim/Theo rạp, ngày, định dạng và nhóm suất theo reference. `/booking` tiếp tục dùng QuickBooking; kiểm tra lại suất trước khi sang ghế. |
| Cinemas          | `/cinemas`                                      | Card ảnh minh họa chung, địa chỉ/tên/thành phố từ API, bộ lọc và chọn rạp giữ nguyên. Không lấy ảnh/địa chỉ rạp demo làm dữ liệu thật.                                               |
| Seats / checkout | `/booking/:showtimeId`                          | Palette và panel/summary theo reference, tiến trình 3 bước đang hỗ trợ, giữ ghế qua booking API và theo dõi kết quả.                                                                 |
| Account          | `/account`                                      | Nav hồ sơ/vé, thông tin sẵn có từ phiên OIDC và đăng xuất thật. Không có form hồ sơ giả hoặc cập nhật local.                                                                         |
| Tickets / order  | `/account/bookings?bookingId=…`                 | Đơn của chính tài khoản, chi tiết giá/ghế đã lưu, trạng thái, hạn giữ ghế và xác nhận hủy RESERVED còn hạn.                                                                          |
| Offers           | `/promotions`                                   | Heading và empty state theo reference. Chưa có Promotions API nên không hiển thị mã/giá ưu đãi giả.                                                                                  |

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

### Hero khi chưa cấu hình phim nổi bật

Hero là vùng khám phá chung, không bị giới hạn bởi suất đang mở bán ở rạp đang chọn.
Ưu tiên API hero và giữ thứ tự biên tập. Nếu API này trả mảng rỗng, dùng tối đa
5 phim NOW_SHOWING từ API danh mục thật, ưu tiên phim có ảnh. Không bật hero flag
hoặc cập nhật dữ liệu BE. Nếu thiếu/hỏng ảnh, dùng SVG dự phòng thuộc dự án.
Giữ tự chuyển 5 giây, tạm dừng hover/focus/tab ẩn và tôn trọng giảm chuyển động.

### Cập nhật chọn địa điểm và lịch chiếu

- `CustomerCitySelect.vue` dùng Reka Select ở header desktop/mobile. Đổi thành phố
  sử dụng `location.selectCity` hiện có và xóa lựa chọn rạp cũ theo store.
- QuickBooking chọn phim trước, chọn rạp trực tiếp trong danh sách theo thành phố,
  rồi ngày/suất; vẫn giữ chọn suất và bước kiểm tra trước khi tiếp tục. Khác demo
  chỉ có ba ô, sản phẩm giữ ô suất để không bỏ thao tác hiện có.
- `ShowtimesPage.vue` và `customer-schedule.ts` đọc public bookable API đã có:
  bắt buộc cinemaId/from/to, movieId tùy chọn. Theo phim nhóm theo rạp của thành phố;
  Theo rạp nhóm theo phim. Không tạo endpoint hoặc dữ liệu lịch mẫu.
- `AppDateStrip.vue` dùng chung cho lịch chiếu và lịch tại chi tiết phim. Có bảy
  ngày hiển thị nhanh, vẫn giữ input ngày để chọn ngày khác, không gán giới hạn BE.
- `MovieShowtimes.vue` chọn rạp trực tiếp khi đã chọn thành phố; hộp thoại cũ vẫn
  làm phương án chọn địa điểm khi chưa có thành phố và khôi phục focus.
- Chỉ hiển thị trạng thái mở bán thật. Không giả nhãn Gần hết/Hết chỗ vì response
  bookable hiện không có số ghế còn lại.

Kiểm tra thủ công: đổi thành phố trên desktop/mobile; kiểm tra rạp cũ được bỏ,
QuickBooking lọc đúng danh sách rạp và tự chuyển trường; thử Theo phim/Theo rạp,
đổi ngày/định dạng, rạp không có suất/lỗi mạng, bấm suất để xác nhận trước chọn ghế.

- Reference là demo localStorage, cho đặt không đăng nhập và thanh toán mô phỏng.
  Sản phẩm giữ OIDC, booking thuộc CurrentUser, không dùng tài khoản/mật khẩu demo.
- Chưa có API checkout/payment cho USER, QR, bắp nước, membership hoặc promotions:
  không dựng thao tác không có hành vi, không giả lập thành công, điểm hay mã ưu đãi.
- Danh sách ghế đọc từ `GET /api/v1/showtimes/{showtimeId}/seat-map`, theo snapshot
  gắn với suất chiếu; không ghép danh sách ghế vật lý cũ của phòng. API có thông tin
  vị trí; UI matrix giữ đúng hàng/cột, ô trống và ghế đôi chiếm hai ô như Admin.
  Sơ đồ legacy không có matrix vẫn hiển thị danh sách theo hàng với chú thích rõ ràng.
- Thời hạn giữ ghế do booking.expiresAt quyết định; không gán 10 phút hoặc giới hạn
  khách từ demo. Báo giá và trạng thái do API thật quyết định.
- Lịch sử đơn hiện thiếu metadata phim/rạp trong response; dùng mã đơn/suất thay vì
  dựng tên, poster, QR hoặc phân loại Sắp xem/Đã xem thiếu dữ liệu.
- Duy trì bottom navigation mobile hiện có; không thêm route membership/support giả.

## Kiểm tra

### Header USER — 2026-11-12

Hoàn thiện tiếp menu tài khoản: desktop dùng Reka DropdownMenu với tên phiên đăng nhập,
Hồ sơ, Vé & giao dịch và Đăng xuất. Mobile có thao tác đăng xuất trong drawer.
Component chỉ phát sự kiện; CustomerLayout gọi public auth `signOut`, phục hồi phiên
khi lỗi và xóa query cache khi đăng xuất thành công, như luồng Account hiện có.
Có trạng thái pending/disabled/error, focus/hover, animation dropdown ngắn và tôn trọng
prefers-reduced-motion. Chưa thực hiện đăng xuất hoặc quan sát browser trong lượt này.

Đối chiếu header Lumière với source hiện tại: desktop chia ba vùng logo/nav/thao tác,
sticky bên dưới thanh thông tin; thành phố, tìm phim và tài khoản nằm trong cùng hàng.
Chưa đăng nhập có hai liên kết Đăng nhập/Đăng ký, đăng nhập giữ returnTo qua OIDC.
Mobile tách hàng logo/tìm/menu khỏi hàng thành phố/rạp. Menu dùng Reka Dialog,
hiển thị rõ đăng nhập/đăng ký hoặc tài khoản, giữ toàn bộ route và thao tác đặt vé.
Rời route/đổi sang desktop đóng menu; thao tác tìm phim và chọn rạp vẫn dùng handler layout.
Không thay API, xác thực, route hoặc giao diện Admin. R28 vẫn ngoài phạm vi.
Computer Use không kết nối được native pipe, nên chưa có xác nhận trực quan desktop/mobile.
Kiểm tra thủ công: 320/390/768/1024/1440px; header sticky và không tràn ngang;
menu Tab/Shift+Tab/Escape, focus trở về nút mở; tìm phim/chọn rạp; đăng nhập/đăng ký;
đổi route/resize khi menu mở; trạng thái active Phim khi ở chi tiết phim.

Trang chọn ghế đối chiếu trực tiếp `lumiere-cinema/index.html#/booking/seats`:
sơ đồ nền sage, màn hình cong, hàng ghế đánh số, màu VIP/ghế đôi và trạng thái;
chú giải bên dưới cùng giá theo loại ghế có trong phòng. Giữ toàn bộ khoảng trống
theo matrix và co vừa chiều rộng, không thêm lối đi giả hay cuộn ngang.
Giá theo loại ghế nằm trên sơ đồ; bỏ danh sách “Vé của bạn”.
“Cuộc hẹn của bạn” ở cột phải trên desktop và bên
dưới trên mobile. Poster, thông tin phim/rạp/suất và báo giá lấy từ API hiện có.
Khác reference: giữ tiến trình đặt vé hiện tại; không thêm bước bắp nước/thanh toán,
đếm ngược giữ chỗ hay giới hạn 8 khách từ demo. Nhóm vé/điều kiện hiển thị theo
báo giá, chưa bổ sung bộ chọn đối tượng vé. Sơ đồ legacy chưa có matrix vẫn dùng danh sách hàng.

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
