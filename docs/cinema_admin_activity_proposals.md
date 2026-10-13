# Đề xuất trạng thái rạp và phòng trên Admin

Ngày đối chiếu: 2026-10-13, múi giờ Asia/Ho_Chi_Minh.
Trạng thái: Đã thống nhất nguyên tắc giữ trạng thái độc lập; các thay đổi hiển thị dưới đây còn là đề xuất.
Phạm vi: trạng thái Cinema/Room, danh sách quản trị, thống kê và thao tác trên FE.
Không thay đổi repository qua tài liệu này.

## 1. Baseline và nguồn xác minh

| Repository | Commit đã đọc |
| --- | --- |
| Backend cinema-system | dc6209debcd6b7cf350f1e9d2b2d71a8ad5adfc7 |
| Frontend cinematic-web | 8555ab9b1ee9b1effce115ddf707549b4f6365c7 |

Nguồn BE:
- services/inventory-service/src/main/java/com/cinema/inventory/service/impl/CinemaServiceImpl.java
- services/inventory-service/src/main/java/com/cinema/inventory/service/impl/RoomServiceImpl.java
- services/inventory-service/src/main/java/com/cinema/inventory/repository/ShowtimeRepository.java
- services/inventory-service/src/main/java/com/cinema/inventory/dto/response/CinemaResponse.java
- services/inventory-service/src/main/java/com/cinema/inventory/dto/response/RoomResponse.java

Nguồn FE:
- src/features/rooms/admin/pages/AdminRoomsPage.vue
- src/features/rooms/admin/api/admin-room-queries.ts

Giao diện cần tiếp tục bám theo docs/design/reference/html-convert; không dùng Figma.
Source được ưu tiên hơn tài liệu cũ. IMPLEMENTED chỉ xác nhận source, chưa xác minh runtime hoặc deployment.

## 2. Hành vi hiện tại — IMPLEMENTED

### Backend

1. CinemaServiceImpl.update chỉ cập nhật thông tin và active của rạp. Không cập nhật active của các phòng.
2. RoomServiceImpl.getActiveRooms kiểm tra rạp tồn tại rồi chỉ lọc room.active=true. Method này không yêu cầu cinema.active=true.
3. getManagedRooms trả tất cả hoặc lọc active của chính phòng; không yêu cầu rạp đang hoạt động.
4. Tạo phòng mới bị từ chối khi rạp inactive.
5. Truy vấn bookable và existsHoldEligibleShowtime cùng yêu cầu room.active=true và cinema.active=true, ngoài trạng thái/thời gian suất chiếu.
6. CinemaResponse có active. RoomResponse có cinemaId và active, không có field trạng thái rạp hay trạng thái hoạt động hiệu lực.

### Frontend

1. Màn Phòng đã dùng getManagedCinemas và getManagedRooms.
2. Lựa chọn rạp đã thêm nhãn “Tạm ngưng” khi cinema.active=false.
3. Page đã có thông báo rạp tạm ngưng và chặn thêm phòng khi rạp không active.
4. Bộ lọc và thống kê phòng đang dựa trên room.active.
5. Badge phòng đang lấy room.active và hiển thị “Đang hoạt động” hoặc “Tạm ngưng”; chưa diễn đạt tác động của trạng thái rạp.
6. Đã có useSetAdminRoomActivityMutation để đổi trạng thái riêng của phòng.

Không đề xuất triển khai lại những phần đã có trên.

## 3. Nguyên tắc đã thống nhất

- cinema.active là trạng thái riêng của rạp.
- room.active là trạng thái riêng của phòng.
- Tạm ngưng rạp không tự tạm ngưng các phòng.
- Bật lại rạp không tự bật phòng đã tạm ngưng riêng.
- UI phải phân biệt trạng thái riêng với giới hạn phục vụ do rạp.
- Hai trạng thái cùng true chỉ đáp ứng điều kiện về rạp/phòng. Không bảo đảm suất mở bán, còn ghế hoặc reservation thành công.
- Không ghi giá trị suy ra của FE trở lại room.active.

Ví dụ: rạp có phòng A đang bật và phòng B đã tạm ngưng riêng. Sau khi tạm ngưng rồi bật lại rạp, A vẫn bật và B vẫn tạm ngưng riêng. Không cần khôi phục trạng thái hàng loạt.

## 4. Các đề xuất triển khai

| ID | Nội dung | Trạng thái | Ưu tiên |
| --- | --- | --- | --- |
| ADMIN-ACTIVITY-01 | Badge phân biệt trạng thái riêng của phòng và tác động của rạp | PROPOSED | P1 |
| ADMIN-ACTIVITY-02 | Làm rõ ý nghĩa bộ lọc trạng thái phòng | PROPOSED | P1 |
| ADMIN-ACTIVITY-03 | Làm rõ nhãn và cách đếm thống kê phòng | PROPOSED | P1 |
| ADMIN-ACTIVITY-04 | Giải thích kết quả bật phòng trong rạp tạm ngưng | PROPOSED | P1 |
| ADMIN-ACTIVITY-05 | Làm mới trạng thái rạp và dữ liệu liên quan sau mutation | REVIEW / PROPOSED | P1 |
| ADMIN-ACTIVITY-06 | Chuẩn hóa hàm trình bày trạng thái và dữ liệu chưa xác định | PROPOSED | P1 |
| ADMIN-ACTIVITY-07 | Projection BE dùng chung nếu nhiều caller cần | OPTIONAL, chưa chốt contract | P2 |

