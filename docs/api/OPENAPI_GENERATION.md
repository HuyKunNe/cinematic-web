# OpenAPI Generation

## Đối chiếu A0.2 — 2026-11-06

- FE trước generation: `8c081d0`, working tree sạch.
- BE source đã đọc (chỉ đọc): `ac0915521d5562d4836ab1d95a5a3883a835148a`; working tree BE có thay đổi.
- Đã chạy `npm run api` với Node v24.21.0 và Orval 8.38.0; cả năm service báo generation thành công. Không có diff nội dung generated so với FE đầu lượt; không sửa generated bằng tay.
- npm PowerShell wrapper có cảnh báo `Test-Path: Access is denied` với đường dẫn prefix npm, nhưng đã chạy Orval đến hết và trả exit code 0. Không cài hoặc cập nhật dependency.
- `/actuator/info` cả năm service trả `{}`. Chưa xác định commit runtime; commit BE trên là source được review, không phải tuyên bố về binary đang chạy.
- Không chạy test/build/lint/type-check, formatter hoặc kiểm tra browser.

| Service | OpenAPI runtime | Operation ID / hàm generated |
| --- | --- | --- |
| movie-service | 3.0.1 | 19 / 19 |
| user-service | 3.1.0 | 7 / 7 |
| inventory-service | 3.1.0 | 66 / 66 |
| booking-service | 3.1.0 | 6 / 6 |
| payment-service | 3.1.0 | 5 / 5 |

Đối chiếu tĩnh không phát hiện operation ID thiếu/thừa so với exported functions.
Đây không phải kiểm tra toàn bộ schema, permission hoặc thực thi endpoint.

Phạm vi DTO/controller đã review: Movie create/update với screeningVersions,
Create/SaveMovieScreeningVersionRequest, MovieScreeningVersionResponse,
ContentFormat/ProjectionTechnology, Inventory ShowtimeScreeningVersionResponse và
matrix DTOs, Admin booking/payment lookup, Payment security và việc loại refund APIs.
Chi tiết nằm trong `BACKEND_API_INVENTORY.md`.

Giữ nguyên khác biệt nullability từ runtime: Movie response/item có union null;
Inventory showtime screening response không có required list. Không sửa tay generated
hoặc tự thêm required fields vào snapshot để che khác biệt đó.

## Nguồn OpenAPI

orval.config.ts hiện đọc trực tiếp OpenAPI của các service local:

| Service           | URL                               |
| ----------------- | --------------------------------- |
| movie-service     | http://localhost:8081/v3/api-docs |
| user-service      | http://localhost:8082/v3/api-docs |
| inventory-service | http://localhost:8083/v3/api-docs |
| booking-service   | http://localhost:8084/v3/api-docs |
| payment-service   | http://localhost:8085/v3/api-docs |

Trong A0.2, cả năm URL trên đã trả OpenAPI hợp lệ. Việc truy cập được spec không
chứng minh runtime build revision hoặc luồng nghiệp vụ chạy đúng.

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

Đã cập nhật `openapi/movie-service.json`, `openapi/inventory-service.json` và metadata
từ runtime ngày 2026-11-06. Giữ nguyên schema do service phục vụ, không bổ sung contract
bằng tay. Các snapshot cũ không còn đại diện cho contract hiện tại.
User/Booking/Payment được generate từ live URL, chưa lưu snapshot trong round này.
Metadata ghi riêng source revision đã đọc và runtime revision chưa xác định, thời điểm
export cùng SHA-256; không giả định chúng cùng một commit.

Inventory snapshot cũ có các sale-scopes/preview operation không còn xuất hiện trong
runtime/source hiện tại. Snapshot mới phản ánh contract hiện được phục vụ; không khôi
phục endpoint cũ dựa trên snapshot trước đó. Danh sách này không chứng nhận toàn bộ
nghiệp vụ pricing đã hoàn tất.

Không generate Notification khi R28 đang hoãn.
Không chạy test/build trong round tài liệu này.
