# Luồng đặt vé USER

## Tiếp tục sang trang thanh toán, không dùng modal — 2026-11-13

- Trên `/booking/:showtimeId`, Tiếp tục (desktop/mobile dùng cùng action) lưu lựa
  chọn ghế theo owner/suất và mở `/booking/checkout?showtimeId=...`. Không mở
  BookingReviewDialog, không quote hay POST booking ở bước chọn ghế.
- Route checkout trước khi có bookingId dùng BookingDraftCheckoutPage và
  BookingDraftCheckout: xem vé/báo giá/điều kiện, Sửa ghế, chọn MoMo/VNPAY, checkbox
  xác nhận và Xác nhận và thanh toán. Back hoặc reload khôi phục lựa chọn cùng
  tài khoản trong cùng tab; không lưu quote như giá lịch sử hoặc giả là đã giữ ghế.
- Checkout đọc context/snapshot thật, kiểm tra suất còn bán, availability và quy
  tắc ghế lẻ. Lấy quote khi mở trang và kiểm tra lại trước POST. Giá/nhóm vé thay
  đổi thì cập nhật giá và yêu cầu bấm xác nhận lại, không tự gửi theo số tiền mới.
- BookingCheckout giữ nguyên checkpoint/clientRequestId khi kết quả mutation chưa
  rõ. Request cũ vẫn retry nguyên payload. Trong trạng thái này không sửa lựa chọn,
  không coi ghế HELD là lý do tạo booking mới. Nếu rời trang khi đang quote thì
  callback không được POST sau khi component đã unmount.
- Sau POST hợp lệ, chuyển `/booking/checkout/:bookingId` để chờ giữ ghế/phiên
  payment. Xác nhận vừa thực hiện tạo payment intent trong Pinia, chỉ trong bộ nhớ,
  theo owner/bookingId; khi URI hợp lệ/còn hạn sẵn sàng thì tiếp tục tới cổng đã chọn.
  Intent được tiêu thụ một lần, hủy khi bỏ checkbox, rời trang hoặc đổi tài khoản;
  không lấy consent từ URL và không tự phục hồi intent sau reload. Retry sau reload
  vẫn cần xác nhận thanh toán ở trang đơn nếu không còn consent trong bộ nhớ.
- Route checkout theo bookingId, result và ticket cũ vẫn hoạt động; kết quả vé
  vẫn chỉ dựa trên booking CONFIRMED. Không thêm giới hạn 8 khách.

Kiểm tra thủ công: chọn ghế → Tiếp tục phải đổi URL, không modal/POST; kiểm tra
quote và chọn cổng trên checkout; Sửa ghế/Back/reload; giá đổi, ghế bị giữ, ghế lẻ,
suất ngừng bán; xác nhận hai lần chỉ có một request; lỗi mạng giữ cùng ID; rời
trang khi quote chậm không tạo đơn; chờ provider và chỉ chuyển một lần; đổi tài
khoản không thấy lựa chọn/intent trước. Không thực hiện giao dịch thật trong lượt này.

Các ghi chú cũ về modal và quote khi bấm Tiếp tục tại sơ đồ bên dưới là lịch sử,
được thay bằng luồng checkout riêng ở mục này. Không có API đồ ăn/voucher/contact
snapshot/QR mới được thêm hoặc giả lập trong lượt sửa này.

## Đối chiếu riêng ba màn hình Lumière — 2026-11-12

| FE | Reference | Cấu trúc đã điều chỉnh |
| --- | --- | --- |
| `/booking/checkout/:bookingId` | `#/booking/checkout` | Tiến trình; tiêu đề Bước 03 trong cột trái; danh sách vé/giá; khối phương thức và xác nhận thanh toán. Cột phải có poster/phim, rạp/phòng/suất, ghế/capacity, tiền vé/tổng và đồng hồ giữ ghế. |
| `/booking/result/:bookingId` | `#/result/{code}` | Không có thanh tiến trình; nội dung kết quả căn giữa; bỏ panel bao quanh thông báo chưa thành công; thẻ vé cho CONFIRMED; Xem vé/In/điều hướng. |
| `/booking/ticket/:bookingId` | `#/ticket/{code}` | Tiêu đề trang riêng “Cuộc hẹn đã sẵn sàng”; thẻ vé; hai cột thông tin suất/vé và thanh toán phía dưới; hàng hành động cuối. |

