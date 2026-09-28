# Responsive Behavior

## Breakpoints

Breakpoints được quản lý tập trung trong cấu hình responsive:

- Mobile: dưới `48rem`
- Tablet: từ `48rem`
- Desktop: từ `64rem`
- Wide: từ `90rem`

Kiểm tra bắt buộc: 390px, 768px, 1024px và 1440px.

## Header và navigation

| Viewport | Hành vi                                                                               |
| -------- | ------------------------------------------------------------------------------------- |
| 390px    | Logo, location selector gọn, search và menu button. Không hiện hàng liên kết desktop. |
| 768px    | Tiếp tục dùng mobile/tablet header; menu mở thành drawer hoặc panel.                  |
| 1024px   | Hiện desktop navigation, location selector, search, account và CTA Đặt vé.            |
| 1440px   | Giữ cấu trúc desktop; nội dung căn trong container, không kéo giãn quá rộng.          |

Menu mobile phải đóng bằng nút đóng, Escape hoặc khi chọn route. Khi mở drawer, khóa cuộn nền nếu cần, quản lý focus và giữ nội dung có thể cuộn trong chiều cao màn hình.

## Hero

- Desktop: hero rộng, ảnh và lớp gradient làm nền; nội dung đặt ở vùng tương phản cao. Các CTA và carousel controls nằm trong hero.
- Mobile: chuyển nội dung thành một cột; tiêu đề được phép xuống dòng tự nhiên; metadata và CTA không đè lên vùng ảnh thiếu tương phản.
- Ở 390px, hai CTA có thể xếp dọc hoặc chia đôi nếu vẫn đủ chỗ cho nhãn rõ ràng.
- Ở 768px, có thể giữ CTA cạnh nhau khi không gây tràn.
- Dùng `object-fit: cover` và vị trí ảnh có thể cấu hình; không kéo méo ảnh.
- Khi không có ảnh API, dùng placeholder riêng và gradient nền.

## Quick booking

| Viewport | Bố cục                                                                       |
| -------- | ---------------------------------------------------------------------------- |
| 390px    | Card dọc; Rạp, Phim, Ngày, Suất chiếu mỗi mục một hàng; CTA toàn chiều rộng. |
| 768px    | Bố cục 2 cột/2 hàng nếu chiều rộng control đủ; CTA chiếm hàng riêng.         |
| 1024px   | Một hàng 4 bước và CTA ở cuối.                                               |
| 1440px   | Giữ hàng ngang, căn panel theo container.                                    |

- Không cho phép bước sau thao tác trước khi có dữ liệu cần thiết.
- Loading không làm nhảy kích thước card.
- Error text nằm gần control liên quan và có thể đọc bằng screen reader.
- Nội dung control không bị cắt khi font scale hoặc bản dịch dài hơn.

## Movie sections

### Phim đang chiếu

- Desktop: hiển thị grid/carousel nhiều card, với số lượng vừa đủ theo container.
- Tablet: giảm số card nhìn thấy; tiếp tục hỗ trợ cuộn ngang nếu cần.
- Mobile: carousel ngang; card gọn; card tiếp theo lộ một phần để gợi ý thao tác cuộn.
- Gesture swipe và nút điều khiển phải cùng tồn tại; không bắt buộc người dùng dùng một kiểu input duy nhất.

### Sắp chiếu

- Desktop: danh sách nhiều card trên một hàng hoặc grid theo nội dung thực tế.
- Mobile: danh sách dọc; artwork bên trái, tên phim, ngày và thể loại bên phải.
- Nội dung dài được wrap hoặc clamp có chủ đích; không làm card cao bất thường.

### MovieCard

- Poster dọc dùng ratio token poster; artwork ngang trong ảnh reference dùng token riêng.
- Không làm méo ảnh; crop có thể thay đổi theo breakpoint.
- Tên phim tối đa số dòng đã định trước, nhưng vẫn có accessible text đầy đủ.
- Nếu chưa có rating từ API thì ẩn vùng rating, không hiển thị điểm giả.

## Promotion và membership

- Desktop: promotion banners cạnh nhau; membership section trình bày theo hàng ngang.
- Tablet: giảm khoảng cách và có thể chuyển promotion sang một cột nếu nội dung bị chật.
- Mobile: banner xếp dọc; membership chuyển thành card dọc, CTA đủ rộng để thao tác.
- Nếu backend chưa có dữ liệu promotion/membership được xác nhận, không dựng dữ liệu trông như nội dung thật.

## Footer

- Desktop: chia thành các nhóm liên kết, ứng dụng và mạng xã hội.
- Tablet: giảm số cột hoặc cho phép wrap.
- Mobile: các nhóm liên kết xếp dọc hoặc rút gọn; không để footer chồng lên MobileBottomNav.

## MobileBottomNav và safe area

- Chỉ hiển thị ở breakpoint mobile/tablet theo thiết kế được duyệt.
- Dùng vị trí fixed ở dưới màn hình và tôn trọng `env(safe-area-inset-bottom)`.
- Nội dung chính có padding đáy tối thiểu bằng chiều cao nav cộng safe area.
- Khi dialog/drawer mở, bottom nav không được che CTA hoặc vùng thao tác trong dialog.
- Trạng thái route hiện tại cần có chỉ báo ngoài màu sắc, ví dụ icon/label hoặc indicator.
- Các mục mặc định theo ảnh: Trang chủ, Lịch chiếu, Vé của tôi, Tài khoản.

## Kiểm tra tại viewport mục tiêu

### 390px

- Không cuộn ngang toàn trang.
- Header, hero title, quick booking và bottom nav không chồng lấn.
- Carousel có thể swipe.
- CTA không bị che bởi safe area.

### 768px

- Tablet không bị ép thành bản desktop thu nhỏ.
- Quick booking và movie cards dùng số cột phù hợp.
- Menu/header không bị chật do location selector và action icons.

### 1024px

- Desktop header hiển thị đầy đủ và không wrap bất thường.
- Quick booking nằm ngang.
- Movie sections có đủ khoảng cách và card không bị bóp méo.

### 1440px

- Nội dung giới hạn bằng container token.
- Không kéo dài dòng mô tả hoặc card quá rộng.
- Hero, sections và footer căn cùng lề container.
