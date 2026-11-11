# Luồng đặt vé USER

## Phạm vi đã nối

- `/booking/:showtimeId`: chọn ghế, xác nhận báo giá hiện có, gửi tạo đơn.
- `/account/bookings`: phân trang đơn của tài khoản đăng nhập.
- `/account/bookings?bookingId=<UUIDv7>`: chi tiết đơn, giá/ghế đã lưu, trạng thái và hạn giữ ghế.
- Theo dõi PENDING/RESERVED mỗi 3 giây khi trang chi tiết đang mở; không tự gửi lại mutation.
- Hủy có xác nhận, chỉ bật cho RESERVED còn hạn; BE quyết định kết quả cuối cùng.

## Hợp đồng đã đối chiếu

Đọc source cục bộ `cinema-system` (không sửa BE):

- `BookingController`: POST/GET `/api/v1/bookings`, GET `/{bookingId}`, POST `/{bookingId}/cancel`.
- `CreateBookingRequest`, `BookingResponse`, `BookingServiceImpl`: clientRequestId theo user và fingerprint request, expectedTotalAmount; tạo trả HTTP 202.
- `BookingCancellationServiceImpl`, `Booking.cancel`: chỉ RESERVED, chưa đến expiresAt.
- `BookingSecurityConfig`: booking cá nhân yêu cầu xác thực; dữ liệu được giới hạn theo CurrentUser.
- `PaymentManagementController`, `PaymentSecurityConfig`: chưa có luồng thanh toán checkout dành cho USER.

Dùng generated client có sẵn, kiểm tra response ở feature và query key có subject. Không gửi userId từ UI để chọn chủ sở hữu đơn.

## Gửi tạo đơn và phục hồi

Lưu request đang gửi trong sessionStorage theo subject/suất chiếu. Khóa chọn ghế khi chờ kết quả; khi lỗi mạng, 5xx hoặc response không xác nhận được, giữ nguyên clientRequestId và payload để retry. Không tự tạo mã mới. Khi reload cùng tab, người dùng có thể gửi lại cùng yêu cầu. Lỗi validation xác định cho phép chọn lại ghế.

SessionStorage chỉ giúp phục hồi trong cùng tab; nếu mất bộ nhớ phiên, cần kiểm tra Vé của tôi trước khi đặt lại. Trang danh sách đọc booking từ BE, không coi lựa chọn local là ghế đã giữ.

## Giới hạn

- Chưa có API USER thanh toán/checkout URL nên không thêm thanh toán mô phỏng hoặc đánh dấu vé đã thanh toán ở FE.
- Chưa có QR/vé điện tử từ API; CONFIRMED chỉ được hiển thị theo trạng thái BE.
- Danh sách/chi tiết dùng mã suất từ booking; không suy đoán tên phim/rạp hoặc gọi N API bổ sung cho từng đơn.
- UI tiếp tục dùng design tokens và bố cục customer hiện có; không sao chép dữ liệu demo hoặc quy tắc giữ ghế cố định của reference.

## Kiểm tra thủ công

1. Đăng nhập USER, chọn suất đang mở bán, chọn ghế và chờ báo giá hợp lệ.
2. Xác nhận đặt vé; kiểm tra POST một lần và chuyển sang chi tiết đơn.
3. Kiểm tra PENDING chuyển sang RESERVED/REJECTED theo xử lý BE; không báo thành công chỉ vì HTTP 202.
4. Ngắt mạng khi gửi rồi gửi lại/reload cùng tab: giữ cùng clientRequestId và payload, không tạo đơn thứ hai.
5. Mở Vé của tôi, phân trang và chi tiết; đăng xuất/đổi tài khoản không hiển thị đơn tài khoản trước.
6. Hủy đơn RESERVED còn hạn: mở xác nhận, giữ đơn hoặc hủy; kiểm tra CANCELLED từ BE. CONFIRMED/EXPIRED không có nút hủy khả dụng.
7. Kiểm tra lỗi tranh chấp ghế/giá, hết hạn và dữ liệu không hợp lệ; không tự xác nhận hoặc tự thanh toán.
8. Kiểm tra desktop/mobile và thao tác bàn phím trong hộp thoại.

Chỉ kiểm tra cú pháp/static trong lần triển khai; chưa chạy test, build/typecheck hoặc kiểm tra browser/runtime.
