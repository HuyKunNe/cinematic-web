# OpenAPI Generation

## Nguồn OpenAPI

Backend phục vụ OpenAPI động qua springdoc. Frontend đọc spec trực tiếp từ các
service local trong `orval.config.ts`; không cần lưu snapshot thủ công để chạy
generate.

| Service   | URL cấu hình                        |
| --------- | ----------------------------------- |
| Movie     | `http://localhost:8081/v3/api-docs` |
| User      | `http://localhost:8082/v3/api-docs` |
| Inventory | `http://localhost:8083/v3/api-docs` |
| Booking   | `http://localhost:8084/v3/api-docs` |
| Payment   | `http://localhost:8085/v3/api-docs` |

Các port theo API inventory. Runtime OpenAPI URLs cần có service đang chạy và
trả về document hợp lệ.

## Generate hoặc cập nhật client

Khởi chạy các backend services cần thiết, sau đó chạy trong repository frontend:

```bash
npm run api:generate
```