BookingJourneySummary và BookingSavedSeats là component trình bày, dùng dữ liệu
thật và query context hiện có. Không thay contract hoặc logic giữ ghế/thanh toán.
CSS in áp dụng cho thẻ vé trên cả result và ticket đã CONFIRMED, ẩn header/footer,
tiêu đề trang, các panel chi tiết và nút. Mobile xếp chi tiết một cột, summary chia
nhóm thông tin theo mẫu. Không ép các bookingId người dùng nêu sang trạng thái thành công.

Còn khác reference do dữ liệu: chưa có snapshot người nhận, đồ ăn/ưu đãi, QR hay
used status. Không hiển thị giá đồ ăn/giảm giá bằng 0 để giả là API có hỗ trợ;
không dựng form không lưu hoặc QR mô phỏng. Phương thức của đơn đã tạo chỉ đọc,
không cho đổi nhà cung cấp khi API checkout không có mutation tương ứng.

Kiểm tra đã chạy: cú pháp Vue/CSS và git diff --check. Computer Use đã thử khởi
tạo nhưng native pipe unavailable; chưa mở/quan sát được ba route trong trình
duyệt. Không chạy test/lint/typecheck/build hay giao dịch. Cần kiểm tra thủ công
ba route bằng đơn thật ở desktop/mobile, lỗi metadata, PENDING/RESERVED/terminal,
CONFIRMED, các liên kết và print preview từ cả result lẫn ticket.

## Tách hành trình thanh toán và xem vé theo Lumière — 2026-11-12

- `/booking/checkout/:bookingId` và `/booking/result/:bookingId` dùng BookingOrderPage,
  không dùng giao diện quản lý đơn MyBookingsPage nữa. Checkout có nội dung kiểm
  tra bên trái và tổng tiền/giữ ghế bên phải; result có thông báo căn giữa và
  hành động theo trạng thái. Booking đến trạng thái cuối chuyển checkout sang result.
- `/booking/ticket/:bookingId` là trang thông tin vé đã xác nhận. Truy cập đơn
  chưa CONFIRMED chuyển về result sau khi đọc thành công. URL/query không xác nhận vé.
- Result CONFIRMED có thẻ vé và nút Xem vé. Danh sách và chi tiết đơn CONFIRMED
  cũng có liên kết tới trang vé. Thẻ theo reference có poster, tên phim, rạp/phòng,
  ngày giờ, ghế, capacity, mã đơn và tổng tiền; dùng placeholder/thử lại nếu metadata lỗi.
- Trang vé có In thông tin vé qua trình duyệt, CSS in riêng. Chưa có QR hoặc
  trạng thái sử dụng từ API, nên không tạo QR/barcode/nhãn sử dụng hay coi mã đơn
  là mã kiểm soát vào rạp. Thông tin phim/rạp hiện tại được ghi rõ khác snapshot giá.
- Đối chiếu DTO/controller/service BE mới: CreateBookingRequest/BookingResponse
  hỗ trợ paymentProvider VNPAY/MOMO. Chọn phương thức trong xác nhận trước khi tạo
  booking vì API checkout chỉ đọc, không đổi phương thức của đơn đã tạo. Gửi và
  đối chiếu provider với response; lưu vào request retry. Request cũ không provider
  vẫn giữ nguyên, không đổi fingerprint của yêu cầu đang chờ.
- Result chỉ kiểm tra payment, không có checkbox/nút trả tiền ngay trong phần
  kết quả. RECONCILIATION_REQUIRED không có hành động trả lại; SUCCEEDED vẫn chờ
  booking CONFIRMED. Chi tiết quản lý đơn cũ giữ nguyên chức năng hủy.
