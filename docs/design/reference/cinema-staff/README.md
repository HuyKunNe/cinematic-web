# Lumi Cinema — Không gian nhân viên

Bộ giao diện nghiệp vụ hoàn chỉnh bằng **HTML, CSS và JavaScript thuần**, tiếng Việt. Lumi là thương hiệu giả định; phim, thành viên và mọi giao dịch đều là dữ liệu minh họa.

## Mở ứng dụng

1. Giải nén toàn bộ thư mục `cinema-staff`.
2. Mở **`index.html`** bằng trình duyệt hiện đại. Không cần backend, cài thư viện hoặc build; có thể ngắt mạng.
3. Nhấn **Vào không gian làm việc**. Mã nhân viên mẫu `NV024`; mã truy cập mặc định `demo`, nhập bất kỳ cũng được. Không nhập mật khẩu thật.
4. Dùng bộ **Thử vai trò** trên thanh đầu trang để xem Trưởng ca, Bán vé, Quầy đồ ăn, Soát vé hoặc Bán vé + Quầy đồ ăn.

Bản mẫu bắt đầu bằng một **ca đang mở**, nhận lúc 13:00 với 1.000.000đ đầu ca và các giao dịch mẫu. Để thử **chưa nhận ca → nhận ca**, vào **Tài khoản & hướng dẫn → Thử tình huống chưa nhận ca**. Sau khi kết ca cũng có thể chọn **Chuẩn bị ca tiếp theo**.

Nếu trình duyệt không cho phép localStorage khi mở tệp, ứng dụng sẽ báo rõ và chỉ giữ trạng thái trong phiên hiện tại. Có thể dùng máy chủ tĩnh tùy chọn nếu chính sách trình duyệt yêu cầu; ứng dụng không cần máy chủ để thực thi nghiệp vụ.

## Cấu trúc mã

- `index.html`: điểm vào, nhãn tiếng Việt, dialog, vùng in và thông báo.
- `assets/css/styles.css`: thiết kế sáng, sidebar, bố cục quầy hai vùng, sơ đồ ghế, tablet/mobile và trang in.
- `assets/js/data.js`: dữ liệu mẫu, phân quyền mô phỏng, giá vé, ca, đơn, giao dịch, check-in, giao từng phần và localStorage.
- `assets/js/app.js`: hash router, template các màn hình, biểu mẫu, sự kiện, bàn phím, hộp thoại thanh toán và in.
- `assets/img/`: 11 SVG tự tạo, gồm áp phích phim, sản phẩm và biểu tượng thương hiệu, không tải từ bên ngoài.
- `tests/`: kiểm thử tùy chọn bằng Node.js, không cần để chạy website.

## Các màn hình

| Đường dẫn hash | Công việc |
| --- | --- |
| `#/dashboard` | Tổng quan ca, tổng thu từ giao dịch, suất kế tiếp, việc cần xử lý |
| `#/sell` | Chọn ngày, phim, phòng, định dạng và khung giờ |
| `#/sell?step=seats` | Sơ đồ ghế, đối tượng vé, giá cụ thể, giữ ghế 5 phút |
| `#/sell?step=food` | Bổ sung đồ ăn vào đơn vé |
| `#/food` | Bán sản phẩm, combo; tạo đơn đồ ăn độc lập |
| `#/checkout` | Kiểm tra đơn; tiền mặt, QR hoặc thẻ |
| `#/receipt/DH-1001` | Vé, QR minh họa, phiếu sản phẩm và biên nhận |
| `#/orders` | Tra cứu mã đơn/vé/giao dịch/số liên hệ, lọc thời gian/trạng thái/phương thức |
| `#/orders/DH-1001` | Chi tiết đơn, sản phẩm, thanh toán và lịch sử |
| `#/transactions/GD-1001` | Chi tiết và mã tham chiếu thanh toán |
| `#/scan` | Nhập/quét mã mẫu, kiểm tra riêng từng vé rồi xác nhận vào rạp |
| `#/fulfillment` | Chờ chuẩn bị, sẵn sàng, đã giao; theo dõi phần còn lại |
| `#/rooms` | Suất theo phòng, số vé bán, khách đã vào và báo sự cố |
| `#/shift` | Nhận ca, đối soát, giải thích chênh lệch, bàn giao, kết ca và in biên bản |
| `#/account` | Thông tin nhân viên, hướng dẫn, phím tắt, thông báo, khôi phục mẫu |

