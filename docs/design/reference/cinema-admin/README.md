# Lumière Cinema — Bộ giao diện quản trị

Bản minh họa HTML/CSS/JavaScript chạy hoàn toàn trên trình duyệt, với thương hiệu và chính sách giả định. Không cần backend, tải thư viện ngoài hoặc chạy build.

## Mở ứng dụng

1. Giải nén toàn bộ thư mục `cinema-admin`.
2. Mở `index.html` bằng Chrome, Edge, Firefox hoặc Safari phiên bản hiện đại.
3. Giữ nguyên vị trí thư mục `assets` cạnh `index.html`.

Điều hướng dùng hash (`#movies`, `#shows`, `#pricing`…), có hỗ trợ nút Quay lại/Tiến của trình duyệt. Ứng dụng cũng chạy được khi phục vụ bằng máy chủ tĩnh thông thường.

## Thao tác thử nhanh

- **Tổng quan:** đổi khoảng ngày và phạm vi cụm rạp để xem số liệu thay đổi; xuất CSV.
- **Phim:** tìm kiếm, lọc và thêm phim; thêm nhiều phiên bản 2D/3D cùng ngôn ngữ/phụ đề. Sửa dữ liệu bằng biểu tượng cây bút.
- **Cụm rạp:** xem ba tab Tổng quan, Phòng chiếu, Tiện ích; số phòng và sức chứa được tính từ các phòng thực tế.
- **Phòng & sơ đồ ghế:** chọn tab Sơ đồ ghế → `Đà Nẵng Coast · Phòng 03` để thử chỉnh một sơ đồ chưa có lịch bán vé. Chọn nhiều vị trí, chọn hạng và áp dụng. Có thể chọn cả hàng từ một vị trí trong hàng. Các sơ đồ có suất mở bán hoặc đơn còn hiệu lực bị khóa.
- **Lịch chiếu:** đổi giữa danh sách và lịch 24 giờ theo phòng; lọc ngày, phim, phòng và định dạng. Khi tạo hoặc sao chép suất, chương trình kiểm tra trùng lịch, khoảng nghỉ, ngày khởi chiếu, tình trạng phòng, định dạng và bảng giá. Có tính cả xung đột qua nửa đêm.
- **Chính sách vé:** tạo bảng giá qua bốn bước. Ở bước 3, chọn định dạng và khung giờ trước khi nhập. Mỗi ô có lựa chọn Nhập giá hoặc Không áp dụng. Ô trống là thiếu giá; số 0 là miễn phí. Bảng giá thiếu chỉ được lưu bản nháp.
- **Tra giá:** nút Tra giá trong danh sách bảng giá cho phép chọn rạp, loại phòng, định dạng, giờ, hạng ghế và đối tượng. Thử `16:59` và `17:00` để thấy đúng ranh giới khung giờ.
- **Đơn đặt vé:** Tạo đơn tại quầy → chọn suất → chọn ghế và đồ ăn → tạo đơn chờ thanh toán. Giá được chụp lại trên vé và các dòng sản phẩm. Đơn giữ ghế theo số phút trong Cài đặt; hết hạn được xử lý khi mở ứng dụng và mỗi 30 giây khi ứng dụng đang mở.
- **Thanh toán:** từ chi tiết đơn, chọn Mô phỏng thanh toán; sau đó chọn kết quả thành công, thất bại hoặc hết hạn. Chi tiết giao dịch có mã tham chiếu, số tiền và mốc thời gian. Giao dịch cần kiểm tra chỉ được xác nhận đối chiếu khi đơn và tiền khớp.
- **Kiểm soát vé:** nhập `VE-DEMO` hoặc `DH-DEMO`. Đây là vé hợp lệ cho suất hôm nay tại Sài Gòn Centre. Xác nhận một lần rồi tra lại để thấy trạng thái Đã sử dụng. Khu vực QR chỉ mô phỏng, không truy cập camera.
- **Đồ ăn & combo:** thêm/sửa sản phẩm, giá, trạng thái, phạm vi bán. Combo chọn thành phần và số lượng. Không có dữ liệu tồn kho giả.
- **Khuyến mãi:** tạo chương trình với phạm vi, thời gian, loại phòng, định dạng, đối tượng, ngưỡng đơn, giới hạn, giảm tối đa và khả năng kết hợp. Mã hợp lệ có thể dùng khi tạo đơn tại quầy. Giá vé cao cấp và giường nằm không giảm theo đối tượng trong dữ liệu mẫu.
- **Khách hàng:** xem lịch sử đơn, chi tiêu trong phạm vi đang chọn và điểm từ chi tiêu khi bật thành viên.
- **Nhân viên & quyền:** chuyển tài khoản mô phỏng ở góc trên bên phải để thử quản lý rạp, bán vé và soát vé. Quyền được kiểm tra trước mỗi thao tác. Quản trị hệ thống có thể chỉnh ma trận quyền của các vai trò khác; quyền quản trị được bảo vệ.
- **Báo cáo:** nhóm theo ngày, phim, cụm rạp hoặc loại phòng; biểu đồ kèm bảng. Xuất CSV UTF-8 theo kỳ và cụm rạp đang chọn, số tiền là số nguyên VNĐ.
- **Cài đặt:** thông tin thương hiệu, logo, múi giờ `Asia/Ho_Chi_Minh`, giữ ghế, khoảng nghỉ và bật điểm thành viên. Khôi phục dữ liệu mẫu yêu cầu nhập `KHÔI PHỤC` để tránh bấm nhầm.
- **Nhật ký:** các lần tạo, sửa, thanh toán, soát vé và xuất báo cáo được ghi cùng người thao tác và thời gian.

