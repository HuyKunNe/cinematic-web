# Rà soát FE booking — 2026-11-26

## Phạm vi và nguồn đối chiếu

Checkout `E:\java\cinematic-web` sạch trước lượt rà soát. Chỉ tiếp tục role User:
chọn ghế → checkout → processing → kết quả → vé → lịch sử đơn. Không audit toàn bộ
Admin/Staff và không xem các phần đó là đã hoàn tất.

Đã đọc AGENTS, README, CURRENT_STATUS, ROADMAP, ARCHITECTURE, API_INTEGRATION,
DESIGN_SYSTEM và reference Lumière liên quan; đối chiếu router, component, API
composable, generated client và controller BE thanh toán. Đây là rà soát source,
không phải xác minh browser, API đang chạy hoặc database.

## Hiện trạng trong code

| Bước                       | Route                                   | Thành phần chính                                   |
| -------------------------- | --------------------------------------- | -------------------------------------------------- |
| Chọn ghế                   | `/booking/:showtimeId`                  | BookingPage, BookingSeatSelection, BookingCheckout |
| Kiểm tra trước khi tạo đơn | `/booking/checkout?showtimeId=...`      | BookingDraftCheckoutPage, BookingDraftCheckout     |
| Đơn đã tạo                 | `/booking/checkout/:bookingId`          | BookingOrderPage, BookingPayment                   |
| Đang xử lý                 | `/booking/processing/:bookingId`        | BookingProcessing, BookingPayment                  |
| Kết quả                    | `/booking/result/:bookingId`            | BookingOrderPage                                   |
| Vé/QR chung                | `/booking/ticket/:bookingId`            | BookingConfirmedTicket, customer-pickup            |
| Lịch sử/chi tiết           | `/account/bookings` và `?bookingId=...` | MyBookingsPage, BookingTicketCard                  |

- Báo giá từ API; checkout kiểm tra lại giá trước khi gửi. Yêu cầu chưa rõ kết quả
  giữ clientRequestId để thử lại cùng yêu cầu, không tự tạo giao dịch thành công.
- Thanh toán lấy checkoutUri/trạng thái/thời hạn từ API; booking CONFIRMED mới mở vé.
- QR chung dùng owner pickup-pass và qrcode cục bộ; chỉ hiển thị READY còn hiệu lực.
  Không có nút in ở User. Quét/thiết bị in thuộc Staff/POS, ngoài phạm vi lượt này.
- Lịch sử có lọc/phân trang phía BE, một nhãn trạng thái mỗi thẻ, mã đơn sáu ký tự;
  theo dõi đơn PENDING/RESERVED và giữ dữ liệu cũ có cảnh báo khi tải nền bị lỗi tạm thời.

## Lỗi đã sửa trong lượt này

BookingPayment dùng refetch mặc định có thể hủy/thay lần tải nền đang chạy. Sau khi
chờ phản hồi, nó còn phát sự kiện tải lại đơn mà không kiểm tra component đã tháo,
booking đã đổi hoặc tài khoản đã đổi. Đã dùng cancelRefetch=false để dùng chung
lần tải đang chạy, chặn bấm lặp và chỉ phát refresh cho đúng component/booking/chủ
đơn ban đầu. Spinner theo thao tác kiểm tra thủ công; chặn mở cổng trong thao tác đó.
Không đổi endpoint, contract, trạng thái nghiệp vụ hoặc CSS responsive.

Processing cũng đã ẩn khối chờ khi tải đơn hoặc điều hướng kết quả bị lỗi, thay
vì vừa báo lỗi vừa quay spinner. Thông báo lỗi, tiêu đề và thao tác phục hồi hiện
có vẫn hiển thị. Dùng v-show để giữ component theo dõi thanh toán mounted, không
reset payment state hoặc làm gián đoạn việc nhận kết quả khi tải lại thành công.

Checkout khôi phục yêu cầu từ session storage nay kiểm tra tài khoản hiện hành
trước khi đọc checkpoint. Khi đổi/mất phiên, không hiển thị yêu cầu/đường dẫn đơn
của chủ cũ và không cho tiếp tục/gửi lại từ component cũ. Storage và request của
chủ cũ không bị xóa hoặc viết lại; idempotency/provider vẫn giữ nguyên khi đúng
chủ đơn khôi phục yêu cầu.

Đã nối sự kiện rejected của BookingCheckout vào BookingDraftCheckout. Với phản
hồi bị từ chối rõ ràng theo nhánh 4xx sẵn có, bỏ báo giá đã kiểm tra, đợi mở khóa
yêu cầu rồi tải lại suất/ghế và lấy lại quote nếu lựa chọn vẫn hợp lệ. Không tự
submit lại. Lỗi mạng/5xx không phát sự kiện này, vẫn giữ checkpoint/clientRequestId
để tránh tạo trùng. Refresh suất/ghế dùng chung GET đang chạy thay vì hủy nó.

Chọn ghế nay giữ sơ đồ đã tải ở chế độ chỉ đọc khi cập nhật nền lỗi tạm thời,
cùng cảnh báo dữ liệu cũ. Lỗi 401/403/404/409 hoặc thiếu layout vẫn ẩn sơ đồ.
Ghế đã chọn và tổng tiền không bị xóa bởi lỗi mạng; thao tác/checkout vẫn bị khóa
cho đến khi tải lại thành công. Bỏ nút Làm mới thường trực vì đã có polling 15s;
chỉ hiện Thử lại khi lỗi, dùng chung GET đang chạy.