- Desktop có sidebar tổng tiền sticky; mobile xếp một cột. Không thêm giới hạn 8 khách.

Giới hạn so với demo: chưa có đồ ăn, mã ưu đãi, contact snapshot, guest lookup,
QR/used status. Không dựng các form/mutation giả. Thanh toán chuyển tới URI do
BE cung cấp; cấu hình return của provider cần trỏ về route FE đúng bookingId,
FE không tin các query báo thành công. Chưa xác minh return thực tế của provider.

Kiểm tra thủ công: chọn phương thức → xác nhận booking → checkout → provider →
result → Xem vé → in; mở vé từ danh sách/chi tiết; PENDING/RESERVED, SUCCEEDED
chờ CONFIRMED, reconciliation/failure/expiry, sửa URL, đổi tài khoản, ảnh lỗi,
metadata lỗi, reload và retry cùng request; desktop/mobile/print preview.
Chưa chạy các thao tác runtime trên; chỉ kiểm tra cú pháp/static.

## Giao diện danh sách vé theo reference — 2026-11-12

Trang `/account/bookings` đối chiếu `ticketsPage`/`orderCard` trong Lumière:
tiêu đề lớn, sidebar, tiêu đề danh sách gạch chân, poster, tên phim, rạp,
giờ/ngày chiếu, ghế, trạng thái đơn, tổng tiền và nút chi tiết. Tablet đưa giá và
nút xuống hàng; mobile chuyển sidebar thành hàng ngang và giữ poster nhỏ.
Phân trang dùng AppPagination, giữ page/size/total thật của API.

BookingTicketCard đọc context suất bằng API hiện có, chỉ cho các đơn trên trang
đã xác minh owner. Query dùng chung cache theo showtimeId, không polling metadata.
Đây là thay đổi so với ghi chú trước về không đọc thêm metadata cho danh sách:
response Booking chưa có movie/cinema/poster nên mỗi suất duy nhất trên trang có
thể cần bốn GET (showtime, movie, room, cinema). Các đơn cùng suất chia sẻ query.
Lỗi metadata không che mã/ghế/giá/trạng thái hay chặn mở chi tiết; có thử lại,
poster thiếu/lỗi dùng asset dự phòng của dự án. Nội dung phim/rạp là hiện tại,
không giả là snapshot lịch sử.

Khác reference: chỉ có “Tất cả giao dịch”, không dựng các tab lọc toàn lịch sử
Sắp xem/Đã xem/Chưa hoàn tất khi API chưa hỗ trợ lọc hoặc trạng thái sử dụng vé.
Không suy Đã sử dụng từ thời gian, không thêm badge thanh toán/vé giả hoặc nút
Mở vé khi chưa có contract vé điện tử. Sidebar giữ các đường dẫn đang hoạt động.
Kiểm tra thủ công: poster/tên phim, cùng suất ở nhiều đơn, lỗi metadata/ảnh,
mã dài, nhiều ghế, đơn chưa có giá, rỗng/lỗi API, phân trang và mở chi tiết trên
desktop/tablet/mobile. Chưa thực hiện kiểm tra trình duyệt hoặc giao dịch.

## Phạm vi đã nối

Sau tạo đơn, trang chi tiết theo dõi status từ BE và có phần phim/rạp/phòng/suất.
Metadata được đọc bằng context query chỉ ở chi tiết đơn của owner đã xác minh;
không gọi bổ sung cho từng item của danh sách. Không poll metadata; query trạng thái
booking vẫn poll PENDING/RESERVED. Đồng hồ giữ ghế dùng scheduler 1 giây.
Đơn REJECTED/CANCELLED/EXPIRED có liên kết chọn suất khác khi dữ liệu trạng thái
đã tải thành công. Không thêm thao tác đặt lại cho PENDING/RESERVED hoặc kết quả
thanh toán chưa rõ. Thông tin phim/rạp là dữ liệu hiện tại, không giả làm snapshot
lịch sử; ghế, tiền, đơn vị và trạng thái giữ nguyên từ booking response.

