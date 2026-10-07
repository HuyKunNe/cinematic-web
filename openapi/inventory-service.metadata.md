# Inventory Service OpenAPI snapshot

- Service: inventory-service
- Source URL: http://localhost:8083/v3/api-docs
- Backend commit: <commit chứa thay đổi schema seat-map>
- Working tree: clean
- Exported at: <thời điểm export kèm timezone>
- OpenAPI version: <giá trị field openapi trong JSON>

## Scope

Snapshot được export từ Inventory Service đang chạy từ commit nêu trên.
Đã review schema của GET /api/v1/showtimes/{showtimeId}/seat-map.

showSeatId, price và status của từng seat là required và nullable.
Các field còn lại của seat là required.
label của layout element là optional.

## Limitations

Không xác nhận các endpoint khác chỉ từ việc lưu snapshot này.
Không bao gồm R28 Notification.
