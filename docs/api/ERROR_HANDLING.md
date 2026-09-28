# API Error Handling

## Response shape

Lỗi từ common REST exception handler và servlet security handlers dùng:

```json
{
  "success": false,
  "timestamp": "2026-09-28T09:00:00Z",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "category": null,
    "details": [
      {
        "field": "title",
        "message": "Movie title is required"
      }
    ]
  }
}
```

Các field:

- `success`: boolean.
- `timestamp`: thời điểm phản hồi, `OffsetDateTime`.
- `data`: null cho response lỗi chuẩn.
- `error.code`: mã lỗi ổn định.
- `error.message`: thông báo tổng quát.
- `error.category`: nhóm lỗi; có thể null ở một số lỗi.
- `error.details`: danh sách field/message cho một số lỗi validation; có thể null.

Các lỗi protocol OAuth2/OIDC và phản hồi provider webhook có format riêng, không mặc định theo `ApiResponse`.

## HTTP status mapping

| Tình huống                             |            HTTP status | Hành vi frontend                                                              |
| -------------------------------------- | ---------------------: | ----------------------------------------------------------------------------- |
| Bean validation / invalid request body |                  `400` | Hiển thị lỗi trường nếu `details` có dữ liệu; giữ lại dữ liệu form            |
| Constraint violation                   |                  `400` | Chuẩn hóa thành lỗi đầu vào; không hiển thị raw exception                     |
| Business conflict                      |                  `409` | Hiển thị hướng xử lý theo `error.code`, ví dụ ghế không còn khả dụng          |
| Resource not found                     |                  `404` | Hiển thị trạng thái không tìm thấy phù hợp với trang                          |
| Unauthorized                           |                  `401` | Khởi động lại/tiếp tục OIDC flow nếu phiên không hợp lệ                       |
| Forbidden                              |                  `403` | Hiển thị không đủ quyền; không lặp lại request                                |
| Resource locked                        |                  `423` | Hiển thị tài nguyên đang bị khóa/thao tác sau                                 |
| Internal server error                  |                  `500` | Thông báo chung và cho phép thử lại khi phù hợp                               |
| Network/timeout                        | Không có HTTP response | Hiển thị lỗi kết nối; mutation không được retry tự động nếu chưa biết kết quả |

Business exception được ánh xạ theo category:

- `VALIDATION` → `400`
- `BUSINESS` → `409`
- `RESOURCE` → `404`
- `SECURITY` → `401`
- `SYSTEM` → `500`

Các exception cụ thể như `ForbiddenException`, `UnauthorizedException`, `ConflictException`, `NotFoundException`, `ResourceLockedException` có status handler riêng.

## Thành công không thống nhất wrapper

Không áp dụng một response parser duy nhất cho tất cả API:

- Catalog và Inventory thường trả DTO/list trực tiếp.
- User profile trả DTO trực tiếp.
- Booking bọc thành công trong `ApiResponse<T>`.
- Refund/reconciliation trả DTO trực tiếp.
- Một số mutation trả `204` không có body.
- Booking create trả `202 Accepted`, body là `ApiResponse<BookingResponse>`.
- Provider webhook trả raw body/status theo provider acknowledgement.

HTTP client hoặc mapper phải hỗ trợ response trực tiếp, `ApiResponse`, body rỗng và raw webhook response theo đúng endpoint.

## Error codes và validation

Một số mã lỗi xuất hiện trong DTO/common handler:

- `VALIDATION_ERROR`
- `CONSTRAINT_VIOLATION`
- `INVALID_REQUEST_BODY`
- `RESOURCE_NOT_FOUND`
- `INTERNAL_SERVER_ERROR`

Domain services trả mã nghiệp vụ cụ thể, ví dụ booking/inventory codes trong backend. Frontend nên giữ `error.code` trong normalized error model và chỉ map các mã đã hiểu sang thông báo thân thiện. Không phụ thuộc vào nội dung message làm logic.

Validation field lỗi có thể không cùng format giữa bean validation, constraint violation và lỗi domain. Luôn xử lý `details` nullable.

## Chuẩn hóa lỗi phía frontend

Đề xuất model nội bộ:

```text
ApiError
- status: number | null
- code: string | null
- message: string
- category: string | null
- fieldErrors: Array<{ field: string; message: string }>
- requestId: string | null
- correlationId: string | null
- retryable: boolean
```

Quy tắc:

- Lấy `requestId`/`correlationId` từ response headers nếu có.
- Không hiển thị stack trace, nội dung exception nội bộ, hoặc raw server dump.
- Không biến lỗi 403 thành lỗi validation.
- Không tự động retry booking/payment mutation.
- Với booking 202, trạng thái `PENDING` là trạng thái xử lý, không phải lỗi; poll GET booking theo chiến lược được duyệt.

## OAuth2/OIDC và provider errors

- OAuth2 protocol errors như `invalid_grant` có thể không theo common `ApiResponse`; xử lý theo OIDC client và response protocol.
- User Service login page có thể trả HTML thay vì JSON.
- Provider webhook nhận và trả bytes/status/content-type theo provider; đây không phải API giao diện khách hàng.
