# Đề xuất FE: quản lý ma trận giá vé và tạo suất chiếu

> Bản thay thế cho đề xuất FE suất chiếu cũ. Repository FE chỉ đọc; hãy tự chép nội dung đã duyệt vào tài liệu tương ứng trong repo `cinematic-web`.
>
> Mockup tham khảo: `admin-showtime-create.html`, `admin-pricing-policy.html`, `customer-ticket-selection.html`. Bảng giá trong mockup đọc từ ảnh mang nhãn CGV, chỉ là dữ liệu minh họa; không hardcode làm giá production.

## 1. Mục tiêu giao diện

Tách 3 thao tác mà giao diện cũ dễ gộp nhầm:

1. **Cấu hình chính sách giá theo rạp:** nhập ma trận format × nhóm ngày × giờ × nhóm vé × loại ghế, kiểm tra và publish phiên bản.
2. **Tạo suất chiếu:** chọn phim, rạp, phòng và giờ. Format/phiên bản nội dung phải phù hợp với phòng/phim; FE không nhập giá và không tự chọn layout đã publish.
3. **Khách đặt vé:** chọn loại vé cho từng ghế; loại ghế lấy từ seat map. FE lấy báo giá từ BE, không tự cộng tiền.

## 2. Luồng quản trị chính sách giá

Trang `AdminPricingPolicyPage`:

- Bộ lọc/chọn cinema, phiên bản policy, hiệu lực và trạng thái Draft/Published.
- Chọn loại trải nghiệm `Tiêu chuẩn`, `Premium Cinema`, `4DX`, `IMAX` và phiên bản nội dung `2D/3D`; nhãn hiển thị có thể ghép như `4DX · 3D`.
- Bảng giá có nhóm ngày làm cột lớn; khung giờ, nhóm vé và seat type là hàng/cột con. Dùng scroll ngang có sticky tên chiều ở màn nhỏ.
- Có thể chỉnh sửa ô tiền, ghi rõ VND, đánh dấu ô thiếu hoặc xung đột. Không áp dụng giá trị mặc định âm thầm cho ô trống.
- Các điều kiện “trước 17:00”, “suất chiếu đầu tiên”, “Thứ Tư Vui Vẻ”, Premium Cinema và phụ thu hiển thị thành điều kiện có nhãn rõ ràng.
- Phụ thu `VIP +5.000`, `blockbuster +5.000`, `Sweetbox +25.000` (2D) và `Sweetbox +20.000` cho vé ưu đãi 3D được đặt ở phần riêng. Không cộng phụ thu lần nữa lên ô đã là giá trọn gói.
- Nút **Kiểm tra ma trận** gọi BE validate; nút **Publish** chỉ bật khi BE trả valid. Khi publish, hiển thị version và ngày áp dụng.
- Bản published chỉ đọc; thao tác “Sửa” tạo draft/revision mới.

## 3. Luồng tạo suất chiếu

Trang `AdminShowtimeCreatePage`:

- Trường: cinema, movie, room, startsAt/endsAt, projection/experience format và content format nếu cần.
- Loại trải nghiệm có thể được BE suy ra từ phòng hoặc được chọn trong các khả năng phòng hỗ trợ. FE không tạo danh sách tĩnh; lấy từ API phòng/phim. Gửi riêng `experienceType` và `contentFormat` nếu contract yêu cầu.
- Phần **Sơ đồ phòng** chỉ đọc: layout PUBLISHED mà BE sẽ gắn, version, số ghế. Nêu lỗi rõ ràng nếu chưa publish layout.
- Phần **Xem trước giá** chỉ đọc: policy version, ngày/giờ được phân loại, bảng theo nhóm vé và seat type, cùng cảnh báo ô giá chưa cấu hình.
- Không có input `basePrice`, hệ số ghế hay lựa chọn layout tùy ý. Không gửi `basePrice` trong payload.
- Khi lưu, gửi `movieId`, `roomId`, thời gian và format nếu contract BE yêu cầu. BE chịu trách nhiệm gắn layout và policy version.
- Lỗi `PUBLISHED_ROOM_LAYOUT_REQUIRED`, `PUBLISHED_CINEMA_PRICING_POLICY_REQUIRED`, `TICKET_PRICE_RULE_NOT_FOUND`, `SHOWTIME_FORMAT_NOT_SUPPORTED` được chuyển thành thông báo có hành động phù hợp.

## 4. Luồng khách chọn vé

- Hiển thị format, ngày/giờ và rạp đã chọn; dùng API seat map để biết seat type và trạng thái.
- Sau khi chọn ghế, khách gán `ticketCategory` cho mỗi ghế (Adult, Child, Student, Senior, Young/member nếu backend xác nhận contract).
- Trước xác nhận, gọi `POST /api/v1/bookings/quote`; hiển thị giá từng vé, phụ thu và tổng. Không tính giá ở FE và không cho sửa tổng.
- Nếu khách chọn loại vé ưu đãi nhưng chưa đạt điều kiện, hiển thị hướng dẫn và dùng lỗi từ BE; không giả định membership/tuổi/giấy tờ chỉ từ giá trị dropdown.
- Quote cần có thời hạn; khi hết hạn, FE yêu cầu lấy báo giá mới trước khi thanh toán.

## 5. API integration đề xuất

Các route dưới đây cần đối chiếu OpenAPI trước khi triển khai. Đây là đề xuất contract, không mặc định đã có trong BE.

