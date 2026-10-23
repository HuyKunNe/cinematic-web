# Đặc tả workflow thiết kế sơ đồ ghế hiện tại

Ngày đối chiếu: 23/10/2026.

- FE: `c2469d3570293878682e40785f6a04603d9a2b6d`.
- BE: `6c3f371495f8eb3381b361cecc9d7c394dc8c2bc`.
- Phạm vi: hành vi đang triển khai trong mã nguồn; không phải luồng mô phỏng của bộ thiết kế mới.
- Tài liệu mô tả qua đọc mã nguồn, chưa xác nhận bằng chạy ứng dụng hoặc kiểm thử.

## 1. Mục đích và quyền truy cập

Quản trị viên thiết kế sơ đồ cho một phòng chiếu cụ thể, lưu thành các phiên bản và xuất bản phiên bản hợp lệ để sử dụng khi cấu hình suất chiếu.

FE yêu cầu đăng nhập, vai trò Admin và quyền `inventory:manage`. BE kiểm tra quyền độc lập.

| Đối tượng | Ý nghĩa |
| --- | --- |
| Ghế của phòng | Ghế trong danh mục, có `seatId` |
| Phiên bản sơ đồ | Vị trí, số hiển thị và loại ghế của từng phiên bản |
| Ghế của suất chiếu | Trạng thái bán/giữ ghế của một suất cụ thể |

Sơ đồ phòng không hiển thị tình trạng ghế đang được đặt hay đã bán.

## 2. Luồng tổng thể

1. Mở trang **Thiết kế sơ đồ ghế** của phòng.
2. Hệ thống tải thông tin phòng và danh sách phiên bản.
3. Chọn mở phiên bản có sẵn hoặc **Tạo bản nháp trống**.
4. Chỉnh hàng, cột, vị trí và loại ghế.
5. **Lưu nháp**.
6. **Xuất bản** khi nội dung hợp lệ và không còn thay đổi chưa lưu.
7. Muốn sửa phiên bản đã xuất bản: **Tạo bản nháp từ phiên bản này**, chỉnh sửa rồi lưu và xuất bản phiên bản mới.

Có thể mở trực tiếp một phiên bản bằng `layoutId` trên URL. Phiên bản đang mở được đồng bộ vào liên kết.

## 3. Tạo và mở bản nháp

| Thao tác | Kết quả |
| --- | --- |
| Tạo bản nháp trống | Tạo phiên bản mới trên máy chủ, mặc định 6 hàng × 6 cột, chưa có ghế |
| Mở bản nháp | Cho phép chỉnh sửa |
| Mở phiên bản đã xuất bản | Chỉ xem |
| Sao chép phiên bản đã xuất bản | Tạo bản nháp mới trong cùng phòng, giữ bố trí, số, loại và liên kết `seatId` |
| Tải lại phiên bản | Đọc lại nội dung từ máy chủ; hỏi trước nếu phải bỏ thay đổi chưa lưu |

Số phiên bản do BE cấp. Sao chép không sửa phiên bản nguồn và không tạo thêm ghế danh mục ngay tại bước sao chép.

## 4. Không gian thiết kế

Giao diện gồm:

- Thanh thao tác: quay lại phòng, ghế của phòng, lưu nháp, xuất bản.
- Khu vực chọn và quản lý phiên bản.
- Thanh công cụ: tạo lại sơ đồ, hoàn tác, làm lại, số hàng/cột.
- Ma trận ghế, nhãn hàng và màn hình chiếu ở phía trên.
- Khu vực chỉnh ô đang chọn, loại ghế và thao tác cấu trúc.

Ma trận hỗ trợ cuộn ngang. Màn hình chiếu là thành phần hiển thị cố định của editor; sơ đồ dạng ma trận không yêu cầu lưu một phần tử `SCREEN` riêng để xuất bản.

## 5. Thêm ghế và đánh số

Người dùng chọn một ô trống, nhập số nguyên dương và xác nhận bằng Enter hoặc chọn loại ghế. Phím Space tại ô trống hỗ trợ thêm nhanh ghế.

Quy tắc hiện tại:

- Nhãn hàng tự sinh: `A…Z, AA, AB…`.
- Số ghế tự chuẩn hóa từ `1…n`, theo vị trí từ trái sang phải, bỏ qua ô trống.
- Số người dùng nhập không phải số ghế cố định: nhập trùng vẫn được chấp nhận rồi đánh số lại.
- Ô đã có ghế hiển thị dạng `A1`, `A2` và không sửa trực tiếp số.
- Ô trống có thể dùng để tạo khoảng cách hoặc lối đi; chưa có loại đối tượng “lối đi” riêng.
- Loại vừa chọn được ghi nhớ cho các ô nhập tiếp theo.

Ví dụ: hàng A có ghế tại cột 1, 2 và 5 thì hiển thị `A1`, `A2`, `A3`.

## 6. Loại ghế và ghế đôi

| Loại | Diện tích trên ma trận |
| --- | --- |
| Standard | 1 ô |
| VIP | 1 ô |
| Couple | 2 ô liền nhau theo chiều ngang |
| Accessible | 1 ô |

Ghế Couple là một ghế có một số hiển thị, chiếm hai cột.

Điều kiện thêm hoặc đổi sang Couple:

- Phải còn một ô bên phải.
- Ô bên phải chưa có ghế.
- Không được chồng lên nội dung nhập chưa xác nhận ở ô bên phải.
- Không thể thêm ghế khác vào nửa thứ hai của Couple.

Đổi Couple về loại một ô sẽ giải phóng phần diện tích bên phải.

## 7. Chỉnh cấu trúc

| Thao tác | Hành vi |
| --- | --- |
| Xóa ghế | Bỏ ghế, giữ vị trí trống, đánh số lại hàng |
| Chèn ô bên phải | Dịch phần sau của hàng sang phải; tự tăng số cột nếu cần |
| Xóa ô | Xóa vùng đang chọn, dịch phần sau của hàng sang trái |
| Chèn hàng trên/dưới | Thêm hàng trống, cập nhật nhãn hàng |
| Xóa hàng | Xóa hàng và các ghế trong hàng |
| Chèn cột trái/phải | Thêm cột trên toàn bộ các hàng |
| Xóa cột | Xóa cột và đánh số lại; Couple đi qua cột đó bị xóa toàn bộ |
| Di chuyển hàng | Kéo nhãn hàng hoặc dùng Alt + ↑/↓; nhãn hàng cập nhật theo vị trí mới |
| Tạo sơ đồ mới trong editor | Đặt lại nội dung đang chỉnh về ma trận trống 6 × 6; chưa tạo phiên bản máy chủ mới |

Không được chèn ô vào giữa hai phần của ghế đôi.

Giới hạn: **1–100 hàng, 1–100 cột, tối đa 2.500 ghế**. Không thể xóa hàng hoặc cột cuối cùng.

## 8. Nội dung nhập chưa xác nhận và hoàn tác

Nội dung đang nhập nhưng chưa xác nhận được theo dõi riêng với ghế đã tạo.

- Có lỗi nhập thì hiển thị lỗi tại ô và thông báo tương ứng.
- Phải xác nhận hoặc bỏ nội dung đang nhập trước khi thực hiện các thao tác cấu trúc được bảo vệ.
- Nội dung chưa xác nhận vẫn được tính là thay đổi chưa lưu.
- Hoàn tác/làm lại lưu tối đa **50 bước** trong phiên editor; không phải lịch sử phiên bản trên máy chủ.

| Phím | Thao tác |
| --- | --- |
| Enter | Xác nhận ô đang nhập |
| Space | Thêm nhanh ghế tại ô trống |
| Delete | Xóa ghế đang chọn, giữ ô trống |
| Escape | Bỏ nội dung nhập đang chờ |
| Mũi tên, Home/End | Di chuyển trong ma trận |
| Tab / Shift + Tab | Di chuyển giữa các ô |
| Alt + ↑/↓ tại nhãn hàng | Di chuyển hàng |
| Ctrl/⌘ + S | Lưu nháp khi đủ điều kiện |
| Ctrl/⌘ + Z | Hoàn tác khi không nhập văn bản |
| Ctrl/⌘ + Shift + Z hoặc Ctrl + Y | Làm lại |

## 9. Lưu nháp

