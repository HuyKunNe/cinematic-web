# Luồng đặt vé USER

## Phạm vi đã nối

Sau tạo đơn, trang chi tiết theo dõi status từ BE và có phần phim/rạp/phòng/suất.
Metadata được đọc bằng context query chỉ ở chi tiết đơn của owner đã xác minh;
không gọi bổ sung cho từng item của danh sách. Không poll metadata; query trạng thái
booking vẫn poll PENDING/RESERVED. Đồng hồ giữ ghế dùng scheduler 1 giây.
Đơn REJECTED/CANCELLED/EXPIRED có liên kết chọn suất khác khi dữ liệu trạng thái
đã tải thành công. Không thêm thao tác đặt lại cho PENDING/RESERVED hoặc kết quả
thanh toán chưa rõ. Thông tin phim/rạp là dữ liệu hiện tại, không giả làm snapshot
lịch sử; ghế, tiền, đơn vị và trạng thái giữ nguyên từ booking response.

- `/booking/:showtimeId`: chọn ghế, xác nhận báo giá hiện có, gửi tạo đơn.
- `/account/bookings`: phân trang đơn của tài khoản đăng nhập.
- `/account/bookings?bookingId=<UUIDv7>`: chi tiết đơn, giá/ghế đã lưu, trạng thái và hạn giữ ghế.
- Theo dõi PENDING/RESERVED mỗi 3 giây khi trang chi tiết đang mở; không tự gửi lại mutation.
- Hủy có xác nhận, chỉ bật cho RESERVED còn hạn; BE quyết định kết quả cuối cùng.

## Hợp đồng đã đối chiếu

Ghế được đọc qua generated client `getShowtimeSeatMap` từ
`GET /api/v1/showtimes/{showtimeId}/seat-map`. Kiểm tra đúng room/showtime,
mã ghế không trùng và dữ liệu hợp lệ trước khi hiển thị. Chỉ cho chọn ghế có
`selectable: true`, trạng thái AVAILABLE, showSeatId và giá VND hợp lệ.
Giữ nguyên API báo giá và tạo booking; lựa chọn chưa phải là giữ ghế.
Suất thiếu snapshot hiển thị lỗi, không lấy sơ đồ hiện tại của phòng để thay thế.

Đăng ký và xác minh email đã nối User Service tại `/register` và `/verify-email`;
xem `USER_REGISTRATION_FLOW.md`. Đăng ký không gửi mật khẩu; mật khẩu chỉ gửi
cùng token ở bước xác minh. Đăng nhập vẫn chuyển qua User Service bằng OIDC + PKCE.

Đọc source cục bộ `cinema-system` (không sửa BE):

- `BookingController`: POST/GET `/api/v1/bookings`, GET `/{bookingId}`, POST `/{bookingId}/cancel`.
- `CreateBookingRequest`, `BookingResponse`, `BookingServiceImpl`: clientRequestId theo user và fingerprint request, expectedTotalAmount; tạo trả HTTP 202.
- `BookingCancellationServiceImpl`, `Booking.cancel`: chỉ RESERVED, chưa đến expiresAt.
- `BookingSecurityConfig`: booking cá nhân yêu cầu xác thực; dữ liệu được giới hạn theo CurrentUser.
- `PaymentManagementController`, `PaymentSecurityConfig`: chưa có luồng thanh toán checkout dành cho USER.

Dùng generated client có sẵn, kiểm tra response ở feature và query key có subject. Không gửi userId từ UI để chọn chủ sở hữu đơn.

## Gửi tạo đơn và phục hồi

### Quy tắc vị trí ghế

- Chọn đúng một đơn vị ghế được phép đứng riêng; ghế đôi vẫn là đơn vị nguyên cặp.
- Cho phép chọn nhiều hàng. Trong từng hàng, các đơn vị đã chọn phải liền nhau
  theo row/column/span thực tế, không bắt buộc các hàng chọn cùng số ghế.