- `/booking/:showtimeId`: chọn ghế, xác nhận báo giá hiện có, gửi tạo đơn.
- `/booking/checkout/:bookingId`: kiểm tra thông tin đơn và phiên thanh toán sau khi tạo.
- `/booking/result/:bookingId`: theo dõi kết quả booking và payment; không tự xác nhận từ query của URL trả về.
- `/account/bookings`: phân trang đơn của tài khoản đăng nhập.
- `/account/bookings?bookingId=<UUIDv7>`: chi tiết đơn, giá/ghế đã lưu, trạng thái và hạn giữ ghế.
- Theo dõi PENDING/RESERVED mỗi 3 giây khi trang chi tiết đang mở; không tự gửi lại mutation.
- Hủy có xác nhận, chỉ bật cho RESERVED còn hạn; BE quyết định kết quả cuối cùng.

## Hợp đồng đã đối chiếu

Ghế được đọc qua generated client `getShowtimeSeatMap` từ
`GET /api/v1/showtimes/{showtimeId}/seat-map`. Kiểm tra đúng room/showtime,
mã ghế không trùng và dữ liệu hợp lệ trước khi hiển thị. Chỉ cho chọn ghế có
`selectable: true`, trạng thái AVAILABLE, showSeatId và giá VND hợp lệ.
Giữ nguyên API báo giá và tạo booking; lựa chọn chưa phải là giữ ghế.
Suất thiếu snapshot hiển thị lỗi, không lấy sơ đồ hiện tại của phòng để thay thế.

Đăng ký và xác minh email đã nối User Service tại `/register` và `/verify-email`;
xem `USER_REGISTRATION_FLOW.md`. Đăng ký không gửi mật khẩu; mật khẩu chỉ gửi
cùng token ở bước xác minh. Đăng nhập vẫn chuyển qua User Service bằng OIDC + PKCE.

Đọc source cục bộ `cinema-system` (không sửa BE):

- `BookingController`: POST/GET `/api/v1/bookings`, GET `/{bookingId}`, POST `/{bookingId}/cancel`.
- `CreateBookingRequest`, `BookingResponse`, `BookingServiceImpl`: clientRequestId theo user và fingerprint request, expectedTotalAmount; tạo trả HTTP 202.
- `BookingCancellationServiceImpl`, `Booking.cancel`: chỉ RESERVED, chưa đến expiresAt.
- `BookingSecurityConfig`: booking cá nhân yêu cầu xác thực; dữ liệu được giới hạn theo CurrentUser.
- `CustomerPaymentCheckoutController`, `CustomerPaymentCheckoutReadServiceImpl`,
  `PaymentSecurityConfig`: GET `/api/v1/payments/bookings/{bookingId}/checkout`
  dành cho chủ đơn đã xác thực. DTO có bookingId, paymentId, status, checkoutUri,
  holdExpiresAt. URI chỉ được trả cho PENDING_PROVIDER còn hạn.

Dùng generated client có sẵn, kiểm tra response ở feature và query key có subject. Không gửi userId từ UI để chọn chủ sở hữu đơn.

## Gửi tạo đơn và phục hồi

### Rà soát input/output — 2026-11-12

