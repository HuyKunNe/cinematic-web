# Cinematic Home — Design Analysis

## Phạm vi và nguồn

Phân tích dựa trên hai ảnh Cinematic Home Desktop và Cinematic Home Mobile được cung cấp trong cuộc trò chuyện. Không sử dụng Figma. Ảnh chỉ là tài liệu tham chiếu; không nhúng toàn ảnh làm giao diện.

Các nội dung nhìn thấy trực tiếp trong ảnh được mô tả là **Quan sát**. Hành vi không thể hiện trong ảnh được ghi là **Đề xuất**.

## 1. Header

### Desktop

**Quan sát**

Header nền navy đậm, nằm ngang trên cùng:

- Logo CINEMATIC ở bên trái, dùng màu amber/gold.
- Các liên kết điều hướng: Lịch chiếu, Phim, Rạp, Ưu đãi.
- Cụm chức năng phía phải gồm tìm kiếm, chọn địa điểm, tài khoản và nút “Đặt vé”.
- CTA “Đặt vé” là nút nổi bật nhất trong header.

**Đề xuất hành vi**

- Liên kết điều hướng dẫn tới các route tương ứng.
- Chọn địa điểm mở danh sách rạp hoặc thành phố; giữ lựa chọn trong trạng thái ứng dụng.
- Search mở vùng tìm kiếm có nhãn truy cập được, hỗ trợ bàn phím và trạng thái rỗng.
- Account mở menu tài khoản khi đã đăng nhập; khi chưa đăng nhập, bắt đầu luồng OIDC.
- Nút “Đặt vé” đưa người dùng đến quick booking hoặc mở quick booking trên trang hiện tại.

### Mobile

**Quan sát**

Header gọn hơn, gồm logo, chọn địa điểm, search và nút menu. Các liên kết desktop không hiển thị thành một hàng.

**Đề xuất hành vi menu**

- Nút menu là button có tên truy cập được và trạng thái `aria-expanded`.
- Khi mở, hiển thị menu dạng drawer hoặc panel dưới header; có Lịch chiếu, Phim, Rạp, Ưu đãi, Tài khoản và Đặt vé.
- Menu đóng khi chọn một route, nhấn nút đóng hoặc nhấn Escape.
- Không để menu che khuất nội dung mà không có cách đóng rõ ràng.
- Nếu menu dùng modal overlay, đưa focus vào menu khi mở và trả focus về nút menu khi đóng.

## 2. Hero

**Quan sát**

- Hero là vùng ảnh rộng với nội dung phim phủ lên ảnh.
- Có lớp tối/gradient để giữ độ tương phản cho chữ.
- Thông tin gồm badge trạng thái phim, tiêu đề lớn, tagline, thể loại, phân loại độ tuổi và thời lượng.
- Có CTA chính “Đặt vé ngay”, CTA phụ “Xem trailer”.
- Hai bên hero có nút chuyển slide; bên dưới có carousel indicators.

**Đề xuất cấu trúc**

1. Ảnh cover lấy từ dữ liệu phim hoặc một API được xác nhận.
2. Gradient tối mạnh ở phía đặt nội dung; giảm dần về vùng hình ảnh.
3. Badge trạng thái hiển thị theo dữ liệu backend.
4. Tiêu đề và metadata lấy từ API.
5. CTA chính chuyển tới chọn suất chiếu/quick booking.
6. CTA trailer chỉ hiển thị khi phim có trailer URL.
7. Indicators có trạng thái slide hiện tại, tên truy cập được và có thể thao tác bằng bàn phím.

Backend hiện có `posterUrl` và `trailerUrl` trong `MovieResponse`, nhưng chưa thấy trường featured/hero hoặc thứ tự carousel. Không tự chọn phim hero dựa trên dữ liệu mẫu. Nếu chưa có API chọn hero, dùng placeholder riêng hoặc chờ xác nhận cách chọn nội dung.

## 3. Quick booking

### Desktop

**Quan sát**

Quick booking là panel ngang gồm bốn bước, có đánh số và biểu tượng:

1. Rạp
2. Phim
3. Ngày
4. Suất chiếu

Nút “Tiếp tục” đặt ở cuối hàng. Panel nằm ngay dưới hero và có viền, nền nâng cao so với nền trang.

### Mobile

**Quan sát**

Quick booking chuyển thành một card dọc. Mỗi lựa chọn chiếm một hàng riêng; CTA “Tiếp tục” trải rộng theo card.

### Trạng thái đề xuất

- **Disabled:** CTA bị vô hiệu hóa cho tới khi đủ dữ liệu bắt buộc. Có trạng thái disabled trực quan và thuộc tính HTML tương ứng.
- **Loading:** chỉ khóa thao tác đang tải; giữ lựa chọn hiện tại; hiển thị spinner hoặc skeleton có nhãn truy cập được.
- **Error:** thông báo lỗi gần control liên quan; cho phép thử lại; không chỉ truyền đạt lỗi bằng màu.
- **Success:** cập nhật bước tiếp theo bằng dữ liệu đã chọn.
- Nếu backend trả lỗi booking hoặc dữ liệu ghế không còn phù hợp, giữ ngữ cảnh và hướng dẫn chọn lại.