### ADMIN-ACTIVITY-01 — Badge trạng thái

Đề xuất giữ một cột trạng thái hiện tại, gồm nhãn trạng thái riêng và dòng giải thích ngắn. Không thêm nhiều cột làm hỏng kích thước table.

| cinema.active | room.active | Nhãn chính đề xuất | Giải thích |
| --- | --- | --- | --- |
| true | true | Đã bật | Không bị chặn bởi trạng thái rạp/phòng |
| true | false | Tạm ngưng riêng | Phòng không nhận giữ ghế mới |
| false | true | Đã bật | Không phục vụ do rạp tạm ngưng |
| false | false | Tạm ngưng riêng | Rạp cũng đang tạm ngưng |
| Thiếu/chưa xác định | true hoặc thiếu | Chưa xác định đầy đủ | Không hiển thị kết luận đủ điều kiện phục vụ |

“Đã bật” là trạng thái cấu hình, không phải khẳng định phòng đang có suất bán vé.
Nếu room.active=false nhưng chưa biết trạng thái rạp, vẫn biết phòng tạm ngưng riêng; không suy đoán thêm trạng thái rạp.

Không chỉ dùng màu để truyền đạt ý nghĩa; giữ nhãn văn bản. Dùng token và semantic class hiện có, bổ sung token nếu thực sự cần.

### ADMIN-ACTIVITY-02 — Bộ lọc

- Đổi nhãn bộ lọc thành “Trạng thái riêng của phòng”.
- Giữ filter dựa trên room.active: tất cả / đã bật / tạm ngưng riêng.
- Phòng active trong rạp inactive vẫn thuộc nhóm “đã bật”, kèm giải thích từ ADMIN-ACTIVITY-01.
- Không âm thầm đổi filter active thành room.active && cinema.active.
- Chưa cần thêm filter “khả năng phục vụ” trong round đầu.

### ADMIN-ACTIVITY-03 — Thống kê

- Nhóm đếm theo room.active dùng nhãn “Phòng đã bật” và “Phòng tạm ngưng riêng”.
- Ghi rõ phạm vi rạp đã chọn hay toàn hệ thống.
- Không gọi số phòng có room.active=true là số phòng đang phục vụ.
- Giữ tổng số phòng bằng số phòng đã bật cộng số phòng tạm ngưng riêng khi dữ liệu active đầy đủ.
- Chưa cần thêm thống kê phục vụ hiệu lực trong round đầu.
- Nếu bổ sung sau, ghép rạp theo room.cinemaId và ID rạp; không ghép theo index, tên hoặc rạp đang chọn cho toàn hệ thống.
- Thiếu dữ liệu một nguồn phải có trạng thái chưa xác định hoặc dữ liệu cũ được ghi nhãn. Không biến lỗi thành số 0.

### ADMIN-ACTIVITY-04 — Thao tác đổi trạng thái

- Giữ thao tác đổi room.active độc lập đã có.
- Có thể bật cấu hình riêng của phòng trong rạp tạm ngưng theo hành vi BE hiện tại.
- Sau khi bật trong rạp inactive, thông báo rõ: “Đã bật phòng. Rạp đang tạm ngưng nên phòng chưa phục vụ.”
- Không tự kích hoạt rạp khi bật phòng.
- Giữ chặn thêm phòng mới trong rạp inactive.
- Nếu cần cấm bật phòng trong rạp inactive, phải quyết định nghiệp vụ và đồng bộ BE trước; tài liệu này không chọn chính sách đó.

### ADMIN-ACTIVITY-05 — Cache và làm mới dữ liệu

- Kiểm tra mutation đổi trạng thái rạp invalidates các query rạp/phòng và dữ liệu bookable liên quan.
- Không chỉ làm mới room.active: dòng giải thích còn phụ thuộc cinema.active.
- Khi quay lại màn Phòng, trạng thái rạp phải có cơ chế refetch phù hợp. Không coi staleTime là bảo đảm dữ liệu luôn mới.
- Trong lúc dữ liệu thay đổi, giữ loading/error rõ ràng; không dùng optimistic update để tuyên bố đã đổi trạng thái khi BE chưa trả thành công.
- BE vẫn là nguồn quyết định điều kiện giữ ghế tại thời điểm đặt.
- Không thêm polling thường xuyên hoặc gọi API riêng cho từng row chỉ để suy ra trạng thái rạp.

### ADMIN-ACTIVITY-06 — Hàm trình bày dùng chung