Nút lưu khả dụng khi đang mở bản nháp, có thay đổi, không có thao tác mạng đang chạy và không bị yêu cầu tải lại.

Khi lưu:

1. Kiểm tra và xác nhận nội dung đang nhập.
2. Kiểm tra ma trận hợp lệ.
3. Gửi toàn bộ nội dung ma trận kèm `expectedVersion`.
4. Nhận nội dung và phiên bản cập nhật.
5. Ghi nhận nội dung vừa lưu làm mốc so sánh thay đổi.

Lưu nháp không tạo hoặc sửa ghế trong danh mục phòng. Bản nháp chưa có ghế không đủ điều kiện xuất bản.

`layoutVersion` là số phiên bản nghiệp vụ; `version` dùng kiểm tra cập nhật đồng thời. Hai giá trị này khác nhau.

## 10. Xuất bản

Chỉ cho xuất bản khi:

- Phiên bản đang là `DRAFT`.
- Có ít nhất một ghế.
- Không còn thay đổi chưa lưu.
- Không có yêu cầu mạng đang chạy hoặc lỗi bắt buộc tải lại.

BE kiểm tra ma trận, liên kết các ghế đã có `seatId` và tạo ghế danh mục cho những vị trí chưa được liên kết. Liên kết ghế và xuất bản nằm trong cùng giao dịch.

Sau thành công:

- Phiên bản chuyển sang `PUBLISHED` và chỉ xem.
- FE tải lại nội dung để nhận các `seatId` vừa được gắn.
- Nếu tải lại thất bại, phiên bản vẫn giữ trạng thái đã xuất bản.
- Không tự thay sơ đồ của các suất chiếu hiện có.
- Không suy luận danh tính ghế từ số hiển thị như `A1`.

## 11. Lỗi và bảo vệ thay đổi

| Tình huống | Xử lý hiện tại |
| --- | --- |
| Rời trang hoặc đổi phiên bản khi chưa lưu | Hỏi xác nhận bỏ thay đổi |
| Đóng/tải lại tab khi đang chỉnh hoặc đang ghi | Dùng cảnh báo của trình duyệt |
| Xung đột phiên bản, phiên bản đã xuất bản hoặc không còn tồn tại | Yêu cầu tải lại trước khi ghi tiếp |
| Mất kết nối hoặc chưa xác nhận được kết quả ghi | Không tự gửi lại; yêu cầu kiểm tra/tải lại |
| Chưa xác nhận kết quả tạo bản nháp | Chặn tạo thêm cho đến khi tải và kiểm tra danh sách |
| Mở sơ đồ dạng hình học cũ không tương thích | Không tự chuyển đổi sang ma trận để ghi đè |

## 12. Khác biệt với bản thiết kế tham chiếu mới

Hệ thống hiện tại quản lý bằng bản nháp và phiên bản xuất bản bất biến. Không dùng quy tắc đơn giản “phòng chưa có vé thì sửa trực tiếp sơ đồ đang sử dụng”.

## 13. Nguồn đối chiếu

- [Trang thiết kế FE](https://github.com/HuyKunNe/cinematic-web/blob/c2469d3570293878682e40785f6a04603d9a2b6d/src/features/rooms/admin/pages/AdminRoomLayoutPage.vue).
- [Component editor](https://github.com/HuyKunNe/cinematic-web/blob/c2469d3570293878682e40785f6a04603d9a2b6d/src/features/rooms/admin/components/AdminSeatMatrixEditor.vue).
- [Logic ma trận](https://github.com/HuyKunNe/cinematic-web/blob/c2469d3570293878682e40785f6a04603d9a2b6d/src/features/rooms/admin/composables/use-admin-seat-matrix.ts).
- [Hợp đồng API BE](https://github.com/HuyKunNe/cinema-system/blob/6c3f371495f8eb3381b361cecc9d7c394dc8c2bc/services/inventory-service/src/main/java/com/cinema/inventory/controller/RoomLayoutController.java).
- [Liên kết ghế khi xuất bản](https://github.com/HuyKunNe/cinema-system/blob/6c3f371495f8eb3381b361cecc9d7c394dc8c2bc/services/inventory-service/src/main/java/com/cinema/inventory/service/RoomLayoutSeatBindingService.java).