- Nếu cả đơn chọn nhiều ghế, không hàng nào được chỉ chọn một ghế đơn đứng riêng.
  G6 + F8 không hợp lệ; G6 + G7 + F8 vẫn lỗi tại F8. Thêm F9 để mỗi hàng thành
  cụm liền kề rồi tiếp tục kiểm tra ghế trống đơn còn lại. Ghế đôi nguyên cặp có
  hai chỗ không tính là một ghế đơn đứng riêng.
  Không nối qua lối đi, ô trống hay ghế không khả dụng; không suy từ nhãn/số ghế.
- Trong dải ghế đang khả dụng chứa lựa chọn, không được để lại đúng một ghế đơn
  ở đầu hoặc cuối. Một đơn vị ghế đôi còn lại không coi là một ghế đơn.
- Dải có bốn ghế trống 1–4: chọn 2–3 không hợp lệ, chọn 1–2 hoặc 3–4 hợp lệ;
  1–3–5 không hợp lệ; một ghế bất kỳ hợp lệ.
- Có thể tạm chọn một cấu hình chưa hợp lệ để bổ sung/bỏ ghế. Hiện lý do và khóa
  Tiếp tục; không quote hoặc tạo booking trước khi sửa. Kiểm tra lại sau quote
  và khi snapshot cập nhật; review đang mở sẽ đóng nếu phát sinh vi phạm.
- Ghế đơn đã bị cô lập ở dải khác trước đó không chặn lựa chọn hiện tại.
  Sơ đồ legacy thiếu vị trí không cho kiểm tra nhiều ghế, UI thông báo chọn suất khác.
- Đây là kiểm tra tại FE theo yêu cầu; không sửa quy tắc hoặc dữ liệu BE.

Kiểm tra thủ công: các ví dụ trên với một dải bốn ghế; thêm ghế để lấp khoảng trống;
bỏ ghế giữa cụm; lối đi; ghế BOOKED/HELD; ghế đôi; nhiều hàng đều hợp lệ hoặc chỉ
một hàng vi phạm thì chặn toàn bộ lựa chọn; G6 + F8 phải báo lỗi, chỉ G6 được phép;
ghế đôi nguyên cặp; snapshot thay đổi
trong lúc review. Bill vẫn tính ngay, không gọi quote chỉ vì chọn/bỏ ghế.

Bill cộng/trừ ngay giá từ snapshot ghế, cùng nguồn với giá theo loại ghế.
Không gọi quote khi chọn/bỏ ghế, không debounce hoặc giữ Bill của lựa chọn cũ.
Ghế đôi tính giá cả cặp một lần. Bill là tạm tính; chỉ khi bấm
“Tiếp tục · Kiểm tra đơn” mới gọi quote và chờ API trả về trước khi mở hộp thoại.
Đối chiếu showtime và tập ghế sau response; không xác nhận nếu lựa chọn đã đổi.
POST booking vẫn dùng expectedTotalAmount từ quote BE. Giữ refresh snapshot nền
để kiểm tra availability, không tự gọi lại quote khi focus/reconnect.
Kiểm tra thủ công: mở Network, chọn/bỏ nhiều ghế phải không có request quote;
bấm Tiếp tục mới có một quote. Thử mạng chậm, lỗi quote, giá thay đổi,
ghế bị người khác giữ và hủy review để quay lại chọn.

Từ sơ đồ, bấm “Tiếp tục · Kiểm tra đơn” để mở hộp thoại kiểm tra phim, rạp,
phòng, suất, ghế và giá từng vé. Hộp thoại dùng báo giá API, chưa gửi mutation.
“Quay lại chọn ghế” hoặc đóng hộp thoại giữ nguyên lựa chọn; chỉ “Xác nhận đặt vé”
mới tạo yêu cầu. Khi ghế hoặc giá thay đổi trong lúc xem lại, đóng hộp thoại và
yêu cầu kiểm tra lại; khi đang làm mới dữ liệu, tạm khóa xác nhận.
Response tạo đơn được lưu vào cache detail theo user; chuyển đến chi tiết đơn
để theo dõi trạng thái PENDING/RESERVED. Nếu điều hướng không thành công,
giữ liên kết tới đúng đơn vừa tạo và không cho gửi thêm một yêu cầu mới.

