# Đăng ký và xác minh email

## Hợp đồng

Đối chiếu `AuthenticationRegistrationController`, `RegisterUserRequest`,
`ConfirmEmailVerificationRequest`, `PendingRegistrationConfirmationServiceImpl`
và generated client `authentication-registration-controller.ts`.

- `/register` gọi `register` → POST `/api/v1/auth/registrations`, nhận 202 và thông báo chung.
  Email bắt buộc; firstName, lastName, phoneNumber tùy chọn. Không gửi password.
  Giao diện không suy luận tài khoản đã tồn tại từ response hay địa chỉ email.
- `/verify-email#token=<token>` nhận token từ fragment. Trước khi tạo router history,
  token được chuyển vào bộ nhớ tạm và URL được thay bằng `/verify-email` (giữ query nếu có).
  Trang lấy token một lần, không lưu localStorage/sessionStorage, Pinia hoặc query/mutation cache.
  Đóng trang sẽ mất token; tải lại cần mở lại liên kết từ email.
- Đặt mật khẩu: ít nhất 12 ký tự, không trắng, không quá 72 byte qua TextEncoder UTF-8;
  xác nhận phải trùng. Không trim mật khẩu gửi đi.
- `confirmEmail({ token, password })` nhận 204: xóa dữ liệu nhạy cảm khỏi form,
  hiển thị thành công và nút đăng nhập; không tự tạo phiên đăng nhập.
- Lỗi từ BE hiện thông báo chung, không phân biệt token sai/hết hạn/đã dùng.
  Không thêm endpoint hoặc nút gửi lại email. Public API không kích hoạt refresh/OIDC
  khi trả 401; các API được bảo vệ vẫn giữ xử lý phiên hiện tại.
- Nút đăng nhập gọi `beginSignIn('/')`: User Service xử lý đăng nhập thường/Google,
  Authorization Code + PKCE giữ nguyên. FE không gọi Google trực tiếp và không có secret.

## Kiểm tra thủ công

1. Mở `/register`, thử email trống/sai định dạng; optional fields có thể để trống.
2. Điền `dinhquanghuydt@gmail.com`, gửi một lần. Network phải là POST registrations,
   payload không có password, thành công 202. UI yêu cầu kiểm tra hộp thư, không nói
   tài khoản mới/cũ. Không tự đăng ký hay tạo dữ liệu trong quá trình kiểm tra tĩnh.
3. Mở email thật, bấm liên kết. Thanh địa chỉ phải mất `#token=...` ngay khi FE khởi tạo.
   Token không xuất hiện trong route hiện tại, OIDC returnTo, console hoặc storage.
4. Thử mật khẩu dưới 12 ký tự, xác nhận khác nhau, và chuỗi Unicode trên 72 byte:
   không có POST confirm. Thử mật khẩu hợp lệ, giữ nguyên ký tự đã nhập khi gửi.
5. Confirm thành công 204: hiện thông báo xác minh thành công; không gọi signin tự động,
   không có access token do API xác minh cấp. Bấm Đăng nhập để mở User Service.
6. Mở lại token đã dùng, token sai đúng 43 ký tự hoặc token hết hạn: API trả lỗi chung;
   UI hiển thị lỗi, không tự chuyển đăng nhập, không gọi endpoint resend.
7. Mở `/verify-email` không có fragment hoặc reload sau khi fragment đã xóa: thông báo
   thiếu/liên kết không hợp lệ; hướng dẫn mở lại email. Không có POST tự động.
8. Đăng nhập thường bằng email/mật khẩu đã đặt trên trang BE. Kiểm tra callback trở về FE.
9. Bấm Đăng nhập, chọn Google trên trang BE khi cấu hình Google OIDC đã bật.
   OAuth redirect/code exchange đi qua User Service; FE tiếp tục PKCE, không có Google secret.
10. Kiểm tra mobile, focus bàn phím, submit liên tiếp không gửi trùng trong lúc chờ.

Không sửa generated/BE, không kết nối DB, không gửi email hay tạo tài khoản trong kiểm tra
tĩnh. Không chạy test, build hoặc typecheck nếu chưa được yêu cầu riêng.