## Dữ liệu và cách tính

Dữ liệu khởi tạo gồm **3 cụm rạp, 10 phòng, 8 phim, 384 suất và 211 đơn**. Ngày mẫu được tạo tương đối so với ngày mở ứng dụng lần đầu, theo múi giờ TP. Hồ Chí Minh. Sau một thời gian, có thể khôi phục dữ liệu mẫu để có lại lịch và vé thử cho ngày hiện tại.

- Bộ chọn cụm rạp áp dụng cho dữ liệu vận hành liên quan. Phim, hồ sơ khách hàng và cài đặt thương hiệu có thông tin dùng chung; giao diện ghi rõ phạm vi của form.
- Tài khoản chỉ thấy các cụm được phân công. Bản ghi áp dụng nhiều cụm ngoài phạm vi của quản lý rạp cần quản trị hệ thống sửa.
- Vé bán tính theo **đơn vị đặt chỗ**. Một ghế đôi hoặc một giường là một đơn vị, có hai chỗ.
- Doanh thu thực thu là tổng tiền các đơn **đã xác nhận và thanh toán thành công**, sau giảm giá, gồm cả đồ ăn. Phân bổ theo phim/cụm/loại phòng của đơn; không tách giảm giá theo từng dòng sản phẩm.
- Lấp đầy = số chỗ đã bán / tổng sức chứa của các suất chưa hủy trong kỳ. Ngày lọc doanh thu/đơn là ngày tạo đơn; ngày tính sức chứa là ngày chiếu. Vì vậy hai tập ngày có ý nghĩa khác nhau và được ghi rõ trên màn hình.
- So sánh chỉ số dùng khoảng ngày liền trước với cùng độ dài. Chưa có số liệu kỳ trước sẽ hiển thị “Kỳ trước chưa có dữ liệu”.
- Bảng giá ngày thường, cuối tuần, lễ/Tết được **chọn trực tiếp cho suất**. Không tự suy luận lịch lễ. Giá 3D nhập riêng, không tự kế thừa giá 2D. Từ đúng 17:00 dùng giá tối.
- Giá trong đơn đã tạo không đổi theo lần chỉnh bảng giá hoặc giá sản phẩm sau đó.
- Đơn đã dùng vé không có thao tác hủy. Không xây dựng nghiệp vụ hoàn vé.

## Cấu trúc

```text
cinema-admin/
  index.html
  README.md
  KIEM-TRA.md
  assets/
    css/styles.css
    js/data.js
    js/app.js
    images/              # Logo, poster, ảnh sản phẩm SVG cục bộ
  tests/
    verify.cjs           # Kiểm tra dữ liệu, nghiệp vụ và sinh HTML các trang
    audit.py             # Kiểm tra tĩnh HTML và tệp tài nguyên
```

`data.js` tạo dữ liệu và các quy ước hạng ghế. `app.js` chứa điều hướng, kiểm tra phạm vi/quyền, kết xuất trang, biểu mẫu, bảng giá, đơn và các sự kiện. `styles.css` chứa hệ thống giao diện và các điểm ngắt responsive.

## Lưu dữ liệu

Các thay đổi được lưu bằng `localStorage` với khóa `lumiere-admin-v1`. Khi mở bằng `file://`, cách trình duyệt phân vùng bộ nhớ có thể khác nhau; nên mở lại cùng đường dẫn và cùng trình duyệt. Nếu trình duyệt chặn bộ nhớ, ứng dụng báo lỗi và vẫn cho thao tác trong phiên hiện tại. Khi phát hiện dữ liệu thay đổi từ tab khác, giao diện nạp lại bản mới và đóng biểu mẫu đang mở.

Phân quyền, tài khoản, thanh toán và QR đều là mô phỏng ở phía trình duyệt. Không nhập dữ liệu thật cần bảo mật, không sử dụng ứng dụng này làm hệ thống production. Không có kết nối thu tiền hoặc tạo tài khoản đăng nhập thật. Đường dẫn ảnh ngoài HTTPS chỉ được tải nếu người dùng tự nhập; tài nguyên đi kèm hoàn toàn cục bộ.

## Kiểm tra cho người phát triển (không bắt buộc để mở ứng dụng)

```bash
node tests/verify.cjs
python3 tests/audit.py
```

Lệnh Node không cần cài thêm thư viện. Lệnh Python kiểm tra tĩnh dùng `lxml`; bỏ qua nếu máy chưa có thư viện này. `tests/rendered` được tạo khi chạy kiểm tra, không phải thành phần ứng dụng.

Các kiểm tra cục bộ đã chạy đạt; **chưa xác nhận hiển thị và thao tác bằng trình duyệt thực** vì môi trường xem thử không khả dụng. Chi tiết tại `KIEM-TRA.md`.