| Bước                 | Input FE                                                                                        | Output và cách sử dụng                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Chọn suất            | showtimeId từ route                                                                             | Đối chiếu showtime/movie/room/cinema; chỉ cho tiếp tục khi ngữ cảnh hợp lệ.                                                          |
| Đọc sơ đồ            | showtimeId                                                                                      | Kiểm tra room/showtime, ID/số ghế trùng, vị trí, trạng thái và giá; Bill tạm tính từ snapshot.                                       |
| Báo giá khi Tiếp tục | seats chứa seatNumber                                                                           | API tự áp dụng nhóm mặc định; response có ticketGroupId/name, loại ghế, đơn vị, capacity và giá. Kiểm tra đúng tập ghế và tổng tiền. |
| Tạo đơn mới          | clientRequestId, showtimeId, seats gồm seatNumber/ticketGroupId từ báo giá, expectedTotalAmount | HTTP 202, chưa phải giữ ghế thành công. Đối chiếu owner, showtime, clientRequestId, tập ghế và requestedTicketGroupId.               |
| Đọc chi tiết         | bookingId                                                                                       | PENDING/RESERVED poll mỗi 3 giây; dừng khi lỗi hoặc trạng thái cuối. Không dùng quote để thay giá đã lưu.                            |
| Hủy                  | bookingId, chỉ RESERVED còn hạn                                                                 | Xác nhận qua dialog; chỉ hiển thị hủy thành công theo response CANCELLED.                                                            |

Lỗi FE đã tìm thấy: trước lượt rà soát, quote dùng API theo nhóm vé nhưng POST
chỉ gửi seatNumbers, bỏ ticketGroupId vừa báo giá. Đơn mới chuyển sang seats theo
contract generated; không gửi đồng thời seatNumbers và seats. Request cũ đang
chờ trong sessionStorage vẫn retry nguyên payload và clientRequestId cũ để giữ
idempotency, không chuyển đổi request giữa chừng.

Không được quy mọi giá trị null cho lỗi này: BE tạo BookingSeat ban đầu chỉ có
số ghế và requestedTicketGroupId (nếu gửi). Loại ghế, giá, applied group và tổng
tiền/currency chỉ hoàn chỉnh khi SeatReservedConsumerServiceImpl nhận sự kiện,
gọi completeSnapshot rồi booking.reserve. Nhánh legacy của Inventory vẫn có thể
điền nhóm mặc định khi suất đã gắn bảng giá, nhưng dùng giá snapshot ShowSeat,
khác nhánh resolve theo ticketGroupId. Vì vậy bỏ group có thể gây PRICE_CHANGED,
không chứng minh toàn bộ dữ liệu null của một đơn runtime cụ thể.

UI phân biệt PENDING chưa có snapshot bằng số ghế yêu cầu và thông báo chờ,
không nhóm tất cả vào “Loại ghế chưa xác định”. RESERVED/CONFIRMED/PAYMENT_FAILED
thiếu loại ghế/giá/currency/tổng tiền có cảnh báo dữ liệu hệ thống chưa đầy đủ.
Nhóm vé không có tên không hiển thị dòng phụ. Không suy giá lịch sử từ giá hiện tại.

Giới hạn bằng chứng: đã đọc source FE/generated và BE, chưa quan sát response
của đơn người dùng báo lỗi, chưa gọi mutation runtime hay truy cập database.
Để kết luận trường hợp cụ thể, đối chiếu GET chi tiết: status, totalAmount,
currency, seats[].seatType/price/ticketGroupName/requestedTicketGroupId/ticketGroupId.
PENDING kéo dài cần kiểm tra chuỗi outbox/consumer và lỗi xử lý sự kiện ở BE;
không thể xác nhận consumer bị lỗi chỉ từ source FE.

Kiểm tra thủ công bổ sung: quote trả nhóm nào thì POST seats phải giữ nguyên ID
nhóm đó, không có seatNumbers; GET sau RESERVED phải có loại/giá/nhóm khớp.
Thử reload/retry một request legacy còn chờ để xác nhận payload không đổi;
kiểm tra PENDING chuyển RESERVED/REJECTED, lỗi tải detail và trạng thái cuối.

### Quy tắc vị trí ghế

- Chọn đúng một đơn vị ghế được phép đứng riêng; ghế đôi vẫn là đơn vị nguyên cặp.
- Cho phép chọn nhiều hàng. Trong từng hàng, các đơn vị đã chọn phải liền nhau
  theo row/column/span thực tế, không bắt buộc các hàng chọn cùng số ghế.
