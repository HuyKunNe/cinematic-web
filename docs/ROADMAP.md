# Frontend Roadmap — Admin FE + User FE

**Cập nhật theo trạng thái repo đến:** 2026-11-04  
**Repository:** https://github.com/HuyKunNe/cinematic-web  
**Backend tham chiếu:** https://github.com/HuyKunNe/cinema-system

## Nguyên tắc làm việc

- Dùng source code và API OpenAPI mới nhất làm chuẩn; không xem roadmap cũ là bằng chứng implementation.
- API client được generate bằng Orval; không sửa tay file trong `src/services/api/generated`.
- Không tự tạo endpoint, DTO hoặc enum khi BE chưa xác nhận.
- User tự áp dụng và commit thay đổi; repo được đọc trước khi hướng dẫn.
- Trạng thái “đã có trong source” không đồng nghĩa đã xác minh trên browser/runtime.
- R28 Notification đang hoãn; không đưa notification routes, stores hoặc UI vào roadmap hiện tại.

## Trạng thái đầu vào

- FE commit `a9ae4173` ngày 2026-11-03 đã tích hợp screening versions trong form phim và làm mới lựa chọn phiên bản ở form suất chiếu.
- BE commit `c2489a68` ngày 2026-11-04 tách projection technology khỏi 2D/3D. FE cần generate client lại từ contract đó trước khi dùng field mới.
- `docs/CURRENT_STATUS.md` của FE ghi lần rà soát source ngày 2026-10-19 nên cần cập nhật sau các commit mới.
- Customer source hiện có trang chủ, chọn chương trình theo rạp, danh sách/chi tiết phim, bắt đầu booking, chọn ghế local và OIDC login/callback. Trang cinema/showtime/account/history còn thiếu hoặc placeholder theo trạng thái đã ghi.
- Admin đã có quản lý phim/thể loại, rạp, phòng, seat catalog và editor sơ đồ ghế dạng table. Editor ma trận hiện lưu trong bộ nhớ; nút lưu/xuất bản chưa nối API.

## A0 — Đồng bộ trạng thái FE/API

### A0.1 — Rà soát source sau commit mới nhất

- Cập nhật `CURRENT_STATUS.md` theo source hiện tại, không chép nguyên trạng thái tháng 10.
- Đánh dấu riêng: có code, đã tích hợp API, đã kiểm tra thủ công, đã chạy automated checks.
- Xác nhận BE projection technology đã có trong runtime OpenAPI trước khi generate client.

### A0.2 — Chuẩn hóa generated API

- Chạy script generate hiện có trong `package.json` sau khi BE contract đã sẵn sàng.
- Đối chiếu request/response generated với controller/DTO BE.
- Cập nhật API inventory chỉ theo contract thật.

## A1 — Admin: Movie và screening versions

### A1.1 — Generate contract mới

- Generate API client chứa `projectionTechnology`.
- Xác nhận enum có STANDARD, IMAX, FOUR_DX, SCREEN_X theo OpenAPI BE.
- Không sửa tay generated models.

### A1.2 — Đổi editor phiên bản sang checkbox/ma trận

- Thay card lặp riêng cho từng phiên bản bằng UI checkbox gọn theo định dạng 2D/3D và công nghệ chiếu.
- Mặc định chọn Tiêu chuẩn × 2D.
- Chỉ hiển thị tổ hợp mà BE hỗ trợ; không tự sinh mọi tổ hợp.
- Không đưa IMAX/4DX vào nhóm định dạng hình ảnh.

### A1.3 — Giữ ngôn ngữ và ngữ nghĩa phiên bản

- Giữ cấu hình âm thanh, kiểu trình chiếu và phụ đề; không làm mất nhiều bản ngôn ngữ hợp lệ.
- Tạo phiên bản mới bằng request tạo/sửa phim lồng `screeningVersions`; không gọi POST phiên bản riêng sau khi lưu phim.
- Khi edit, giữ ID và `expectedVersion`; preserve active state; không sửa định nghĩa đã immutable.
- Chặn danh sách rỗng và duplicate theo toàn bộ cấu hình.

### A1.4 — Đồng bộ lựa chọn ở Admin Showtimes

