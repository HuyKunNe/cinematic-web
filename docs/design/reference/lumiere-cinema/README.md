# Lumière Cinema

Website đặt vé xem phim dành cho khách hàng, viết bằng **HTML, CSS và JavaScript thuần**. Thương hiệu, phim, hình ảnh, rạp và chính sách hoàn toàn hư cấu.

## Mở website

1. Giải nén toàn bộ thư mục `lumiere-cinema`.
2. Mở `index.html` bằng Chrome, Edge, Firefox hoặc Safari hiện đại.
3. Không cần cài đặt thư viện, backend, Internet hay bước build. Giữ nguyên cấu trúc các thư mục `assets`.

Toàn bộ hình ảnh SVG, teaser MP4 và phụ đề VTT đều nằm trong bộ mã. Một số trình duyệt giới hạn localStorage hoặc phụ đề VTT khi dùng giao thức `file://`. Nếu không cho phép localStorage, website sẽ thông báo chế độ giữ dữ liệu tạm. Có thể phục vụ thư mục bằng máy chủ tĩnh thông thường để kiểm tra lưu dữ liệu giữa các tab trên cùng origin; đây là tùy chọn, không phải yêu cầu để mở website.

## Hành trình đặt vé

Khám phá phim hoặc tìm rạp → ngày và suất → ghế/đối tượng vé → đồ ăn → thông tin liên hệ/mã ưu đãi → thanh toán mô phỏng → vé điện tử.

- Khách chưa đăng nhập vẫn đặt vé được.
- Quay lại các bước giữ nguyên ghế, đồ ăn và thông tin liên hệ.
- Desktop có tóm tắt bên phải. Mobile có thanh cố định hiển thị phim, rạp, giờ/ngày, ghế, tổng tiền và thao tác tiếp tục.
- Mỗi lượt giữ chỗ **10 phút**, tối đa 8 khách. Ghế đôi và giường là đơn vị bán cho 2 khách.
- Lịch chiếu có 7 ngày tính từ ngày mở trang theo `Asia/Ho_Chi_Minh`. Giờ rạp là UTC+7. Suất bắt đầu trong vòng 5 phút hoặc đã qua giờ không còn bán.
- Giá cố định cuối cùng theo tổ hợp suất, hạng ghế và đối tượng; **17:00 đã là buổi tối**. Không có phụ thu cần tự cộng. Bộ dữ liệu không khai báo giá lễ/Tết.
- Phòng Cao cấp/Giường nằm và đơn vị ghế đôi/giường không giảm theo đối tượng. Vé trẻ em chỉ xuất hiện cho phim P/K. Điều kiện từng đối tượng được hiển thị cạnh lựa chọn.
- Đồ ăn được lọc theo rạp. Thay số lượng cập nhật ngay tổng tiền.

## Tài khoản minh họa

- Email: `demo@lumiere.local`.
- Mật khẩu minh họa: chuỗi bất kỳ từ 6 ký tự. **Không dùng mật khẩu thật.**
- Mã xác thực: `123456`.
- Có thể đăng ký email giả lập khác, sửa hồ sơ và đăng xuất.
- Đăng nhập từ bước đặt vé sẽ quay lại bước đó, kể cả qua liên kết đăng nhập ở header.
- Mật khẩu không được lưu. Đây không phải cơ chế xác thực an toàn và không dành cho dữ liệu thật.
- Tích 1 điểm/10.000đ thực thanh toán, làm tròn xuống theo đơn. Hạng Discover/Explorer/Signature là minh họa; chưa hỗ trợ đổi điểm hay giảm giá riêng theo hạng.

## Tra cứu không cần đăng nhập

Dùng **LM-DEMO01** cùng email **demo@lumiere.local** hoặc điện thoại **0901234567** để mở vé mẫu. Đơn mới được tra cứu bằng mã đơn và email/điện thoại đã nhập khi thanh toán, trên cùng trình duyệt.

## Các tình huống để thử

| Tình huống | Thao tác |
| --- | --- |
| Chưa có lịch | Mở phim sắp chiếu “Phía bên kia vì sao” hoặc “Nhà có nắng”; hoặc chọn “Bí mật đảo xanh” ở ngày cuối lịch. |
| Hết ghế | Lịch ngày đầu tại Riverside, phim “Mùa hè năm ấy”, suất 12:40 có nhãn Hết chỗ nếu chưa qua giờ; sau giờ hiển thị Ngừng bán. |
| Ngừng bán | Suất 14:20 “Mật mã lúc 0 giờ” ngày đầu tại Riverside có trạng thái ngừng bán; các suất đã qua giờ cũng ngừng bán. |
| Gần hết ghế | Chọn suất mang nhãn Gần hết chỗ; sơ đồ chỉ còn ít vị trí trống. |
| Mã không hợp lệ | Nhập `SAIMAROI` ở bước thanh toán. |
| Giảm đồ ăn | `BAP20`: giảm 20.000đ khi đồ ăn từ 100.000đ, mọi rạp/phòng. |
| Giảm tiền vé | `CHAO20`: giảm 20% tối đa 40.000đ, tiền vé từ 100.000đ; Riverside/Garden, phòng Tiêu chuẩn, vé Người lớn, mỗi email một lần, không cộng dồn vé ưu đãi theo đối tượng. Điền email trước khi áp dụng. |
| Hết giờ giữ chỗ | Mở “Công cụ minh họa” dưới các bước đặt vé → “Kết thúc giữ chỗ ngay”. |
| Thanh toán thất bại/hết giờ | Chọn kết quả tương ứng trong “Mô phỏng kết quả thanh toán” trước khi xác nhận. |
| Chưa xác định kết quả | Chọn kết quả này, thanh toán; giao diện chưa cấp vé và chặn thanh toán lại cho lượt đặt đó. Bấm “Kiểm tra trạng thái đơn” để nhận xác nhận giả lập và cập nhật đơn trước khi phát hành vé. Nếu ghế đã bán cho đơn khác thì giao dịch thất bại. |
| Thanh toán lặp | Khi xử lý, nút bị khóa và cùng lượt đặt không tạo đơn thứ hai. |
| Ghế giữ giữa các tab | Mở 2 tab cùng origin, chọn cùng suất, thử chọn cùng ghế. Giữ chỗ dùng localStorage và mã cửa sổ trong sessionStorage. Giới hạn tùy trình duyệt khi mở bằng file://. |
| Phục hồi mẫu | Chọn “Khôi phục dữ liệu mẫu” ở footer và xác nhận trong hộp thoại. Chỉ xóa khóa của ứng dụng này. |

