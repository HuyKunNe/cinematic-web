# OpenAPI Contracts

## Mục đích

Thư mục này lưu OpenAPI snapshots đã review và metadata nguồn
theo quy định repository.

Tại baseline FE 4856878d420efa562a357d673e93eab04d463b32,
thư mục mới có README, chưa có snapshot JSON.

## Nguồn sự thật

- Backend controller, DTO, validation và security.
- Runtime OpenAPI của đúng service và môi trường.
- Snapshot đã review với commit nguồn rõ ràng.

Không sửa schema để che giấu vấn đề contract Backend.

## Cấu hình generation hiện tại

orval.config.ts đọc trực tiếp runtime spec local của:
movie-service, user-service, inventory-service,
booking-service và payment-service.

Script: npm run api.
Output: src/services/api/generated/<service>/.

Cấu hình hiện tại chưa dùng snapshot làm input.
Generated files không được sửa bằng tay.

Chi tiết nằm tại docs/api/OPENAPI_GENERATION.md.

## Quy tắc snapshot

Chỉ thêm spec thực sự được Backend phục vụ.
Mỗi snapshot cần ghi:

- Service sở hữu API.
- URL nguồn.
- Commit Backend.
- Ngày export.
- Phiên bản OpenAPI.
- Các giới hạn hoặc vấn đề contract còn tồn tại.

Dùng tên inventory-service cho API Inventory hiện có.
Không giả định có service tên showtime-service.

Không đưa secret vào spec hoặc metadata.
Không thêm Notification spec khi R28 đang hoãn.