- Nếu cả đơn chọn nhiều ghế, không hàng nào được chỉ chọn một ghế đơn đứng riêng.
  G6 + F8 không hợp lệ; G6 + G7 + F8 vẫn lỗi tại F8. Thêm F9 để mỗi hàng thành
  cụm liền kề rồi tiếp tục kiểm tra ghế trống đơn còn lại. Ghế đôi nguyên cặp có
  hai chỗ không tính là một ghế đơn đứng riêng.
  Không nối qua lối đi, ô trống hay ghế không khả dụng; không suy từ nhãn/số ghế.
- Trong dải ghế đang khả dụng chứa lựa chọn, không được để lại đúng một ghế đơn
  ở đầu hoặc cuối. Một đơn vị ghế đôi còn lại không coi là một ghế đơn.
- Dải có bốn ghế trống 1–4: chọn 2–3 không hợp lệ, chọn 1–2 hoặc 3–4 hợp lệ;
  1–3–5 không hợp lệ; một ghế bất kỳ hợp lệ.
- Có thể tạm chọn một cấu hình chưa hợp lệ để bổ sung/bỏ ghế. Hiện lý do và khóa
  Tiếp tục; không quote hoặc tạo booking trước khi sửa. Kiểm tra lại sau quote
  và khi snapshot cập nhật; review đang mở sẽ đóng nếu phát sinh vi phạm.
- Ghế đơn đã bị cô lập ở dải khác trước đó không chặn lựa chọn hiện tại.
  Sơ đồ legacy thiếu vị trí không cho kiểm tra nhiều ghế, UI thông báo chọn suất khác.
- Đây là kiểm tra tại FE theo yêu cầu; không sửa quy tắc hoặc dữ liệu BE.

Kiểm tra thủ công: các ví dụ trên với một dải bốn ghế; thêm ghế để lấp khoảng trống;
bỏ ghế giữa cụm; lối đi; ghế BOOKED/HELD; ghế đôi; nhiều hàng đều hợp lệ hoặc chỉ
một hàng vi phạm thì chặn toàn bộ lựa chọn; G6 + F8 phải báo lỗi, chỉ G6 được phép;
ghế đôi nguyên cặp; snapshot thay đổi
trong lúc review. Bill vẫn tính ngay, không gọi quote chỉ vì chọn/bỏ ghế.

Bill cộng/trừ ngay giá từ snapshot ghế, cùng nguồn với giá theo loại ghế.
Không gọi quote khi chọn/bỏ ghế, không debounce hoặc giữ Bill của lựa chọn cũ.
Ghế đôi tính giá cả cặp một lần. Bill là tạm tính; chỉ khi bấm
“Tiếp tục · Kiểm tra đơn” mới gọi quote và chờ API trả về trước khi mở hộp thoại.
Đối chiếu showtime và tập ghế sau response; không xác nhận nếu lựa chọn đã đổi.
POST booking vẫn dùng expectedTotalAmount từ quote BE. Giữ refresh snapshot nền
để kiểm tra availability, không tự gọi lại quote khi focus/reconnect.
Kiểm tra thủ công: mở Network, chọn/bỏ nhiều ghế phải không có request quote;
bấm Tiếp tục mới có một quote. Thử mạng chậm, lỗi quote, giá thay đổi,
ghế bị người khác giữ và hủy review để quay lại chọn.

Từ sơ đồ, bấm “Tiếp tục · Kiểm tra đơn” để mở hộp thoại kiểm tra phim, rạp,
phòng, suất, ghế và giá từng vé. Hộp thoại dùng báo giá API, chưa gửi mutation.
“Quay lại chọn ghế” hoặc đóng hộp thoại giữ nguyên lựa chọn; chỉ “Xác nhận đặt vé”
mới tạo yêu cầu. Khi ghế hoặc giá thay đổi trong lúc xem lại, đóng hộp thoại và
yêu cầu kiểm tra lại; khi đang làm mới dữ liệu, tạm khóa xác nhận.
Response tạo đơn được lưu vào cache detail theo user; chuyển đến chi tiết đơn
để theo dõi trạng thái PENDING/RESERVED. Nếu điều hướng không thành công,
giữ liên kết tới đúng đơn vừa tạo và không cho gửi thêm một yêu cầu mới.