Mã ưu đãi có hiệu lực trong 7 ngày của lịch mẫu hiện tại. Thẻ ưu đãi có điều kiện đầy đủ. Nút áp dụng CHAO20 mở lịch lọc phòng phù hợp tại TP. Hồ Chí Minh.

## Các trang

| Nhóm | Hash |
| --- | --- |
| Trang chủ | `#/` |
| Phim | `#/movies`, `#/movies?tab=soon`, `#/movie/tang-may` |
| Lịch chiếu | `#/schedule?mode=movie`, `#/schedule?mode=cinema` |
| Rạp | `#/cinemas`, `#/cinema/riverside`, `#/cinema/garden`, `#/cinema/westlake` |
| Trải nghiệm | `#/experiences` |
| Tìm kiếm | `#/search` |
| Đặt vé | `#/booking/seats`, `#/booking/food`, `#/booking/checkout` (cần chọn suất trước) |
| Kết quả, đơn, vé | `#/result/{mã}`, `#/order/{mã}`, `#/ticket/{mã}` |
| Tài khoản | `#/login`, `#/register`, `#/forgot`, `#/verify`, `#/account` |
| Vé đã lưu | `#/tickets`, `#/tickets?tab=past`, `#/tickets?tab=unfinished` |
| Khách vãng lai | `#/lookup` |
| Thành viên, ưu đãi | `#/membership`, `#/offers`, `#/offer/first`, `#/offer/food`, `#/offer/member` |
| Hỗ trợ | `#/support`, `#/support/guide`, `#/support/contact`, `#/support/demo` |
| Chính sách | `#/policy/terms`, `#/policy/privacy`, `#/policy/purchase` |
| 404 | Hash không tồn tại bất kỳ |

Điều hướng sử dụng hash, tương thích Back/Forward. QR là đồ họa minh họa không quét được; chỉ hiển thị ở đơn đã thanh toán thành công. In vé dùng hộp thoại in của trình duyệt và CSS in riêng. Không có chức năng hoàn vé.

## Cấu trúc mã

```text
lumiere-cinema/
  index.html
  README.md
  assets/
    css/styles.css
    js/data.js
    js/app.js
    images/*.svg
    videos/*.mp4
    videos/*.vtt
  tests/core.test.cjs
```

- `data.js`: phim, rạp, phòng, suất, ghế, đồ ăn, ưu đãi và quy tắc giá.
- `app.js`: router hash, giao diện, giữ chỗ, tính tiền, mô phỏng tài khoản/thanh toán và các biểu mẫu.
- `styles.css`: hệ thống giao diện, responsive, bàn phím/focus, sơ đồ ghế và in vé.
- Không dùng thư viện bên ngoài. Không lưu mật khẩu, số thẻ hoặc OTP ngân hàng.
- Các khóa dữ liệu: `lumiere-demo-v1`, `lumiere-holds-v1`, `lumiere-guest-access`; sessionStorage có `lumiere-tab`.

## Kiểm tra

Nếu có Node.js, chạy từ thư mục dự án:

```bash
node --check assets/js/data.js
node --check assets/js/app.js
node tests/core.test.cjs
```

Bộ kiểm tra dùng Node tiêu chuẩn, không cần cài gói. Kiểm tra nghiệp vụ, trạng thái và nội dung render qua môi trường DOM tối giản; không thay thế kiểm tra trình duyệt hoặc kiểm tra trực quan.

Đã chạy các kiểm tra logic và cú pháp. **Chưa kiểm tra trực quan trong trình duyệt** vì hạ tầng xem trước của môi trường triển khai không khả dụng. Nên kiểm tra thêm bố cục trên các thiết bị mục tiêu và hành vi localStorage theo trình duyệt khi mở file trực tiếp.

## Phạm vi mô phỏng

Không có backend, xác thực thật, email/SMS thật, tồn kho ghế đa thiết bị hoặc cổng thanh toán thật. Dữ liệu chỉ ở trình duyệt. Không nhập thông tin cá nhân hoặc thông tin thanh toán thật. Form hỗ trợ chỉ kiểm tra đầu vào và hiển thị kết quả giả lập, không gửi yêu cầu ra ngoài. Liên kết bản đồ là dịch vụ bên ngoài và dùng địa chỉ hư cấu.