Điều hướng dùng hash; Back/Forward hoạt động. Ghế, sản phẩm và thành viên đã chọn được giữ khi quay lại bước trước. Chức năng ngoài quyền bị ẩn khỏi menu và bị chặn khi mở trực tiếp đường dẫn.

## Các hành trình để thử

### Bán vé → thanh toán → xuất vé → soát vé

1. Vào **Bán vé** và chọn suất **Bên kia quỹ đạo 14:15**.
2. Chọn ghế `B2` thường: **85.000đ/vé**, hoặc ghế `G2` đôi: **200.000đ/cặp, 2 người**. Ghế VIP có giá riêng. Có thể đổi đối tượng vé nếu suất hỗ trợ.
3. Sang **Thêm đồ ăn**, chọn thành phần/tùy chọn rồi thêm sản phẩm.
4. Có thể tìm thành viên `TV0088` hoặc `0918765432`, sau đó dùng `LUMI10` cho đơn từ 100.000đ: giảm 10%, tối đa 30.000đ. Phòng cao cấp/giường nằm không áp dụng mã này. Giá gốc không sửa trực tiếp.
5. Chọn **Thanh toán**. Với tiền mặt, nhập đúng số thực nhận; hệ thống hiển thị tiền thừa. Với QR/thẻ, tạo yêu cầu rồi chọn một **phản hồi mô phỏng** trong hộp thoại.
6. Chỉ sau kết quả thành công mới có vé. In vé/phiếu/biên nhận bằng hộp thoại in của trình duyệt; có thể lưu PDF.
7. Sao chép mã `VE-...` của một vé, mở **Soát vé**, nhập mã, kiểm tra rồi **Xác nhận vào phòng**. Vé đôi/giường thể hiện 2 người. Vé còn lại của cùng đơn vẫn chưa sử dụng.

### Tình huống ngoại lệ

| Tình huống | Cách thử |
| --- | --- |
| Chưa nhận ca | Tài khoản → Thử tình huống chưa nhận ca. Việc ghi nhận giao dịch bị chặn cho đến khi nhận ca phù hợp. |
| Hết giờ giữ ghế | Sau chọn ghế, bấm **Thử hết giờ**. Ghế bị bỏ; sản phẩm vẫn còn. |
| Ghế không khả dụng | `A1` không sử dụng, `B5` đang được giữ; các ghế bán/giữ theo đơn có nhãn và không chọn được. |
| Suất hết chỗ | **Thành phố không ngủ 18:00**, Phòng 02: có một đơn online mua đủ 69 ghế có thể bán. |
| Thanh toán chưa rõ | Tra cứu `DH-1005` hoặc chọn phản hồi **Chưa xác định** khi thanh toán. Không phát vé, không cho thu lại. Tra cứu rồi chọn phản hồi xác thực giả lập thành công/thất bại. |
| Thất bại/hết hạn | Chọn phản hồi tương ứng. Thất bại có thể thử lại với mã lần thanh toán mới; hết hạn cần tạo đơn mới để kiểm tra lại chỗ. |
| Quét lại vé | `VE-1006-1`; hoặc quét lại vé bạn vừa xác nhận. |
| Sai rạp | `VE-1007-1`: Lumi Riverside; không thể tra cứu đơn này trong Lumi Nguyễn Trãi. |
| Không đúng giờ | `VE-1008-1`; cửa sổ vào rạp là 60 phút trước đến 30 phút sau giờ chiếu. |
| Vé hủy | `VE-1009-1`. |
| Không tìm thấy | `VE-9999-1`. |
| Giao một phần | `DH-1002` / `SP-1002`: 2 nước, đã giao 1, còn 1. Có thể tạo đơn mới nhiều sản phẩm và nhập số giao nhỏ hơn số còn lại. |
| Chênh lệch cuối ca | Nhập tiền thực đếm khác dự kiến: bắt buộc giải thích. Có giao dịch chờ/chưa rõ: bắt buộc bàn giao. |

### Nhận lại vé online

Tra cứu `DH-1002` → kiểm tra **Đã thanh toán** → **Vé & chứng từ** → In vé. Mỗi lần in ghi người thực hiện và thời gian; chỉ in không đổi trạng thái sử dụng vé.

### Kết ca

Ca mẫu có **5 giao dịch thành công tại quầy**, tổng thu **1.147.000đ**, trong đó **787.000đ tiền mặt** và **360.000đ QR**. Tiền mặt dự kiến = 1.000.000đ đầu ca + 787.000đ = **1.787.000đ**. Đơn online và đơn của rạp khác không tính vào thu tại quầy. Các số cập nhật theo giao dịch bạn thực hiện.

