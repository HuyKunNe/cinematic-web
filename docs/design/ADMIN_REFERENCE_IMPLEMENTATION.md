# Đối chiếu giao diện Admin với cinema-admin

## Phạm vi

Nguồn hình thức: toàn bộ `docs/design/reference/cinema-admin` (HTML khung,
CSS, các màn hình/form dựng trong `assets/js/app.js`, dữ liệu minh họa,
SVG, README và tài liệu kiểm tra). Không thay đổi các file reference.

Reference là ứng dụng demo dùng localStorage. Chỉ lấy bố cục và phong cách;
không đưa dữ liệu mẫu, mô phỏng tài khoản, thanh toán hay quy tắc giá của demo
vào sản phẩm.

## Đối chiếu màn hình

| Reference | Route FE hiện có | Cách áp dụng / giới hạn giữ nguyên |
| --- | --- | --- |
| `#dashboard` | `/admin` | Theme sáng, card thống kê, typography, bảng và control. Giữ truy vấn/phạm vi/ngày hiện có; số liệu doanh thu và booking chưa tích hợp vẫn hiển thị trạng thái chưa có dữ liệu. |
| `#movies` và form phim | `/admin/movies` | Danh sách, bộ lọc, badge, poster nhỏ, nút sửa có biểu tượng bút; modal phim, thể loại và phiên bản dùng cùng theme. Tìm tên/độ tuổi đang disabled vẫn giữ nguyên. |
| `#cinemas` và chi tiết/form rạp | `/admin/cinemas` | Thẻ rạp, vùng cover, thông tin liên hệ, thống kê phòng, modal và menu cùng palette. Giữ số phòng thực; không thêm sức chứa giả khi dữ liệu hiện có chỉ là thống kê số phòng. |
| `#rooms`, tab ghế, form phòng | `/admin/rooms`, `/admin/rooms/:roomId?/seats`, `/admin/rooms/:roomId/layout` | Bảng, form, menu, panel và trạng thái chọn ghế; giữ luồng sơ đồ có phiên bản, xuất bản, sao chép và kiểm tra xung đột hiện có. Không đổi tọa độ/khoảng cách ma trận hoặc sức chứa. |
| `#shows`, form tạo suất | `/admin/showtimes`, `/admin/showtimes/new` | Ngày, bộ lọc, bảng, badge và form theo theme chung. Giữ luồng chọn bảng giá và xác nhận mở bán. Không thêm lịch 24 giờ/sao chép suất chỉ có trong demo. |
| `#pricing`, modal bảng giá/tra giá | `/admin/pricing-policies` | Giữ giao diện giá đã dùng palette reference; chỉnh chiều rộng modal thiết lập về 1180px. Giữ contract phiên bản, bản nháp/công bố và tra giá hiện tại. |
| `#orders` và chi tiết đơn | `/admin/bookings`, `/admin/bookings/:bookingId` | Bảng, bộ lọc trạng thái, badge và panel chi tiết đồng bộ. Giữ trang chi tiết riêng; không thêm tạo đơn tại quầy hay thanh toán mô phỏng. |
| `#promotions` | `/admin/promotions` | Áp dụng theme cho trang chưa tích hợp có sẵn; không kích hoạt nút/form chưa có hành vi. |
| `#customers`, `#staff` | `/admin/users` | Áp dụng theme cho trang người dùng chưa tích hợp có sẵn. Không tự tạo ma trận quyền hoặc thay đổi tài khoản. |
| `#payments`, `#checkin`, `#products`, `#reports`, `#settings`, `#logs` | Chưa có route Admin tương ứng | Không tạo route hoặc liên kết điều hướng giả. |

## Kiến trúc và các file thay đổi

- `src/layouts/AdminLayout.vue`: gắn `is-admin-role` theo trạng thái role hiện tại,
  giữ chung header/sidebar, drawer Reka và luồng đăng xuất.
- `src/components/navigation/AdminHeader.vue`: thêm ngữ cảnh trang và tên tài
  khoản Admin; tìm kiếm chức năng, shortcut và đăng xuất giữ nguyên.
- `src/styles/admin-shell.css`: cho phép token shell được kế thừa vào portal
  khi AdminLayout đang hiển thị cho Admin.
- `src/styles/admin-theme.css`: theme chỉ kích hoạt cho Admin; ánh xạ token
  màu/typography/geometry, sửa chiều rộng cột sidebar, đồng bộ bảng/form/modal,
  trạng thái, card và responsive. Bảng giá và ma trận ghế giữ kích thước riêng.
- `src/styles/main.css`: import theme và khai báo tập trung hai breakpoint
  mobile/wide của shell reference.
- `src/styles/admin-dashboard.css`, `admin-movies.css`, `admin-reference.css`:
  native control đọc color-scheme từ token, fallback giữ hành vi tối cũ.
- `src/features/movies/admin/pages/AdminMoviesPage.vue`: đổi dấu ba chấm của
  thao tác sửa thành biểu tượng bút, giữ handler và accessible name.
- `src/features/showtimes/admin/pages/AdminShowtimesPage.vue`,
  `src/features/booking/admin/pages/AdminBookingsPage.vue`: bọc nhãn trạng thái
  hiện có bằng badge; sử dụng enum hiện có, không đổi giá trị hoặc API.

Theme dùng sự hiện diện của `.admin-layout.is-admin-role` để cấp token cho
body và các portal Reka. Khi chuyển sang customer hoặc tài khoản staff không
có role Admin, selector này không còn khớp. Không sửa shared AppButton,
route guard, query, mapper, generated client hay package/lock file.

## Các khác biệt có chủ đích