- Hiển thị phiên bản đầy đủ như “IMAX · 2D”.
- Chỉ cho chọn phiên bản tương thích phòng nếu API cung cấp dữ liệu đó.
- Sau khi đổi phim/phòng/ngày, làm mới các lựa chọn phụ thuộc mà không giữ ID cũ không hợp lệ.

**Đầu ra A1:** tạo/sửa phim và tạo suất chiếu dùng cùng phiên bản do BE lưu.

## A2 — Admin: Room layout matrix persistence

**Phụ thuộc:** BE P2 có contract ma trận phòng ổn định và API client mới.

### A2.1 — Load document từ BE

- Tạo mapper DTO ↔ `SeatMatrixDocument`.
- Tải đúng dimensions, cell rỗng, ghế, số và seat type.
- Không chuyển sang seat catalog ordering hoặc geometry.

### A2.2 — Tạo draft và lưu ma trận

- Tạo draft 6×6 rỗng theo quy tắc đã duyệt.
- Gửi nguyên ma trận gồm hàng/cột rỗng và cell `null`.
- Gửi revision/expectedVersion nếu contract yêu cầu.

### A2.3 — Xuất bản và xử lý lỗi

- Chỉ xuất bản khi BE báo ma trận hợp lệ.
- Hiển thị lỗi theo hàng/cột/cell nếu API trả vị trí.
- Khi conflict, thông báo và yêu cầu tải lại; không tự ghi đè.
- Giữ cảnh báo rời trang khi có thay đổi chưa lưu.

### A2.4 — Nối room/seat summary

- Hiển thị trạng thái draft/published, sức chứa và loại ghế từ response.
- Giữ tách biệt seat catalog và layout matrix.

## A3 — Admin: Pricing và Showtime management

### A3.1 — Ổn định editor bảng giá

- Render time bands/ticket groups theo dữ liệu BE; không dùng 1, 2, 3 làm nhãn.
- Giữ ID khi sửa tên/giờ/thứ tự; hỗ trợ draft, publish, clone hoặc lookup theo API hiện có.
- Lookup modal là thông tin chỉ đọc; form nhập chỉ dùng khi đang sửa draft.
- Làm rõ trạng thái “Chưa nhập giá”, “Không áp dụng” và giá 0.

### A3.2 — Giữ đúng quy tắc ghế đôi

- Đơn vị giá ghế đôi là cả cặp.
- Cho phép giá khác nhau giữa nhóm vé, khung giờ và định dạng phim.
- Không tự đồng bộ/khóa giá ghế đôi và không thêm validation buộc đồng giá.
- Giá 2D và 3D được nhập độc lập.

### A3.3 — Danh sách và form suất chiếu

- Kết nối paging/filter theo API đã có.
- Tạo/sửa suất chiếu với phim + phiên bản, rạp/phòng, thời gian và bảng giá phù hợp.
- Hiển thị lỗi trùng lịch, phiên bản/phòng không tương thích và giá chưa cấu hình.
- Không thêm field giá cố định nếu giá được resolve từ pricing policy.

### A3.4 — Kiểm tra luồng publish

- Tách nút xuất bản khỏi thao tác lưu draft.
- Sau publish, cập nhật dữ liệu từ response và refresh query liên quan.
- Cancel/close modal không được đổi trạng thái draft/published trên danh sách.

## A4 — Admin: Booking, payment, users

### A4.1 — Booking operations

- Nối danh sách, filter và chi tiết booking với API hiện có.
- Hiển thị giá ghế và snapshot suất chiếu từ dữ liệu đã lưu, không tự tính lại.

### A4.2 — Payment và reconciliation

- Nối payment lookup/history/reconciliation theo endpoint còn tồn tại.
- BE đã loại refund APIs trong thay đổi gần đây; không hiển thị thao tác refund cho đến khi BE có contract được duyệt lại.

### A4.3 — User management

- Đối chiếu permission trước khi mở thao tác quản trị.
- Chỉ dùng API quản trị thực tế; không mở rộng endpoint profile khách thành API quản trị.

### A4.4 — Promotions

