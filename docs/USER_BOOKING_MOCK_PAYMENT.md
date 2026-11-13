# Test booking/payment bằng Mock provider của BE

## Cấu hình

FE dev có lựa chọn **Mock provider · Test** khi `.env.local` chứa:

```dotenv
VITE_PAYMENT_MOCK_ENABLED=true
```

Cờ chỉ có hiệu lực khi `import.meta.env.DEV` là true. Production không hiển thị
lựa chọn này, kể cả khi đặt biến VITE thành true. `.env.example` mặc định tắt.
Nếu Vite đang chạy, khởi động lại bằng script `npm.cmd run dev` để nạp cấu hình.

Runtime của **Payment Service** cần cấu hình:

```dotenv
PAYMENT_PROVIDER=MOCK
```

Source `application.yml` hiện mặc định MOCK nếu không có biến ghi đè. Chưa xác
minh cấu hình BE đang chạy; nếu cần thay đổi, người dùng cấu hình và khởi động lại
Payment Service. Lượt tích hợp FE này không sửa repo/config/runtime BE hoặc database.
Các service, outbox và consumer của luồng giữ ghế/payment phải hoạt động bình thường.

## Cách test

1. Đăng nhập USER, mở suất đang bán, chọn ghế hợp lệ và bấm Tiếp tục.
2. Tại trang checkout, chọn Mock provider · Test (được chọn sẵn khi bật cờ dev),
   kiểm tra giá, chọn checkbox và bấm Thanh toán.
3. Trong Network, POST `/api/v1/bookings` vẫn chứa clientRequestId, showtimeId,
   seats với ticketGroupId và expectedTotalAmount thật. **Không có paymentProvider**;
   không gửi chuỗi MOCK/BACKEND_DEFAULT vào enum generated VNPAY/MOMO.
4. FE chuyển sang đơn đã tạo, đọc trạng thái booking/payment. Mock hoàn tất nội
   bộ nên không có checkoutUri và không cần mở cổng ngoài. FE không tạo intent
   tự mở URI khi chọn lựa chọn test; nếu cấu hình BE sai sẽ không tự mở provider khác.
5. Payment đi tới SUCCEEDED, booking tới CONFIRMED theo xử lý sự kiện BE; UI mở
   result, sau đó Xem vé. Polling có thể bỏ qua các trạng thái trung gian diễn ra nhanh.
6. Reload hoặc mất kết nối khi gửi: giữ cùng request và clientRequestId để retry;
   không đổi provider/payload của yêu cầu đã gửi. Kiểm tra Vé & giao dịch trước khi đặt lại.

## Contract và giới hạn

Đã đọc `MockPaymentProvider`, `PaymentRequestedConsumerServiceImpl` và
`DefaultPaymentRequestedOutboxFactory` trong source BE hiện tại. Booking không
chỉ định provider tạo event có paymentProvider null; Payment Service lấy
`cinema.payment.provider`. Mock adapter được đăng ký khi provider=MOCK và
`initiateCharge` trả succeeded với reference xác định theo idempotency key.
`GET /api/v1/payments/bookings/{bookingId}/checkout` vẫn là API đọc thật của owner.

- Đây là mock adapter của BE, không phải dữ liệu MSW/mock hoặc thành công giả của FE.
- Mock hiện chỉ trả thành công tự động. Chưa có API lựa chọn failed/timeout/unknown;
  không thêm endpoint, nút ép kết quả hoặc sửa generated client để giả các kịch bản đó.
- Đơn/seats/payment vẫn do BE lưu và xử lý. Không có QR/used status mới được tạo.
- Không đổi MySQL hoặc kết nối database từ FE. Không test bằng giao dịch cổng thật.

Chưa thực hiện booking/payment runtime trong lượt này; chỉ kiểm tra cú pháp/static.
Không chạy test, lint, typecheck hoặc build.