Vào **Ca làm việc**, kiểm đếm, giải thích sai lệch nếu có, bàn giao các mã đang chờ/chưa rõ và xác nhận kết ca. Biên bản giữ số liệu tại thời điểm kết ca; có thể in. Kết ca không tự biến giao dịch chờ thành thành công. Ca đã đóng không bán hàng, soát vé hay giao sản phẩm mới. Vai trò chỉ soát vé không được xem đối soát tiền của ca thu ngân.

## Phím tắt

- `F2`: Bán vé; `F3`: Quầy đồ ăn; `F4`: Tra cứu; `F6`: Soát vé.
- `/`: tập trung ô tìm kiếm của màn hình hiện tại.
- `Alt + L`: khóa màn hình; `Esc`: đóng hộp thoại.
- `Tab`, `Shift + Tab`, `Enter`, `Space`: thao tác bàn phím theo điều khiển tiêu chuẩn.

Các phím chức năng chỉ hoạt động với vai trò được cấp quyền; trình duyệt/hệ điều hành có thể có phím trùng.

## Dữ liệu, thời gian và phạm vi mô phỏng

- localStorage dùng khóa `lumi-staff-demo-v1`, lưu phiên mô phỏng, ca, đơn, giao dịch, vé, giao nhận, sự cố và lịch sử. Không lưu mật khẩu, số thẻ hoặc thông tin ngân hàng nhạy cảm.
- **Tài khoản & hướng dẫn → Khôi phục dữ liệu mẫu** xóa các thay đổi trên trình duyệt rồi tạo lại mẫu, đưa về màn hình đăng nhập.
- Đồng hồ mẫu bắt đầu lúc **13:42 ngày địa phương hiện tại**, chạy tiếp theo thời gian thực và được lưu qua lần tải lại. Tất cả thời gian hiển thị theo **Asia/Ho_Chi_Minh (UTC+7)**. Khôi phục mẫu đặt lại đồng hồ 13:42 và lịch mẫu.
- Đăng nhập và phân quyền chỉ là minh họa giao diện. Thanh toán lấy phản hồi giả lập rõ nhãn; không kết nối ngân hàng. Nút quét mô phỏng nhập một mã vé mẫu, không truy cập camera.
- **QR minh họa không phải mã thanh toán/QR mã hóa có thể dùng thực tế.** Dùng mã chữ in cạnh QR để tra cứu trong demo.
- **Giữ ghế chỉ có hiệu lực trong một trang/trình duyệt. Không có đồng bộ ghế, giao dịch hay khóa phân tán giữa thiết bị hoặc tab.** Nếu phát hiện tab khác thay đổi localStorage, ứng dụng nhắc tải lại. Dùng một tab khi kiểm thử.
- Sản phẩm chỉ có trạng thái còn bán/hết hàng; không hiển thị số tồn kho giả định. Ghế đôi/giường là một đơn vị bán cho hai người.
- Báo sự cố và bàn giao chỉ lưu trong bản demo, không gửi thông báo cho người khác. Không có chức năng hoàn vé hoặc quản trị phim, giá, tài khoản, lịch, sơ đồ ghế.

## Kiểm tra đã thực hiện

Có thể chạy tùy chọn với Node.js (không phải bước build/chạy ứng dụng):

```bash
node tests/business.test.cjs
node tests/screens.test.cjs
```

- **26 kiểm thử nghiệp vụ đạt**: giá/tổng tiền và liên kết mẫu; ca phù hợp; quyền; ghế đôi/giường; giữ chỗ hết hạn; điều kiện ưu đãi; tiền thiếu; chống đơn/vé trùng; QR chờ; kết quả chưa rõ; thử lại; soát từng vé; giao từng phần/biểu mẫu cũ; bàn giao/kết ca và localStorage.
- **110 tổ hợp màn hình/vai trò kết xuất thành công** bằng môi trường DOM mô phỏng tối thiểu; thêm kiểm tra khóa, hộp thoại, in lại không đổi vé và ca phi thu ngân.
- Kiểm tra cú pháp JavaScript, các SVG, id HTML không trùng, không lồng form và ảnh có thuộc tính alt.
- **Chưa kiểm chứng trực quan bằng trình duyệt**: hạ tầng xem trước của môi trường bàn giao không khả dụng. Kiểm thử kết xuất không thay thế kiểm tra bố cục, cảm ứng hoặc in thực tế trên thiết bị.
