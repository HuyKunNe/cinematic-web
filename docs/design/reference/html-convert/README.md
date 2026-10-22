# Cinematic design references

Mở `index.html` để xem toàn bộ màn hình đang tồn tại.

## Quyền sở hữu CSS

- `reference-tokens.css`: primitive, semantic và shell tokens.
- `reference-base.css`: reset và accessibility.
- `admin-unified.css`: sidebar, header và khung admin.
- `admin-components.css`: thành phần admin dùng chung.
- CSS của trang: chỉ sở hữu nội dung trang đó, có scope `data-reference`.
- `reference-responsive.css`: responsive rules, nạp cuối.
- `cinema-reference.css`: entry tương thích, không còn palette hoặc shell riêng.

Không import CSS dashboard để định dạng trang phim.
Không import CSS rạp để định dạng phòng, booking hoặc người dùng.

## Nguồn tham chiếu và đồng nhất viewport

Khi Figma không khả dụng, HTML/CSS trong thư mục này là nguồn tham chiếu giao diện cho FE.

Các trang dùng chung `reference-base.css`. Scrollbar dọc được giữ ổn định ở cấp `html` bằng `scrollbar-gutter: stable`, để trang ngắn và trang dài không lệch độ rộng. Không ẩn scrollbar riêng theo từng trang.

Các giá trị giao diện mới nên dùng CSS variables. Nếu bổ sung kích thước, màu hoặc khoảng cách, hãy tạo hoặc tái sử dụng token thay vì rải giá trị trực tiếp trong CSS.

## Luồng admin

Phim → thêm/sửa phim.
Rạp → thêm/sửa rạp → Phòng và ghế → Ghế của phòng → Thiết kế sơ đồ.
Lịch chiếu → tạo suất chiếu → chọn sơ đồ đã xuất bản của phòng.

Ghế của phòng và geometry của sơ đồ là hai phần riêng.
Sức chứa không phải input khi tạo phòng.
Layout không chỉnh loại ghế hoặc active của ghế.

## Trạng thái reference

Các số liệu, phim, ghế, giá và biểu đồ là dữ liệu minh họa.
Điều khiển lưu không gọi API.
Bộ lọc dashboard chỉ minh họa thay đổi phạm vi; không tải số liệu.
Field độ tuổi ở editor phim chỉ xem cho tới khi có contract ghi tương ứng.
Checkout, vé của tôi và tài khoản chưa có reference trong thư mục.
Các link chưa có màn hình đích được đánh dấu aria-disabled.

Home desktop và mobile là hai artboard riêng.
Kiểm tra các trang responsive ở 390, 768, 1024 và 1440px.

| Nhóm     | File                                                           |
| -------- | -------------------------------------------------------------- |
| Admin    | [admin-bookings.html](./admin-bookings.html)                   |
| Admin    | [admin-cinema-editor.html](./admin-cinema-editor.html)         |
| Admin    | [admin-cinemas.html](./admin-cinemas.html)                     |
| Admin    | [admin-dashboard.html](./admin-dashboard.html)                 |
| Admin    | [admin-movie-editor.html](./admin-movie-editor.html)           |
| Admin    | [admin-movies.html](./admin-movies.html)                       |
| Admin    | [admin-promotions.html](./admin-promotions.html)               |
| Admin    | [admin-room-editor.html](./admin-room-editor.html)             |
| Admin    | [admin-room-layout.html](./admin-room-layout.html)             |
| Admin    | [admin-room-seats.html](./admin-room-seats.html)               |
| Admin    | [admin-rooms.html](./admin-rooms.html)                         |
| Admin    | [admin-showtime-form.html](./admin-showtime-form.html)         |
| Admin    | [admin-showtimes.html](./admin-showtimes.html)                 |
| Admin    | [admin-users.html](./admin-users.html)                         |
| Admin    | [admin-pricing-policies.html](./admin-pricing-policies.html)   |
| Customer | [cinematic-cinema-detail.html](./cinematic-cinema-detail.html) |
| Customer | [cinematic-cinemas.html](./cinematic-cinemas.html)             |
| Customer | [cinematic-home-desktop.html](./cinematic-home-desktop.html)   |
| Customer | [cinematic-home-mobile.html](./cinematic-home-mobile.html)     |
| Customer | [cinematic-movie-detail.html](./cinematic-movie-detail.html)   |
| Customer | [cinematic-movies.html](./cinematic-movies.html)               |
| Customer | [seat-selection.html](./seat-selection.html)                   |