```http
GET  /api/v1/cinemas/{cinemaId}/pricing-policies/active
GET  /api/v1/cinemas/{cinemaId}/pricing-policies/{policyId}
POST /api/v1/cinemas/{cinemaId}/pricing-policies/{policyId}/validate
POST /api/v1/cinemas/{cinemaId}/pricing-policies/{policyId}/publish
POST /api/v1/showtimes/pricing-preview
POST /api/v1/bookings/quote
```

Tạo suất chiếu sau khi BE bỏ giá cố định:

```json
{
  "movieId": "movie-uuid",
  "roomId": "room-uuid",
  "startsAt": "2026-10-23T19:00:00+07:00",
  "endsAt": "2026-10-23T21:12:00+07:00",
  "experienceType": "STANDARD",
  "contentFormat": "3D"
}
```

Request preview:

```json
{
  "cinemaId": "cinema-uuid",
  "roomId": "room-uuid",
  "movieId": "movie-uuid",
  "startsAt": "2026-10-23T19:00:00+07:00",
  "experienceType": "STANDARD",
  "contentFormat": "3D"
}
```

Response mẫu:

```json
{
  "policy": { "id": "policy-uuid", "version": 4, "currency": "VND" },
  "resolved": {
    "dayGroup": "FRI_SAT_SUN_HOLIDAY",
    "timeBand": "17_21_30",
    "isFirstShowing": false
  },
  "fares": [
    { "ticketCategory": "ADULT", "seatType": "STANDARD", "amount": 150000 },
    { "ticketCategory": "ADULT", "seatType": "VIP", "amount": 200000 }
  ],
  "surcharges": [],
  "warnings": []
}
```

Quote request:

```json
{
  "showtimeId": "showtime-uuid",
  "items": [
    { "seatId": "seat-uuid-1", "ticketCategory": "ADULT" },
    { "seatId": "seat-uuid-2", "ticketCategory": "STUDENT" }
  ]
}
```

## 6. Khu vực FE cần cập nhật

Đối chiếu cây source hiện tại trước khi sửa. Các component dưới đây là vai trò cần có; không tạo file trùng nếu dự án đã có tương đương.

| Khu vực                                             | Thay đổi                                                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Admin showtimes list / route `/admin/showtimes/new` | Thay placeholder bằng form tạo suất chiếu; bỏ trường giá cố định.                                    |
| Admin showtime form                                 | Tải cinema/room/movie/format, published seat map, pricing preview; validate và map lỗi.              |
| Admin pricing policy                                | Tạo bảng giá theo ma trận; edit draft, validate, publish, xem lịch sử version.                       |
| Customer seat booking                               | Gán nhóm vé từng ghế; gọi quote và hiển thị breakdown.                                               |
| API client và DTO                                   | Sinh lại từ OpenAPI sau khi BE chốt contract; không sửa trực tiếp file generated.                    |
| Design tokens                                       | Dùng biến hiện có cho màu, spacing, width, height, typography, breakpoint phù hợp với quy ước dự án. |

Gợi ý component boundaries: `PricingPolicyVersionBar`, `ExperienceFormatTabs`, `FareMatrixTable`, `SurchargeRulesPanel`, `PolicyValidationSummary`, `PublishedLayoutSummary`, `ShowtimePricingPreview`, `SeatTicketCategoryPicker`, `BookingQuoteSummary`.

## 7. Quy tắc tránh sai giá

- Không đặt giá vé thật trong Vue constants, mock fixture production, `class` CSS, route params hoặc `localStorage`.
- Mock HTML dùng giá của ảnh chỉ để kiểm tra bố cục. Khi nối API, mọi dữ liệu giá phải lấy từ BE.
- Không suy diễn tariff áp dụng cho toàn bộ cinema chain. Mỗi policy có `cinemaId`, version và ngày hiệu lực.
- Không cộng phụ thu trùng lên rate đã bao gồm VIP/Sweetbox/format.
- Hiển thị cả đơn vị và ngữ cảnh: `150.000 ₫ · người lớn · 3D · cuối tuần · 17:00–21:30`.
- Bảng rộng dùng overflow ngang có keyboard access; trên mobile đổi sang nhóm ngày/khung giờ dạng card hoặc selector, không ép chữ nhỏ tới mức khó đọc.
- Giá preview không phải cam kết cuối cùng; quote từ BE mới là giá checkout.

## 8. Mockup HTML/CSS

Mở `index.html` trong thư mục mockup. Các trang:

1. `admin-pricing-policy.html`: ma trận chính sách theo 2D, 3D, 4DX, IMAX và ưu đãi.
2. `admin-showtime-create.html`: tạo suất chiếu và preview giá theo metadata đã chọn.
3. `customer-ticket-selection.html`: chọn loại vé theo ghế và xem quote.

Mockup là static HTML/CSS; tabs/inputs chỉ minh họa bố cục và chưa gọi API. CSS tập trung token trong `styles.css`, gồm màu, font, spacing, width, height, control và layout.

## 9. Trình tự tích hợp

1. Cập nhật proposal BE và chốt API/enum/dữ liệu policy với BE.
2. Sinh lại API client/model từ OpenAPI.
3. Làm trang quản lý policy và form tạo suất chiếu theo mockup.
4. Làm quote cho bước chọn ghế/loại vé; BE là nguồn tính giá.
5. Kiểm tra responsive, trạng thái loading/error/empty và keyboard navigation; chạy kiểm tra FE theo lệnh trong README của repo.

## 10. Commit message gợi ý

```text
feat(showtimes): add cinema pricing matrix preview and ticket quote UI
```
