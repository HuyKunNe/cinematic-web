# Deferred Features and API Gaps

## R28 — Notification Service

**Status: DEFERRED**

R28 không thuộc phạm vi frontend hiện tại. Không scaffold notification pages, API client, DTO, route, store hoặc UI component dựa trên `/api/v1/notifications/**`.

Gateway config có khai báo route notification, nhưng chưa có controller/API contract đủ để kết luận service sẵn sàng. Chỉ bắt đầu tích hợp khi R28 được đưa vào phạm vi và backend công bố contract thực tế.

## API chưa có contract/controller cho frontend

Các mục dưới đây chưa được xác nhận là API usable trong controller inventory hiện tại. Không tự tạo endpoint hoặc response DTO.

| Feature                                                | Trạng thái                                                                | Hệ quả frontend                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Featured movie/hero ordering                           | Chưa thấy API hoặc field featured/order                                   | Không tự chọn phim hero hoặc thứ tự carousel                                     |
| Promotions/coupons/combo                               | Chưa thấy controller/API                                                  | Không hiển thị dữ liệu khuyến mãi giả                                            |
| Membership/points                                      | Chưa thấy controller/API                                                  | Không hiển thị profile, điểm hoặc quyền lợi thành viên giả                       |
| Movie rating/reviews                                   | `MovieResponse` không có rating                                           | Ẩn rating cho đến khi backend có contract                                        |
| Movie search/filter/pagination                         | `GET /movies` không khai báo query filter/pagination                      | Không giả định server hỗ trợ; xác nhận trước khi thiết kế search/filter thật     |
| Payment initiation từ UI                               | Không tìm thấy controller tạo payment                                     | Không tự dựng endpoint thanh toán; luồng hiện bắt đầu qua booking/payment saga   |
| GET payment theo ID                                    | Security matcher tồn tại nhưng không tìm thấy controller method tương ứng | Chưa dùng như endpoint usable                                                    |
| `inventory:write`                                      | Permission security yêu cầu nhưng thiếu trong enum/seed đã kiểm tra       | Không gọi hold/book/release trực tiếp từ frontend                                |
| `payment:refund`, `payment:audit`, `payment:reconcile` | Security config yêu cầu nhưng thiếu trong enum/seed đã kiểm tra           | Không bật thao tác/trang tương ứng chỉ dựa trên role                             |
| Static OpenAPI snapshot                                | Không có OpenAPI JSON/YAML commit trong repo                              | Trước khi chạy Orval, cần export/kiểm tra spec runtime và xác nhận nguồn ổn định |

## Quy tắc xử lý

- Không scaffold code cho feature được đánh dấu deferred.
- Không phát minh URL, HTTP method, DTO, enum hoặc response.
- Chỉ tích hợp feature khi backend source hoặc OpenAPI runtime xác nhận contract.
- Nếu backend contract thiếu, giữ rõ trạng thái “chưa hỗ trợ/chưa xác nhận”; không giả lập API thành dữ liệu sản phẩm.