Backend hiện cung cấp danh sách rạp, phim, lịch chiếu và ghế theo suất. Lịch chiếu cần thời gian `from` và `to`; lựa chọn ngày/suất cần được ánh xạ từ dữ liệu thực tế, không hardcode.

## 4. Movie sections

### Phim đang chiếu

**Quan sát**

- Tiêu đề và mô tả ngắn ở đầu section.
- Desktop hiển thị nhiều card trong một hàng.
- Mobile dùng carousel ngang, card tiếp theo lộ một phần để gợi ý có thể cuộn.

### Sắp chiếu

**Quan sát**

- Desktop hiển thị danh sách card ngang, nội dung gồm ảnh nhỏ, tên phim, ngày phát hành và thể loại.
- Mobile chuyển thành các hàng/card xếp dọc với ảnh bên trái và nội dung bên phải.

### MovieCard anatomy

Card phim có thể gồm:

- Media artwork/poster.
- Badge trạng thái.
- Nút xem trailer nếu có trailer URL.
- Tên phim.
- Genre.
- Runtime.
- Ngày phát hành.
- Rating chỉ khi API cung cấp dữ liệu rating.

Backend `MovieResponse` hiện có `posterUrl`, `trailerUrl`, `durationMinutes`, `releaseDate`, `status` và `genres`; chưa thấy trường rating. Không hiển thị rating giả. Không biến poster thành nền chứa nội dung sản phẩm khác.

Ảnh tham chiếu dùng artwork ngang. Nếu API trả poster dọc, cần chọn cách crop/ratio phù hợp trong component; không kéo méo ảnh. Đề xuất tách token artwork card và poster dọc chuẩn.

### Carousel behavior

- Có thể kéo ngang bằng touch và trackpad.
- Nút trước/sau có tên truy cập được.
- Cuộn không tự chạy nếu không có lý do rõ ràng.
- Hỗ trợ reduced motion.
- Giữ tiêu điểm và thứ tự bàn phím hợp lý.
- Khi ít card, không hiển thị điều khiển carousel vô ích.

## 5. Marketing

### Promotion banners

**Quan sát**

- Desktop: hai banner đặt cạnh nhau, ảnh minh họa ở một phía và nội dung chương trình ở phía còn lại.
- Mobile: banner xếp dọc, chiếm gần toàn chiều rộng nội dung.
- Màu nền banner ấm hơn nền chung, có CTA dạng icon/mũi tên.

Backend chưa thấy API promotion. Không đưa nội dung khuyến mãi minh họa trong ảnh vào dữ liệu thật. Chỉ hiển thị banner có nguồn dữ liệu được xác nhận; nếu chưa có, cần quyết định có ẩn section hay dùng nội dung tĩnh được duyệt.

### Membership section

**Quan sát**

- Desktop: banner ngang gồm hình thẻ thành viên, tiêu đề/mô tả, các lợi ích và CTA.
- Mobile: chuyển thành card dọc; phần thẻ và lợi ích được bố trí lại để đọc được trên màn hình hẹp.

Backend hiện chưa thấy API membership hoặc điểm thưởng. Không hiển thị tên, số dư điểm hoặc ưu đãi thành viên giả. Có thể giữ cấu trúc component để tích hợp sau khi contract được xác nhận.

### Footer

**Quan sát**

- Desktop có các nhóm Khám phá, Hỗ trợ, Về CINEMATIC và Ứng dụng di động; có logo, mạng xã hội và hàng bản quyền/chính sách.
- Mobile giảm số cột, giữ logo/liên kết cần thiết và đặt bottom navigation cố định tách biệt với footer.

Liên kết chưa có route đích không nên trỏ tới `#` như thể đã triển khai.

## 6. Mobile layout

- Header dùng bố cục gọn với menu thay cho hàng liên kết desktop.
- Hero ưu tiên ảnh cover, tiêu đề, metadata và CTA trong một cột; gradient bảo vệ độ đọc.
- Quick booking xếp dọc.
- Movie đang chiếu cuộn ngang với card gọn; không thu nhỏ nguyên layout desktop.
- Coming soon chuyển thành danh sách/card dọc.
- Promotion và membership xếp dọc.
- Footer rút gọn.
- `MobileBottomNav` cố định phía dưới, có Trang chủ, Lịch chiếu, Vé của tôi và Tài khoản.
- Nội dung trang phải có padding đáy đủ cho bottom nav và safe area.
- Khi mở dialog/drawer, điều chỉnh xử lý bottom nav để không che nội dung thao tác.

## 7. Accessibility và nội dung

- Màu chữ, focus, disabled và trạng thái lỗi phải có độ tương phản phù hợp.
- Không dùng màu sắc làm tín hiệu duy nhất.
- Nút icon phải có accessible name.
- Ảnh nội dung có alt text phù hợp; ảnh trang trí dùng alt rỗng.
- Tiêu đề section và thứ bậc heading phải nhất quán.
- Kiểm tra reflow, focus và thao tác bàn phím tại các viewport mục tiêu.