- Giữ thương hiệu Cinematic và danh tính đăng nhập thật. Header giữ tìm kiếm
  chức năng thay vì selector phạm vi toàn cục chưa được nối vào mọi truy vấn;
  các bộ lọc phạm vi hiện có vẫn nằm trong trang sở hữu chúng.
- Giữ drawer accessible hiện có ở ngưỡng responsive hiện tại (1024px), thay
  vì sao chép rail 70px của demo ở tablet.
- Giữ các bước/form và thao tác nghiệp vụ ngoài những gì demo trình bày,
  gồm định dạng nội dung, thể loại, sơ đồ có phiên bản và khôi phục xung đột.
- Không thêm biểu đồ, doanh thu, ảnh sản phẩm hoặc chương trình khuyến mãi
  bằng dữ liệu demo. Các phần FE chưa tích hợp từ trước vẫn chưa tích hợp.
- Không thay đổi endpoint/DTO. Đã đọc Axios dùng chung, query/client hiện có
  và controller trong checkout BE tham chiếu; không định nghĩa contract mới.

## Tự chuẩn bị nháp và xuất bản một bước

- Form bảng giá mới tự tạo bản nháp với tên có thể sửa “Bảng giá mới”, loại ngày
  và phạm vi đã chọn. Khi sửa bảng giá đã công bố, ưu tiên mở bản nháp hiện có;
  nếu chưa có thì tự tạo phiên bản nháp từ bản công bố. Tra giá/chỉ xem không
  tạo bản nháp.
- Vào màn thiết kế ghế từ trang ghế hoặc URL không chỉ định phiên bản: đợi tải
  danh sách phiên bản, mở nháp hiện có; nếu chưa có thì sao chép bản công bố gần
  nhất, hoặc tạo sơ đồ trống khi chưa có phiên bản. URL chỉ định phiên bản vẫn
  mở đúng phiên bản đó. Không tự lặp yêu cầu tạo khi lỗi/mất phản hồi.
- “Xuất bản” tự lưu dữ liệu hợp lệ rồi xuất bản với `expectedVersion` mới nhận.
  Bảng giá vẫn kiểm tra điều kiện xuất bản từ BE; sơ đồ ghế vẫn kiểm tra ma trận,
  ghế và phiên bản. Lỗi lưu hoặc xung đột chặn bước xuất bản và giữ nội dung nhập.
  “Lưu nháp” vẫn dùng được độc lập.
- Thay đổi luồng nằm trong `AdminPricingWorkflowCreate.vue`,
  `AdminPricingPolicyPage.vue`, `AdminRoomLayoutPage.vue` và
  `AdminRoomSeatsPage.vue`. Dùng client/mutation hiện có, không sửa BE.

Kiểm tra thủ công thêm: mở lại nháp bằng URL, sửa một ô rồi xuất bản trực tiếp;
thử ghế đang gõ chưa rời ô; thử dữ liệu sai, thiếu giá và xung đột phiên bản.
Xác nhận không gửi publish sau lỗi save, không tạo nháp liên tục sau lỗi mạng,
không tạo nháp khi chỉ tra giá/xem phiên bản đã công bố. Chỉ thực hiện thao tác
ghi trên môi trường được phép; phiên làm việc này không gọi API ghi thực tế.

## Kiểm tra

Không chạy test, lint hoặc format toàn repository. Kiểm tra compilation bằng
`npm run type-check` và `npm run build-only`; kiểm tra whitespace bằng
`git diff --check`. Các lệnh này không khởi động BE hoặc truy cập database.

Chưa xác nhận hiển thị bằng trình duyệt: công cụ browser/native host không
khả dụng trong phiên làm việc. Cần kiểm tra thủ công trước khi chốt độ khớp ảnh.

### Checklist thủ công

1. Đăng nhập Admin có các quyền tương ứng; mở từng route trong bảng trên.
   So lề header/nội dung, chiều rộng sidebar mở/thu gọn và breadcrumb.
2. Kiểm tra 1440px, 1024px, 768px, 390px và màn hình rộng từ 1500px.
   Bảng được cuộn trong vùng bảng; trang không tràn ngang. Drawer đóng bằng
   Escape/nút đóng/chọn route và trả focus đúng.
3. Kiểm tra Tab/Shift+Tab, hover, disabled, loading, lỗi và trạng thái rỗng.
   Kiểm tra dropdown autocomplete, menu phòng, modal phim/rạp/phòng và bảng giá
   đều dùng theme sáng, kể cả khi nội dung nằm trong portal.
4. Kiểm tra lọc/phân trang phim, rạp, phòng, suất chiếu và đơn. Mở form tạo,
   sửa, chi tiết và hủy/đóng; kiểm tra giá trị được giữ và focus quay lại nút mở.
5. Kiểm tra sơ đồ ghế: loại ghế, ghế đôi, chọn nhiều vị trí và điều khiển ma trận;
   màu chọn rõ ràng, kích thước/tọa độ/cặp ghế không đổi.
6. Kiểm tra modal giá ở desktop/mobile: cuộn ma trận, footer thao tác còn nhìn
   thấy, trạng thái chỉ xem/bản nháp/công bố và lỗi xung đột vẫn đúng.
7. Chuyển về customer và tài khoản chỉ có role Staff: theme, giao diện và
   điều hướng trước đó không đổi. Các quyền truy cập vẫn do guard/API xử lý.
8. Khi cần xác nhận thao tác lưu/mở bán/xuất bản, thực hiện thủ công trên môi
   trường được phép với dữ liệu phù hợp; phiên cập nhật UI này không ghi dữ liệu.

Không sửa BE, database, cấu hình MySQL; không commit, push hay tạo PR.

Commit message đề xuất: `style(admin): align shared UI with cinema-admin reference`
