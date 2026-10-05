# OpenAPI Generation

## Baseline đối chiếu

- Backend: 00c759d574e44edc855cff866c9cc1a66af2c72b.
- Frontend: 4856878d420efa562a357d673e93eab04d463b32.
- Ngày đối chiếu source: 2026-10-05.
- Chưa xác minh runtime OpenAPI trong lần cập nhật này.

## Nguồn OpenAPI

orval.config.ts hiện đọc trực tiếp OpenAPI của các service local:

| Service           | URL                               |
| ----------------- | --------------------------------- |
| movie-service     | http://localhost:8081/v3/api-docs |
| user-service      | http://localhost:8082/v3/api-docs |
| inventory-service | http://localhost:8083/v3/api-docs |
| booking-service   | http://localhost:8084/v3/api-docs |
| payment-service   | http://localhost:8085/v3/api-docs |

Đây là URL đang cấu hình, không phải xác nhận các service đang chạy.

## Script và output

Script đã khai báo trong package.json: npm run api.

Script này gọi Orval với orval.config.ts.
package.json hiện không khai báo api:generate.

Generated client:
src/services/api/generated/<service>/.

Generated models:
src/services/api/generated/<service>/model/.

Mutator:
src/services/http/axios-instance.ts, hàm apiRequest.

Không sửa generated files bằng tay.

## Quy trình khi contract thay đổi

1. Đối chiếu controller, DTO, validation, security và operationId ở BE.
2. Đọc runtime spec từ đúng service và môi trường.
3. Review và lưu snapshot cùng metadata theo quy định repository.
4. Generate bằng script api khi được thực hiện round cập nhật client.
5. Review diff generated client và caller bị ảnh hưởng.

Cấu hình hiện tại đọc spec live, chưa đọc snapshot làm input.
Script api cấu hình cả năm service, nên cần bảo đảm các URL tương ứng
trả spec hợp lệ khi thực hiện generation.

## Snapshot và phạm vi

Snapshot đã review được lưu tại openapi/.
Ghi service, URL nguồn, commit BE, ngày export và phiên bản OpenAPI.

Tại baseline trên, openapi/ mới có README.
Không coi việc có generated client là bằng chứng đã lưu snapshot.

Không generate Notification khi R28 đang hoãn.
Không chạy test/build trong round tài liệu này.
