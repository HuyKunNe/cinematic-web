# Movie Service OpenAPI snapshot

- Service: movie-service
- Source URL: http://localhost:8081/v3/api-docs
- Backend commit: <commit thực tế của source đang chạy>
- Working tree: <clean hoặc dirty>
- Exported at: <thời điểm export kèm timezone>
- OpenAPI version: <giá trị field openapi trong snapshot>

## Reviewed change

GET /api/v1/movies/catalog bổ sung movieIds tùy chọn.
Bộ lọc được áp dụng trước pagination và counting.
Route, operationId và response wrapper giữ nguyên.

## Remaining work

Movies caller chưa chuyển sang server-side pagination.
Catalog chưa có sort parameter.
Không bao gồm R28 Notification.
