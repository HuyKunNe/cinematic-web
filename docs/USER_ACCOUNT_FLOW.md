# Hồ sơ USER

Trang `/account` đọc và cập nhật hồ sơ bằng generated current-user-controller.
Đối chiếu BE `CurrentUserController`, `UpdateCurrentUserProfileRequest`,
`CurrentUserProfileResponse`, `UserProfileServiceImpl` và security: `/users/me`
yêu cầu xác thực, user ID lấy từ phiên BE, không lấy từ payload FE.

- GET `/api/v1/users/me`: kiểm tra response id khớp subject; query key chứa owner.
- PUT cùng endpoint: chỉ firstName/lastName tối đa 100 ký tự và phoneNumber tối đa
  32 ký tự. Gửi đủ ba trường, trim nội dung; giá trị trống được BE chuyển thành null.
- Email chỉ đọc, hiển thị trạng thái xác minh theo emailVerifiedAt. Không thay email,
  username, role, mật khẩu hay gửi userId. Không thêm ngày sinh từ reference demo.
- UI theo accountPage Lumière: nav tài khoản dùng chung, panel form, họ/tên hai cột
  trên desktop và một cột trên mobile; loading/error/retry/pending/success/focus.
- Response lưu thành công cập nhật query cache và tên ở tiêu đề. Không tự sửa OIDC claims.
- Khi đang nhập, không tự refetch khi focus/reconnect; khóa nút tải lại để tránh
  ghi đè bản nháp. Hoàn tác dùng bản hồ sơ đã tải. Lưu lỗi giữ bản nháp để sửa/thử lại.
- Khóa submit lặp và rời route khi đang gửi; đổi owner không tái sử dụng form cũ.
- Đăng xuất giữ luồng OIDC hiện có. Không kết nối database, không sửa generated/BE.

## Kiểm tra thủ công (chưa chạy)

1. Đăng nhập tài khoản đã xác minh, mở `/account`: GET /me, tên/email/điện thoại khớp BE.
2. Thay họ/tên/điện thoại, kiểm tra dirty, Hoàn tác, Lưu thay đổi. PUT chỉ ba trường;
   response thành công mới hiện thông báo đã lưu; reload đối chiếu persistence.
3. Xóa một trường tùy chọn để lưu rỗng; xác nhận các trường khác giữ nguyên.
4. Thử vượt giới hạn và dữ liệu lỗi từ API; không báo thành công khi save thất bại.
5. Thử mạng chậm/submit liên tục, 401/403, reload/retry; giữ dữ liệu đang nhập khi lỗi.
6. Đổi tài khoản: cache/form của owner trước không được hiển thị cho owner mới.
7. Kiểm tra desktop/mobile, label/focus bàn phím, email readonly và nút disabled.

Kiểm tra triển khai chỉ gồm cú pháp/import/CSS/diff; chưa gửi mutation hoặc quan sát
trình duyệt. Không chạy test/build/typecheck.