Đề xuất helper thuần nhận room.active và cinema.active, trả nhãn riêng, lời giải thích và trạng thái hiển thị.
Đây là UI model, không phải DTO mới của BE.

File mới đề xuất:
- src/features/rooms/admin/presentation/admin-room-activity.ts

Các file đã có cần cập nhật:
- src/features/rooms/admin/pages/AdminRoomsPage.vue
- src/styles/admin-rooms.css

Rà soát khi triển khai cache:
- src/features/rooms/admin/api/admin-room-queries.ts
- src/features/cinemas/admin/api/admin-cinema-queries.ts

Helper mới chưa được xác nhận tồn tại và chưa được tạo trong repository.
Không thêm field suy ra vào generated RoomResponse. Không chuyển giá trị thiếu thành false.
Không tái sử dụng kết quả helper làm nguồn xác nhận khả năng mua ghế.

### ADMIN-ACTIVITY-07 — Projection BE tùy chọn

Round FE đầu không cần API hoặc field mới: CinemaResponse.active, RoomResponse.active và RoomResponse.cinemaId đã đủ cho màn Phòng.

Chỉ xem xét projection BE khi nhiều caller cần cùng một cách diễn đạt hoặc cần paging/filter hiệu lực tại server:
- Chốt tên field, ý nghĩa và nullability trước.
- Phân biệt trạng thái cấu hình, trạng thái hiệu lực theo parent và điều kiện mở bán của suất.
- Thiết kế additive, giữ route và response hiện tại.
- Cập nhật runtime OpenAPI, snapshot, metadata và generated client theo quy trình repo.
- Không tuyên bố có field hoặc endpoint mới ở thời điểm hiện tại.

## 5. API sử dụng hiện có

| API | Vai trò |
| --- | --- |
| GET /api/v1/cinemas/management | Danh mục quản trị có trạng thái rạp |
| GET /api/v1/rooms/management?cinemaId={cinemaId} | Danh mục quản trị có trạng thái riêng của phòng |
| GET /api/v1/rooms/{roomId} | Đọc chi tiết phòng trước thao tác |
| PUT /api/v1/rooms/{roomId} | Cập nhật name, roomType và active của phòng |
| PUT /api/v1/cinemas/{cinemaId} | Cập nhật name, address, city và active của rạp |

GET management và các thao tác ghi yêu cầu inventory:manage.
Response thành công vẫn là DTO/array trực tiếp của API hiện tại.
Bộ lọc active trên API quản trị phòng là trạng thái của chính phòng, không kế thừa trạng thái rạp.

Không sửa GET public /api/v1/rooms để giải quyết nhãn UI Admin trong round này.
Muốn thay đổi hành vi API public cần đánh giá caller và tương thích riêng.

## 6. Thứ tự triển khai

Round 1:
1. Thực hiện ADMIN-ACTIVITY-01, 02, 03 và 06.
2. Rà soát và bổ sung phần thiếu của ADMIN-ACTIVITY-04, 05.
3. Giữ cấu trúc table, dropdown và cơ chế scrollbar đã sửa ở các round UI.
4. Cung cấp code theo file và dừng để người dùng tự áp dụng.

Round 2 chỉ thực hiện khi có nhu cầu:
- Chốt projection BE trong ADMIN-ACTIVITY-07.
- Không thực hiện cascade trạng thái rạp sang phòng.

## 7. Kiểm tra thủ công sau khi tự implement

1. Rạp active, phòng active: hiển thị “Đã bật”; không khẳng định chắc chắn mua được vé.
2. Rạp inactive, phòng active: vẫn giữ room.active=true, hiển thị lý do không phục vụ do rạp.
3. Rạp active, phòng inactive: hiển thị “Tạm ngưng riêng”.
4. Cả rạp và phòng inactive: phân biệt được hai nguyên nhân.
5. Bật lại rạp: phòng tạm ngưng riêng không tự bật.
6. Bật phòng trong rạp inactive: thông báo đúng kết quả; không tự đổi cinema.active.
7. Bộ lọc và thống kê giữ cùng một ý nghĩa trạng thái riêng.
8. Đổi trạng thái rạp rồi quay lại màn Phòng: nhãn được làm mới.
9. Thiếu dữ liệu/lỗi mạng: không gán false, không đếm thành 0, không hiển thị đủ điều kiện phục vụ.
10. Kiểm tra table/dropdown trên desktop và mobile không làm dịch chuyển layout.

Không chạy test/build trong round tài liệu này.
Không yêu cầu sửa schema, migration, seed dữ liệu hoặc cập nhật SQL để giải quyết vấn đề hiển thị.
Không mở lại R28 Notification.

## 8. Commit message đề xuất sau khi triển khai

feat(admin): clarify room activity under paused cinemas

File này là đề xuất triển khai, không phải bằng chứng các thay đổi đã được áp dụng.
Vị trí gợi ý khi người dùng tự đưa vào FE: docs/cinema_admin_activity_proposals.md.