Lưu request đang gửi trong sessionStorage theo subject/suất chiếu. Khóa chọn ghế khi chờ kết quả; khi lỗi mạng, 5xx hoặc response không xác nhận được, giữ nguyên clientRequestId và payload để retry. Không tự tạo mã mới. Khi reload cùng tab, người dùng có thể gửi lại cùng yêu cầu. Lỗi validation xác định cho phép chọn lại ghế.

SessionStorage chỉ giúp phục hồi trong cùng tab; nếu mất bộ nhớ phiên, cần kiểm tra Vé của tôi trước khi đặt lại. Trang danh sách đọc booking từ BE, không coi lựa chọn local là ghế đã giữ.

## Giới hạn

- Chưa có API USER thanh toán/checkout URL nên không thêm thanh toán mô phỏng hoặc đánh dấu vé đã thanh toán ở FE.
- Chưa có QR/vé điện tử từ API; CONFIRMED chỉ được hiển thị theo trạng thái BE.
- Danh sách dùng mã suất từ booking, không gọi N API bổ sung cho từng đơn. Chi tiết
  đọc metadata của một suất qua API hiện có và ghi rõ thông tin phim/rạp hiện tại.
- UI tiếp tục dùng design tokens và bố cục customer hiện có; không sao chép dữ liệu demo hoặc quy tắc giữ ghế cố định của reference.

## Kiểm tra thủ công

### Đối chiếu giao diện Lumière

- Danh sách Vé & giao dịch dùng sidebar tài khoản và các hàng đơn ngang theo
  `ticketsPage`/`orderCard` trong reference; giữ phân trang API hiện có.
- Chi tiết dùng phần trạng thái căn giữa theo `resultPage`, hai cột theo
  `orderPage`: thông tin suất/ghế bên trái, thông tin đơn/tổng tiền bên phải.
  Mobile xếp thành một cột; hành động và giá trong hàng đơn xuống dưới.
- Giá từng ghế và tổng tiền lấy từ đơn đã lưu. Thông tin phim/rạp tải riêng;
  lỗi metadata có nút thử lại và không che thông tin đơn.
- Khác reference: danh sách dùng ảnh dự phòng và tên chung “Đơn đặt vé” vì
  response chưa có tên/poster phim; không gọi thêm API cho từng hàng. Không
  dựng tab Sắp xem/Đã xem, QR, phương thức thanh toán hoặc thông tin liên hệ
  khi API chưa cung cấp. Giữ luồng hủy và polling trạng thái thật của BE.
- Kiểm tra thêm ở desktop/mobile: hàng đơn có mã dài, nhiều ghế, tổng tiền chưa
  xác định; mở chi tiết, lỗi tải metadata, các trạng thái đơn và hộp thoại hủy.

1. Đăng nhập USER, chọn suất đang mở bán, chọn ghế và kiểm tra Bill tạm tính cập nhật ngay.
2. Xác nhận đặt vé; kiểm tra POST một lần và chuyển sang chi tiết đơn.
3. Kiểm tra PENDING chuyển sang RESERVED/REJECTED theo xử lý BE; không báo thành công chỉ vì HTTP 202.
4. Ngắt mạng khi gửi rồi gửi lại/reload cùng tab: giữ cùng clientRequestId và payload, không tạo đơn thứ hai.
5. Mở Vé của tôi, phân trang và chi tiết; đăng xuất/đổi tài khoản không hiển thị đơn tài khoản trước.
6. Hủy đơn RESERVED còn hạn: mở xác nhận, giữ đơn hoặc hủy; kiểm tra CANCELLED từ BE. CONFIRMED/EXPIRED không có nút hủy khả dụng.
7. Kiểm tra lỗi tranh chấp ghế/giá, hết hạn và dữ liệu không hợp lệ; không tự xác nhận hoặc tự thanh toán.
8. Kiểm tra desktop/mobile và thao tác bàn phím trong hộp thoại.

Chỉ kiểm tra cú pháp/static trong lần triển khai; chưa chạy test, build/typecheck hoặc kiểm tra browser/runtime.