- Chỉ bắt đầu khi nghiệp vụ, quyền và API BE được xác nhận.
- Không để dữ liệu mẫu trở thành chương trình ưu đãi thật.

## U1 — User: Cinema và showtimes

### U1.1 — Trang danh sách và chi tiết rạp

- Kết nối API rạp/cụm rạp, hiển thị địa điểm và thông tin hợp lệ.
- Giữ phạm vi chương trình đã chọn khi chuyển giữa phim và rạp.

### U1.2 — Chọn ngày và suất chiếu

- Hiển thị suất chiếu theo rạp, phim, ngày và phiên bản chiếu.
- Dùng `projectionTechnology` + `contentFormat` từ BE để ghi nhãn.
- Xử lý ngày không có suất, lỗi tải, suất hết nhận khách và dữ liệu đổi trong lúc người dùng đang chọn.

## U2 — User: Seat selection và booking

**Phụ thuộc:** BE P2/P4 và Admin A2/A3 đã được tích hợp.

### U2.1 — Tải sơ đồ ghế suất chiếu

- Dùng snapshot layout và trạng thái ghế của chính suất chiếu.
- Giữ cell rỗng và các loại ghế; không suy ra từ seat catalog.

### U2.2 — Chọn/giữ/nhả ghế

- Hiển thị available/held/booked theo API Inventory.
- Xử lý giữ ghế thất bại, hết hạn, conflict và refresh trạng thái.
- Không coi local state là nguồn sự thật về availability.

### U2.3 — Quote và tạo booking

- Lấy giá từ API BE; giá ghế đôi hiển thị cho cả cặp.
- Gửi idempotency data nếu contract yêu cầu.
- Hiển thị tổng tiền, phí/ưu đãi chỉ khi contract trả về.

### U2.4 — Thanh toán và kết quả

- Khởi tạo payment và theo dõi kết quả theo flow hiện tại.
- Hỗ trợ pending, success, failure, cancel và quay lại từ payment provider.
- Trang xác nhận lấy booking/payment status mới nhất từ API.

## U3 — User: Account và lịch sử

### U3.1 — Hồ sơ

Source follow-up 2026-11-12: `/account` đã nối GET/PUT hồ sơ hiện tại, chỉ sửa
họ/tên/điện thoại; email chỉ đọc. Xem `USER_ACCOUNT_FLOW.md`. Chưa xác minh thao tác
lưu thực tế/browser nên chưa đánh dấu U3 hoàn tất.

- Kết nối profile qua OIDC/session hiện tại; không gửi mật khẩu trực tiếp từ Vue.
- Hiển thị lỗi 401/403 và session hết hạn.

### U3.2 — Lịch sử và chi tiết booking

- Paging danh sách booking của người dùng hiện tại.
- Tải chi tiết, vé, suất chiếu và trạng thái thanh toán từ API.
- Không cho đọc booking của user khác qua ID đoán được.

### U3.3 — Tùy chọn thông báo

- Để ngoài roadmap hiện tại vì R28 Notification đang hoãn.

## U4 — Hoàn thiện và xác minh FE

### U4.1 — Trạng thái giao diện

- Bổ sung/loading, empty, error, retry, conflict và permission-denied cho các luồng đã tích hợp.

### U4.2 — Accessibility và responsive

- Kiểm tra keyboard, focus, labels, live regions và contrast.
- Rà soát 390, 768, 1024 và 1440 px theo hướng dẫn FE hiện có.

### U4.3 — Đồng bộ tài liệu

- Cập nhật `CURRENT_STATUS.md`, API inventory, roadmap và thiết kế tham khảo sau mỗi nhóm hoàn tất.
- Ghi rõ browser/manual/automated checks nào đã chạy hoặc chưa chạy.

## Thứ tự tích hợp tổng thể

`A0 → A1 → BE P2 → A2 → A3 → U1 → U2 → U3 → A4 → U4`

Có thể audit A4/U3 song song với các giai đoạn khác, nhưng chỉ xây UI dựa trên API đã xác nhận. Đừng đánh dấu milestone hoàn tất nếu dữ liệu còn local-only hoặc chưa kiểm chứng theo tiêu chí của dự án.