Khôi phục ghế đã lưu nay thông báo nếu có ghế không còn trống/chưa có giá hoặc
không có trong snapshot hiện tại; trước đây ghế bị bỏ im lặng. Lựa chọn, bảng
tiền và thao tác chọn ghế chỉ có hiệu lực trong phiên của chủ lựa chọn ban đầu.
Đổi/mất phiên không làm xóa storage của chủ cũ và không để hiện lựa chọn của họ
trong component chưa kịp tháo. Luồng cập nhật ghế/giá từ API không thay đổi.

## Tài liệu còn khác code/yêu cầu hiện hành

### Phụ thuộc metadata vé cũ vào danh mục hiện tại

BookingResponse hiện chỉ tham chiếu showtimeId, chưa chứa snapshot tên phim,
poster, tên rạp/phòng và giờ bắt đầu tại lúc mua. Đã đối chiếu DTO BE/generated.
Không suy ra phim bị xóa chỉ vì ngừng bán: lookup phim theo ID là API riêng.

FE đã xử lý riêng HTTP 404 từ lookup phim: giữ context suất/rạp/phòng hợp lệ,
biểu diễn phim bị thiếu bằng null và placeholder UI, không dựng MovieResponse.
Các lỗi khác, quyền truy cập, ID không khớp và lỗi suất/rạp/phòng vẫn đi qua
nhánh lỗi cũ. Đặt vé mới/checkout không đủ thông tin phim vẫn bị chặn như trước.
Vé cũ giữ ghế/giá đã lưu và QR theo owner pickup-pass, không thay đổi trạng thái
đơn hoặc giả định metadata đã được lưu từ thời điểm mua.

BE còn cần bổ sung snapshot metadata vào contract booking/ticket nếu muốn lịch
sử không phụ thuộc danh mục, không đổi tên theo lần sửa phim/rạp và vẫn đầy đủ
khi suất/rạp/phòng bị gỡ. Đây là yêu cầu contract, chưa có DTO/endpoint mới do FE
tự tạo. Chưa kiểm tra runtime ca phim 404; chỉ đối chiếu source.

### Khác biệt tài liệu chung

- README còn mô tả workflow chỉ đọc; AGENTS hiện cho phép sửa FE để người dùng review.
- DESIGN_SYSTEM còn ưu tiên Figma; task và AGENTS ưu tiên HTML/CSS Lumière cho User.
- Kiến trúc thư mục trong tài liệu có phần đề xuất; router thực tế vẫn tập trung tại
  `src/router/index.ts`, không có `features/booking/routes.ts`.
- Reference có dữ liệu demo, nút in User, quy tắc tám khách và thời gian giữ cố định.
  Không áp dụng các phần đó lên sản phẩm; hợp đồng BE và yêu cầu User hiện hành ưu tiên.

Không sửa hàng loạt tài liệu gốc hoặc mở rộng phạm vi để xử lý các khác biệt này.

## Cần kiểm tra thủ công tiếp

### Chọn ghế: đối chiếu source và các ca cần thử

Đã đọc `seat-selection-rules.ts`, mapper vị trí, snapshot query và matrix.
Chưa chạy test hoặc thử các tình huống này trên browser. Không đổi thuật toán.

Trong một đoạn **bốn ghế đơn trống liền nhau**, giới hạn bởi đầu hàng, lối đi
hoặc ghế không khả dụng:

| Lựa chọn | Kết quả theo code hiện tại |
| --- | --- |
| Chỉ một ghế cho cả đơn | Cho phép theo ngoại lệ đã thống nhất |
| Ghế 1–2 hoặc 3–4 | Cho phép, không tạo ghế đơn trống |
| Ghế 2–3 | Chặn vì để lại ghế đơn trống ở hai đầu |
| Ghế 1 và 3 | Chặn vì không liền nhau |
| Một ghế đơn mỗi hàng, tổng từ hai ghế | Chặn, gồm trường hợp G6 và F8 |
| Hai ghế liền nhau mỗi hàng ở nhiều hàng | Cho phép nếu mỗi hàng không tạo ghế đơn trống |
| Ghế hai bên lối đi trong cùng hàng | Chặn vì không liền vị trí vật lý |
| Một đơn vị ghế đôi | Không tách cặp; sức chứa do snapshot cung cấp |
| Nhiều ghế nhưng thiếu vị trí vật lý | Chặn thay vì đoán vị trí từ tên ghế |

Sau khi chọn, cho snapshot cập nhật ghế đã đổi giá/không còn trống: ghế đó phải
rời lựa chọn, bảng tiền chỉ tính ghế còn hợp lệ và có thông báo. Lỗi mạng không
được giả thành ghế đã bán. Tải lại thành công phải kiểm tra theo vị trí/span của
snapshot mới. FE validation không thay việc BE kiểm tra khi giữ ghế/tạo booking.

### Các bước end-to-end còn chờ

1. Chọn ghế thường/đôi, báo giá, thay đổi availability/giá trước lúc thanh toán.
2. Mất mạng khi tạo đơn: gửi lại cùng clientRequestId; kiểm tra không có đơn trùng.
3. Checkout provider thật/mock theo cấu hình BE: processing, kết quả cuối, đối soát.
4. Bấm kiểm tra khi có GET nền, chuyển booking/route hoặc đổi phiên khi GET chưa xong.
5. QR WAITING → READY; quét QR chung; hết hạn; vé đã sử dụng; lỗi tải và đổi tài khoản.
6. Tab all/upcoming/past/unfinished, ranh giới giờ kết thúc và phân trang.
7. Quan sát responsive ở 390/768/1024/1440px, focus bàn phím và thông báo lỗi.

Không chạy test, lint, typecheck, build hoặc format; không kiểm tra browser/API runtime,
không sửa BE/generated/reference, không truy cập database, không commit/push.
