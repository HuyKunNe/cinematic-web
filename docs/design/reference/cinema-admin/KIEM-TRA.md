# Ghi nhận kiểm tra

## Đã chạy đạt

- `node --check assets/js/data.js` và `node --check assets/js/app.js`.
- `node tests/verify.cjs`: **999 điều kiện kiểm tra đạt**, dùng Node VM và dữ liệu/biểu mẫu kiểm tra; không phải bài kiểm tra trình duyệt.
- `python3 tests/audit.py`: **319 kiểm tra tĩnh đạt**, gồm tên truy cập của nút, nhãn trường, alt ảnh, ID trùng, tệp phụ thuộc, SVG hợp lệ và các trang đã được triển khai.

Các trường hợp chính:

- Mỗi phòng có cụm rạp hợp lệ; phiên bản phim phù hợp định dạng phòng.
- 384 suất mẫu không xung đột, có bảng giá hợp lệ và nằm sau ngày khởi chiếu.
- Ghế trên vé tồn tại và đúng hạng; không có hai đơn hiệu lực cùng giữ một vị trí trong cùng suất.
- Tổng đơn bằng vé + sản phẩm − giảm giá; số tiền giao dịch khớp đơn.
- Khuyến mãi trong đơn mẫu phù hợp loại phòng và ngưỡng đơn.
- 16 trang kết xuất được mà không có giá trị `undefined` hoặc `NaN`.
- Các nhóm báo cáo và tổng từng cụm cộng lại khớp doanh thu toàn hệ thống.
- Khoảng nghỉ được tính vào xung đột; đúng thời điểm hết khoảng nghỉ có thể bắt đầu suất tiếp; xung đột qua nửa đêm bị chặn.
- Phòng bảo trì, định dạng không hỗ trợ, bảng giá bản nháp bị chặn khi tạo suất.
- Bảng giá lễ có thể chọn trực tiếp theo suất.
- Tra giá 16:59 và đúng 17:00 chọn hai khung khác nhau; 3D dùng giá độc lập.
- Ô trống, không áp dụng và giá 0 có ba kết quả khác nhau.
- Vé chưa trả tiền không check-in; vé đã sử dụng không check-in lần nữa.
- Soát vé và dữ liệu vận hành bị giới hạn theo cụm rạp phụ trách.
- Thêm/sửa cụm rạp, tạo phòng có sơ đồ, chặn mã rạp trùng và bảo trì khi còn mở bán.
- Tạo đơn tại quầy lưu đúng giá, giữ ghế, chặn đặt trùng và xác nhận đơn khi thanh toán thành công.
- Giữ ghế quá hạn hủy đơn chờ, hết hạn giao dịch và giải phóng vị trí.

Bài kiểm tra dùng bản sao dữ liệu trong bộ nhớ; không thay đổi dữ liệu khởi tạo đi kèm ứng dụng. Số bản ghi tăng trong bài kiểm tra là do các trường hợp thử tạo mới.

## Chưa xác nhận

Môi trường xem thử trả lỗi thiếu bộ điều phối preview, nên chưa kiểm tra bằng trình duyệt thực. Không có ảnh chụp hoặc kết quả kiểm tra responsive thực tế để khẳng định độ chính xác hiển thị.

Nên kiểm tra thủ công trên máy dùng ứng dụng:

1. Mở `index.html` trực tiếp, đi qua từng phân hệ rồi thử nút Quay lại/Tiến.
2. Đổi cụm rạp, tìm kiếm, đổi trang và mở/sửa bản ghi.
3. Tạo bảng giá 2D/3D đầy đủ; thử 0, không áp dụng và để trống.
4. Tạo suất trùng lịch, sau đó đổi giờ hợp lệ và lưu.
5. Chọn Phòng 03 ở Đà Nẵng để chỉnh sơ đồ chưa mở bán.
6. Tạo đơn, thanh toán mô phỏng, tra vé và check-in; thử lặp lại.
7. Xuất CSV, mở tệp bằng phần mềm bảng tính và đối chiếu tổng trên màn hình.
8. Đóng/mở lại để kiểm tra localStorage; thử các vai trò mô phỏng.
9. Kiểm tra ở chiều rộng 1440px, 1024px và 390px, dùng Tab/Enter/Escape, cuộn bảng ngang khi cần.