Lưu request đang gửi trong sessionStorage theo subject/suất chiếu. Khóa chọn ghế khi chờ kết quả; khi lỗi mạng, 5xx hoặc response không xác nhận được, giữ nguyên clientRequestId và payload để retry. Không tự tạo mã mới. Khi reload cùng tab, người dùng có thể gửi lại cùng yêu cầu. Lỗi validation xác định cho phép chọn lại ghế.

SessionStorage chỉ giúp phục hồi trong cùng tab; nếu mất bộ nhớ phiên, cần kiểm tra Vé của tôi trước khi đặt lại. Trang danh sách đọc booking từ BE, không coi lựa chọn local là ghế đã giữ.

## Giới hạn

- Checkout đã có API USER trong source hiện tại và được nối bằng generated client;
  ghi chú thiếu checkout trước đây đã cũ. Không tự tạo payment attempt, phương thức
  thanh toán hoặc đánh dấu thành công tại FE.
- Chưa có QR/vé điện tử từ API; CONFIRMED chỉ được hiển thị theo trạng thái BE.
- Danh sách dùng mã suất từ booking, không gọi N API bổ sung cho từng đơn. Chi tiết
  đọc metadata của một suất qua API hiện có và ghi rõ thông tin phim/rạp hiện tại.
- UI tiếp tục dùng design tokens và bố cục customer hiện có; không sao chép dữ liệu demo hoặc quy tắc giữ ghế cố định của reference.

## Kiểm tra thủ công

### Đối chiếu giao diện Lumière

- Danh sách Vé & giao dịch dùng sidebar tài khoản và các hàng đơn ngang theo
  `ticketsPage`/`orderCard` trong reference; giữ phân trang API hiện có.
- Chi tiết dùng phần trạng thái căn giữa theo `resultPage`, hai cột theo
  `orderPage`: thông tin suất/ghế bên trái, thông tin đơn/tổng tiền bên phải.
  Mobile xếp thành một cột; hành động và giá trong hàng đơn xuống dưới.
- Giá từng ghế và tổng tiền lấy từ đơn đã lưu. Thông tin phim/rạp tải riêng;
  lỗi metadata có nút thử lại và không che thông tin đơn.
- Khác reference: danh sách dùng ảnh dự phòng và tên chung “Đơn đặt vé” vì
  response chưa có tên/poster phim; không gọi thêm API cho từng hàng. Không
  dựng tab Sắp xem/Đã xem, QR, phương thức thanh toán hoặc thông tin liên hệ
  khi API chưa cung cấp. Giữ luồng hủy và polling trạng thái thật của BE.
- Kiểm tra thêm ở desktop/mobile: hàng đơn có mã dài, nhiều ghế, tổng tiền chưa
  xác định; mở chi tiết, lỗi tải metadata, các trạng thái đơn và hộp thoại hủy.

1. Đăng nhập USER, chọn suất đang mở bán, chọn ghế và kiểm tra Bill tạm tính cập nhật ngay.
2. Xác nhận đặt vé; kiểm tra POST một lần và chuyển sang chi tiết đơn.
3. Kiểm tra PENDING chuyển sang RESERVED/REJECTED theo xử lý BE; không báo thành công chỉ vì HTTP 202.
4. Ngắt mạng khi gửi rồi gửi lại/reload cùng tab: giữ cùng clientRequestId và payload, không tạo đơn thứ hai.
5. Mở Vé của tôi, phân trang và chi tiết; đăng xuất/đổi tài khoản không hiển thị đơn tài khoản trước.
6. Hủy đơn RESERVED còn hạn: mở xác nhận, giữ đơn hoặc hủy; kiểm tra CANCELLED từ BE. CONFIRMED/EXPIRED không có nút hủy khả dụng.
7. Kiểm tra lỗi tranh chấp ghế/giá, hết hạn và dữ liệu không hợp lệ; không tự xác nhận hoặc tự thanh toán.
8. Kiểm tra desktop/mobile và thao tác bàn phím trong hộp thoại.

Chỉ kiểm tra cú pháp/static trong lần triển khai; chưa chạy test, build/typecheck hoặc kiểm tra browser/runtime.

## Checkout và phần còn thiếu so với thiết kế — 2026-11-12

- Sau POST thành công, đi tới checkout riêng, dùng chung phần thông tin suất/đơn
  để không sao chép layout. Có route kết quả riêng, và chi tiết cũ vẫn truy cập được.
- Payment query có owner-scoped key, kiểm tra bookingId, DTO/status và ngày hết hạn.
  404 coi là chưa có phiên để tiếp tục chờ khi booking RESERVED; lỗi khác dừng
  polling và cho thử lại. Không log/lưu checkoutUri vào bộ nhớ phiên.
- RECEIVED/PROCESSING/PENDING_PROVIDER tự đọc lại mỗi 3 giây khi RESERVED.
  SUCCEEDED/FAILED/EXPIRED/RECONCILIATION_REQUIRED dừng payment polling; có thao tác
  kiểm tra lại. Booking vẫn dùng trạng thái BE, không suy CONFIRMED từ SUCCEEDED.
- Chỉ mở URI http(s) từ BE khi owner đúng, RESERVED, PENDING_PROVIDER, hai deadline
  còn hiệu lực, dữ liệu vừa đọc không lỗi và người dùng đã xác nhận kiểm tra lựa chọn.
  URI sai hoặc hết hạn không có hành động thanh toán khả dụng. Hết hạn không tự
  đánh dấu booking EXPIRED. Kết quả chưa xác định không có thao tác thanh toán lại.
- Mobile có thanh tóm tắt cố định và nút Tiếp tục dùng cùng instance checkout,
  cùng quote, dialog và mutation; không tạo thêm luồng gửi yêu cầu song song.
- Không áp dụng giới hạn 8 khách của demo. FE giới hạn tối đa 100 đơn vị ghế theo
  contract quote; không giới hạn tổng capacity bằng 8. BE còn cấu hình
  BOOKING_MAX_SEATS_PER_BOOKING (default 10 đơn vị); FE không thể bỏ giới hạn BE.
- Chưa có contract đồ ăn/giỏ hàng, ưu đãi trên đơn, thông tin người nhận trong
  booking, guest lookup, vé/QR hoặc sử dụng vé. Không tạo trang có nút giả hay
  hardcode hàng hóa/giá/QR để lấp các bước này. FE vẫn yêu cầu OIDC trước chọn ghế.
  Chưa thể gọi toàn bộ hành trình thiết kế là hoàn tất khi những contract này thiếu.

Kiểm tra thủ công checkout:

1. Tạo booking mới, xác nhận URL checkout có đúng bookingId; PENDING chưa cho trả tiền.
2. RESERVED nhưng payment 404: hiện chờ; khi URI sẵn sàng, chọn checkbox và mở cổng.
3. Hoàn tất ở provider, quay lại checkout/result và kiểm tra cả payment lẫn booking.
   Query URL như success=true không được làm đổi trạng thái.
4. SUCCEEDED nhưng booking còn RESERVED: hiện chờ xác nhận; không phát vé/QR giả.
5. RECONCILIATION_REQUIRED, FAILED, EXPIRED, lỗi mạng, URI thiếu/sai, hủy đơn và hết hạn:
   không được tiếp tục trả tiền; thử lại chỉ đọc API.
6. Đăng xuất/đổi tài khoản, sửa bookingId, reload và dùng đường dẫn chi tiết cũ.
7. Chọn trên 8 khách (kể cả ghế đôi), kiểm tra quy tắc ghế và giới hạn BE riêng;
   không nhầm số khách với số đơn vị ghế. Mobile Tiếp tục phải dùng đúng quote hiện tại.

Chưa thực hiện giao dịch, kiểm tra browser hoặc các tình huống runtime trên đây.
