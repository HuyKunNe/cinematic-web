# Đề xuất tích hợp API Backend vào Frontend Cinema System

> Trạng thái: PROPOSED — kế hoạch triển khai FE, chưa phải xác nhận đã tích hợp.
> Ngày đối chiếu: 2026-10-07, Asia/Ho_Chi_Minh.
> Phạm vi: Customer Movies, Home, QuickBooking, Booking seat selection và các caller Admin liên quan.
> Vị trí đề xuất khi đưa vào repository FE: `docs/cinema_frontend_api_migration_proposals.md`.

## 1. Mục tiêu và cách sử dụng

Thay các caller tải dữ liệu rộng rồi xử lý tại FE bằng API đã có trong Backend, giữ đúng phạm vi rạp, trạng thái phim/suất và khả năng tương thích.

Tài liệu này là kế hoạch để người phát triển tự áp dụng. Không chứa patch đã thực thi trên repository. Đọc source mới nhất trước mỗi round; nếu main thay đổi, cập nhật baseline và đối chiếu lại caller/contract bị ảnh hưởng.

Mỗi round triển khai phải cung cấp:

1. Mục tiêu và trạng thái hiện tại, kèm source.
2. Danh sách chính xác file cần sửa hoặc file mới đề xuất.
3. Hướng dẫn code: vị trí chèn/thay thế, từng thay đổi trong code block riêng.
4. Contract API: method/path/query/body/response/error, ví dụ.
5. Tác động và tương thích.
6. Các bước kiểm tra thủ công cần thiết.
7. Commit message.

Sau một round, dừng để người phát triển tự implement và báo kết quả. Không tự tiếp tục round sau.

### Giới hạn thực hiện

- BE và FE chỉ được đọc bởi assistant; không sửa GitHub, commit, push hoặc mở PR.
- Không chạy hoặc yêu cầu chạy test/build/lint/typecheck trong các round này, trừ khi người dùng yêu cầu sau.
- Generation bằng script `npm run api` là bước cập nhật contract, không phải test/build.
- Không sửa generated client/models bằng tay.
- Không dùng dữ liệu từ chat cũ thay cho source hiện tại.
- Không mở lại R28 Notification.
- Không cho Movie Service truy cập database Inventory.
- Không thêm dữ liệu giả về giá, availability, age rating, promotion, membership hoặc concession.
- Giao diện bám HTML/CSS trong `docs/design/reference/html-convert`; không dùng Figma.

## 2. Baseline đã xác minh

| Repository | Branch | Commit |
| --- | --- | --- |
| Backend: HuyKunNe/cinema-system | main | `7f51e97fe1dcd896c8dd02b8d8ed729991e357ce` |
| Frontend: HuyKunNe/cinematic-web | main | `62d9bd07e878574ab4ef6399d26aaad9fdfd056d` |

Đã kiểm tra lại head khi tạo tài liệu; hai head không đổi so với lần review ngay trước đó.

Nguồn đề xuất BE chính: `cinema-system/docs/cinema_backend_home_proposals.md`.

IMPLEMENTED trong tài liệu này chỉ nghĩa là có source tại commit nêu trên. Không xác nhận service local/deploy đang chạy đúng commit, runtime OpenAPI đã cập nhật, hay request thực tế thành công.

### 2.1 Các khác biệt tài liệu cần lưu ý

- BE đã có catalog với `movieIds`, `sort` và endpoint genres theo phạm vi catalog. Phần FE Customer Movies vẫn chưa tích hợp.
- Phần baseline cũ của tài liệu BE nói `openapi/` FE chỉ có README; source FE hiện đã có snapshot Movie và Inventory.
- Các mục Booking cũ trong tài liệu có nhãn PROPOSED chung, nhưng các mục cập nhật phía sau và source đã có layout/seat-map. Dùng trạng thái từng mục và source để kết luận.
- Metadata snapshot Movie vẫn ghi catalog chưa có sort, trong khi snapshot và generated params đã có.
- Chưa thể dùng metadata snapshot hiện tại làm bằng chứng về commit/runtime nguồn: nhiều giá trị vẫn là placeholder.

## 3. Inventory caller và hướng xử lý

Các route trong bảng được rút gọn bằng cách bỏ tiền tố `/api/v1`.

| Khu vực | Caller hiện tại | Hành vi hiện tại | Hướng xử lý |
| --- | --- | --- | --- |
| Customer Movies | GET /movies | Tải toàn bộ; lọc/sort/cắt danh sách tại FE | Thay bằng GET /movies/catalog |
| Thể loại Customer Movies | Tổng hợp từ phim đã tải | Không có query thể loại riêng | Dùng GET /movies/catalog/genres |
| Home sections | GET /movies | Lọc programme theo rạp; dùng chung với /booking | Tách query catalog của sections và nguồn QuickBooking |
| Hero | GET /movies/hero | Editorial order; có movieIds khi chọn rạp | Giữ |
| QuickBooking: ngày | GET /showtimes/by-movie/{movieId} | Lọc cinema/status/thời gian tại FE | Chuyển bookable sau khi chốt khoảng ngày |
| QuickBooking: suất trong ngày | GET /showtimes/bookable | Theo cinema/movie/ngày; refetch trước chuyển trang | Giữ |
| Movie Detail | GET /movies/{id} và GET /showtimes/bookable | Đọc phim và suất theo rạp/ngày | Giữ |
| Programme rạp dùng chung | GET /rooms?cinemaId=… rồi GET /showtimes/by-room/{roomId} | 1 request phòng + N request lịch; có SCHEDULED và OPEN_FOR_BOOKING | Chưa có API thay thế đầy đủ; đề xuất BE riêng |
| Booking context | Đọc showtime, rồi movie/room/cinema | Xác minh các ID và thông tin hiển thị | Giữ trong round seat-map |
| Booking seats | GET /seats + GET /show-seats | Ghép dữ liệu tại FE; danh sách theo hàng | Seat-map chính, legacy fallback khi thiếu layout |
| Location/room types | GET /cinemas và GET /rooms | Rạp active và loại phòng | Giữ |
| Admin Movies | GET /movies/catalog | Đã phân trang server | Giữ |
| Admin genre editor | GET /genres | Cần danh mục thể loại toàn hệ thống | Giữ |
| Admin Dashboard counts | GET /movies/catalog?size=1 | Lấy page.totalElements | Giữ |
| Admin Dashboard autocomplete phim | GET /movies | Search trên options đã tải | Giữ tạm; server search chưa có |
| Admin Dashboard lịch | GET /showtimes?from=…&to=… | Lấy lịch trong ngày; lọc scope tại FE | Không thay bằng bookable |
| Auth | OIDC UserManager | Authorization Code, redirect và refresh session | Giữ |
| Promotion/Membership | Dữ liệu presentation minh họa | Chưa gọi API nghiệp vụ | Chờ contract thật |

## 4. API đích đã tồn tại trong Backend

### 4.1 Movie catalog

```http
GET /api/v1/movies/catalog
```

Không có body. Query:

| Parameter | Contract hiện có |
| --- | --- |
| status | MovieStatus tùy chọn: UPCOMING, NOW_SHOWING, ENDED, INACTIVE |
| genre | UUID tùy chọn; không phải tên thể loại |
| page | Chỉ số trang từ 0; mặc định 0 |
| size | Mặc định theo cấu hình; source mặc định 8, tối đa mặc định 100 |
| movieIds | UUID ứng viên tùy chọn; parameter lặp |
| sort | RELEASE_DESC, RELEASE_ASC, TITLE_ASC; mặc định RELEASE_DESC |

Ví dụ minh họa cú pháp; UUID dưới đây không phải khẳng định dữ liệu đang tồn tại tại môi trường của người dùng:

```http
GET /api/v1/movies/catalog?status=NOW_SHOWING&page=0&size=8&sort=RELEASE_DESC&movieIds=51ff3380-7d57-5373-98d4-015711f374f9&movieIds=b03297fc-2c96-53f4-906e-cd30ae373087
```

Response 200 trực tiếp: `PageResponse<MovieResponse>`.

- `content`: phim của trang.
- `page.page`, `page.size`.
- `page.totalElements`, `page.totalPages`.
- `page.first`, `page.last`.
- Không thêm success envelope.

Validation/error:

- Paging sai: 400.
- UUID/status/sort không hợp lệ: 400.
- movieIds vượt giới hạn cấu hình hoặc có null tại service: 400 / `INVALID_CATALOG_MOVIE_IDS`.
- Giới hạn đầu vào mặc định 100; kiểm tra trước khi loại trùng.
- ID ứng viên hợp lệ nhưng không tồn tại không gây 404; không khớp trả trang rỗng.
- Nếu phim mất giữa bước đọc ID trang và bước tải entity, có thể trả 404 / `MOVIE_NOT_FOUND`.

Sort được áp dụng trước pagination. Release-date sorts đặt ngày null cuối; id tăng dần là tie-breaker. TITLE_ASC dùng collation database, không cam kết giống Intl.Collator tại FE.

Movie Service chỉ lọc theo ID; không xác minh rạp hoặc suất từ movieIds.

### 4.2 Genres theo phạm vi catalog

```http
GET /api/v1/movies/catalog/genres?status=NOW_SHOWING&movieIds=51ff3380-7d57-5373-98d4-015711f374f9
```

- operationId: `getMovieCatalogGenres`.
- Query tùy chọn: status, movieIds.
- Không có body.
- Response 200 trực tiếp: `GenreResponse[]`; không khớp trả `[]`.
- Chỉ trả genres gắn với ít nhất một phim khớp; không trùng ID.
- Không nhận genre/page/size/sort.
- Validation movieIds dùng chung với catalog; request sai trả 400.
- Không truyền status/movieIds nghĩa là không lọc điều kiện đó.
- Thứ tự name ASC theo DB, id ASC.

Đây là API đã có trong BE source, chưa có trong Movie snapshot/generated client FE tại baseline.

### 4.3 Bookable showtimes

```http
GET /api/v1/showtimes/bookable?cinemaId={cinemaId}&movieId={movieId}&from={offsetDateTime}&to={offsetDateTime}
```

- Query bắt buộc: cinemaId, from, to.
- movieId tùy chọn.
- Không có body.
- Response 200 trực tiếp: `ShowtimeResponse[]`.
- Khoảng thời gian `[from, to)`.
- Chỉ suất OPEN_FOR_BOOKING, startsAt lớn hơn thời điểm server, Room/Cinema active.
- Khoảng request tối đa mặc định 7 ngày, có thể cấu hình.
- Query không hợp lệ trả 400.
- OPEN_FOR_BOOKING không bảo đảm còn ghế; không suy ra availability tổng hợp.

Ngày hiển thị dùng Asia/Ho_Chi_Minh. FE đã có `getCinemaDayRange`; giữ nguồn tính ngày này khi xây request.

### 4.4 Showtime seat-map

```http
GET /api/v1/showtimes/{showtimeId}/seat-map
```

- operationId: `getShowtimeSeatMap`.
- Public GET, không có query/body.
- Response 200 trực tiếp: `ShowtimeSeatMapResponse`.
- HTTP response có `Cache-Control: no-store`.

Root luôn có:

```text
showtimeId, cinemaId, roomId, layoutId, layoutVersion, serverTime,
canvasWidth, canvasHeight, elements, seats
```

Mỗi seat luôn có:

```text
seatId, showSeatId, seatNumber, rowLabel, seatType, capacity,
x, y, width, height, rotationDegrees,
price, currency, status, selectable
```

- Hình học và metadata ghế lấy từ published layout đã ghim vào suất.
- Giá/status lấy từ ShowSeat.
- Thiếu ShowSeat: showSeatId, price, status bằng null; selectable=false.
- label của layout element optional.
- Không trả booking-owner của khách khác.
- Đọc map không giữ ghế; không tự release HELD hết hạn.

Error:

| HTTP | Trường hợp |
| --- | --- |
| 400 | UUID suất không hợp lệ |
| 404 | Không có suất |
| 409 / INVENTORY_SHOWTIME_LAYOUT_REQUIRED | Suất chưa có layout được ghim |
| 409 / INVENTORY_ROOM_LAYOUT_NOT_PUBLISHED | Layout chưa publish |
| 409 / INVENTORY_SEAT_MAP_DATA_INCONSISTENT | Layout/ShowSeat không nhất quán |

Catalog, catalog genres, bookable và seat-map đều được public GET theo security Movie/Inventory và Gateway tại baseline. Không cần mở thêm quyền để chuyển các caller đọc này.

## 5. Thứ tự round triển khai

| Round | Nội dung | Điều kiện bắt đầu |
| --- | --- | --- |
| FE-API-00 | Đồng bộ OpenAPI/snapshot/generated client | Runtime spec từ BE đúng source |
| FE-API-01 | Customer Movies: catalog + scoped genres + paging/sort | Hoàn tất Movie contract ở round 00 |
| FE-API-02 | Booking: seat-map chính + legacy fallback | Inventory contract đúng; có layout khi kiểm tra nhánh map |
| FE-API-03 | Tách catalog Home và nguồn dữ liệu /booking/QuickBooking | Giữ đủ phim và đúng phạm vi rạp |
| FE-API-04 | QuickBooking: thay nguồn tìm ngày bằng bookable | Chốt khoảng ngày và cơ chế xem thêm |
| BE-DEP-01 | API programme theo rạp/range/status | BE additive contract cần thiết kế riêng |
| BE-DEP-02 | Tìm kiếm phim phía server cho Admin | Có nhu cầu theo quy mô; contract chưa tồn tại |

Không cần migration DB mới chỉ để chuyển các caller FE sang API đã có. Với seat-map, dữ liệu suất phải có published layout được ghim; suất cũ không tự được backfill.

## 6. FE-API-00 — Đồng bộ contract

### Mục tiêu và trạng thái hiện tại

Movie generated params đã có movieIds và sort, nhưng không có client genres theo catalog. Inventory generated models đã biểu diễn nullable, nhưng snapshot đang lưu chưa thể hiện required/nullability tương ứng.

### File cần sửa

```text
openapi/movie-service.json
openapi/movie-service.metadata.md
openapi/inventory-service.json
openapi/inventory-service.metadata.md
src/services/api/generated/movie-service/          # output generation
src/services/api/generated/inventory-service/      # output generation
```

`orval.config.ts` hiện dùng spec live từ năm service local; chưa dùng snapshot làm input. Không tự đổi cấu hình này trong round nếu chưa có nhu cầu riêng.

### Hướng thực hiện

1. Đối chiếu runtime spec với controller/DTO/security tại commit BE thực tế đang chạy.
2. Movie spec phải có catalog movieIds/sort và getMovieCatalogGenres.
3. Inventory spec phải có required fields của seat-map; showSeatId/price/status required và nullable.
4. Lưu snapshot thật, không tự sửa schema JSON để che vấn đề BE.
5. Ghi metadata thật: URL nguồn, commit BE, clean/dirty, thời điểm export kèm timezone, OpenAPI version.
6. Generate bằng script api đã có trong repo; review diff tất cả service bị ảnh hưởng.

Script hiện cấu hình movie/user/inventory/booking/payment; không giả định chỉ Movie/Inventory sẽ đổi. Không thêm Notification.

### Kiểm tra thủ công và nghiệm thu

- Snapshot chứa endpoint genres và sort enum đúng.
- Generated client có operation getMovieCatalogGenres, không tự đoán tên file trước generation.
- Generated seat-map có ba field nullable và tất cả required fields.
- Snapshot/metadata/generated source không mâu thuẫn.
- Không đổi contract của caller đang dùng.

### Commit message

```text
chore(api): sync movie catalog genres and seat map contracts
```

## 7. FE-API-01 — Customer Movies

### Mục tiêu và trạng thái hiện tại

Bỏ findAll làm nguồn danh sách Movies. Giữ UI tab/filter/sort/xem thêm hiện tại; chuyển lọc/sort/paging sang BE.

Source hiện tại:

```text
src/features/movies/api/movie-queries.ts
src/features/movies/composables/use-movies-programme.ts
src/features/movies/pages/MoviesPage.vue
```

### File cần sửa

Ba file trên; generated client đã cập nhật tại round 00. Chỉ thêm composable/model mới nếu triển khai cần; tên/path phải được ghi là file mới đề xuất, không trình bày như file đã có.

### Hướng thay đổi

1. Xây query params từ selectedStatus, selectedGenre, selectedSort, page và size=8.
2. Map sort UI:
   - release-desc → RELEASE_DESC.
   - release-asc → RELEASE_ASC.
   - title-asc → TITLE_ASC.
3. Giữ nguồn programme rạp hiện tại trong round này để xác định ID ứng viên trước paging.
4. NOW_SHOWING theo suất tương lai OPEN_FOR_BOOKING.
5. UPCOMING theo suất tương lai OPEN_FOR_BOOKING hoặc SCHEDULED.
6. Không chọn rạp: không gửi movieIds.
7. Có rạp nhưng chưa tải được scope: không gọi catalog toàn hệ thống làm fallback.
8. Có scope nhưng không có ứng viên: không gửi request; biểu diễn kết quả rỗng.
9. Query key chứa phạm vi rạp, tập ID chuẩn hóa, status, genre, sort, page, size.
10. Dropdown genres lấy API riêng; không tổng hợp từ content một trang.
11. Đổi bộ lọc hoặc scope: reset page và các trang đã tích lũy.
12. Xem thêm tải trang tiếp theo; total/count và hasMore dùng page metadata.
13. Dùng thứ tự response; không sort lại từng trang.
14. Khi rạp đổi hoặc request cũ hoàn tất muộn, không ghép trang của scope cũ vào scope mới.
15. ID vượt giới hạn không bị cắt âm thầm; báo giới hạn/thiết kế mở rộng phù hợp.

### Quyết định UX cần ghi rõ

Đề xuất genres theo tab hiện tại: gửi cùng status và movieIds với catalog, không gửi genre đang chọn.

Source hiện tại lấy genres trước khi lọc status, nên chuyển sang theo tab là thay đổi hành vi. Nếu cần giữ hành vi cũ chính xác theo rạp, cần thiết kế cách hợp nhất các tập genre ứng viên theo trạng thái; không chỉ bỏ status và mặc định kết quả tương đương.

TITLE_ASC theo DB và tie-breaker ID có thể khác thứ tự client cũ. Cần ghi nhận đây là thứ tự canonical mới khi chuyển caller.

### Tương thích

- Giữ API GET /movies để caller khác tiếp tục hoạt động.
- Giữ useMovieDetailQuery đọc theo ID.
- Giữ Admin Movies và Admin genre editor.
- Không thêm cinemaId vào MovieController hoặc đọc DB Inventory.

### Kiểm tra thủ công và nghiệm thu

- Tab/filter/sort thay đổi request params và reset danh sách.
- Xem thêm gọi trang tiếp theo; không lặp phim do ghép cùng trang.
- Tổng số phim đúng scope, không lấy content.length làm total.
- Phim UPCOMING có SCHEDULED vẫn xuất hiện.
- Dropdown có thể loại không nằm ở trang đầu.
- Rạp rỗng/lỗi không hiển thị phim toàn hệ thống.
- Không có response cũ lẫn vào danh sách khi đổi rạp.
- Bố cục và responsive bám cinematic-movies.html/.css; không thêm sort theo độ hot/đánh giá từ prototype khi chưa có dữ liệu.

### Commit message

```text
feat(movies): use scoped catalog pagination and genre filters
```

## 8. FE-API-02 — Seat-map cho màn chọn ghế

### Mục tiêu và trạng thái hiện tại

BookingSeatSelection hiện là danh sách theo hàng, có nhãn không phản ánh vị trí thực. Query dùng hai API và mapper đối chiếu metadata Seat hiện tại.

### File cần sửa

```text
src/features/booking/api/booking-queries.ts
src/features/booking/mappers/booking-seat.mapper.ts
src/features/booking/models/booking-seat.model.ts
src/features/booking/components/BookingSeatSelection.vue
```

File mới nếu cần: mapper/component riêng cho seat-map; tên/path phải được quyết định trong round code.

Nếu thêm CSS, xác minh file style booking đang được import trong source mới nhất trước khi hướng dẫn; chưa chốt tên file CSS trong tài liệu này.

### Hướng thay đổi

1. Gọi getShowtimeSeatMap(showtimeId) làm nguồn chính.
2. Giữ root geometry, elements và seat fields để renderer sử dụng; không chỉ bỏ geometry rồi tiếp tục gọi là sơ đồ.
3. Xác minh showtimeId/roomId/cinemaId khớp context.
4. Dùng snapshot layout; không ghi đè bằng tên/loại/active hiện tại của Seat.
5. Chỉ fallback legacy khi đúng code INVENTORY_SHOWTIME_LAYOUT_REQUIRED.
6. Các lỗi khác hiển thị lỗi; không tự vẽ map giả.
7. Nhánh fallback tiếp tục availableOnly=false và nhãn “Danh sách ghế theo hàng”.
8. Ghế thiếu price/status/showSeatId không được biến thành AVAILABLE hoặc giá 0.
9. Dùng selectable từ BE cùng kiểm tra payload cần thiết; không tự mở lại ghế HELD.
10. Giữ các vị trí bận/không bán/thiếu dữ liệu trên map.
11. Render x/y/width/height/rotationDegrees theo canvas; gốc trên trái, xoay quanh tâm.
12. Đổi suất phải xóa selection; dữ liệu mới đổi giá/status phải loại lựa chọn không còn hợp lệ và thông báo.
13. COUPLE là một seatId/seatNumber; tạm tính cộng một price, sức chứa tính riêng.
14. Polling/refetch ghế hiện có không được tạo hold hoặc countdown giả.

Không coi “không có ghế selectable” luôn là “đã bán hết”: nguyên nhân có thể là suất không còn eligible hoặc dữ liệu ShowSeat thiếu.

### Tương thích và giới hạn

- Giữ Booking context và kiểm tra điều kiện mở bán của trang.
- Public seat-map không thay cho transaction đặt vé.
- Chọn tại FE là local selection, chưa phải HELD.
- Không gọi trực tiếp hold/book/release từ customer FE; những endpoint đó yêu cầu inventory:write.
- Suất cũ thiếu layout vẫn cần fallback; không tự backfill.
- Tài liệu reference README có nhắc seat-selection.html nhưng file đó không có trong tree baseline. Không dùng tên này làm bằng chứng có thiết kế riêng. Tài liệu BE hiện chỉ rõ tham chiếu cinema/movie detail cho phần booking.

### Kiểm tra thủ công và nghiệm thu

- Có layout: một request seat-map cho dữ liệu ghế; không gọi Seat API để ghi đè snapshot.
- Thiếu layout: fallback theo hàng đúng code.
- Layout lỗi/không publish: báo lỗi, không fallback che dữ liệu.
- Thiếu ShowSeat: giữ vị trí, không cho chọn.
- Sơ đồ giữ khoảng trống, tọa độ và hướng màn hình trên mobile/tablet; không reflow ghế sang hàng khác.
- Ghế đôi một lựa chọn/một giá; tổng sức chứa riêng.
- Refresh đổi giá/status loại ghế không hợp lệ.
- Đổi suất không giữ lựa chọn cũ.

### Commit message

```text
feat(booking): render pinned seat maps with legacy fallback
```

## 9. FE-API-03 — Tách nguồn catalog Home và Booking Start

### Mục tiêu và trạng thái hiện tại

useHomeProgramme tải toàn bộ phim. Home sử dụng nowShowing/upcoming; BookingStart còn dùng catalogMovies để tìm phim trong query URL và dùng nowShowing cho QuickBooking.

Chuyển một query chung thành trang đầu 8 phim sẽ làm thiếu options và có thể báo phim từ URL không tồn tại.

### File cần sửa

```text
src/features/home/api/home-queries.ts
src/features/home/composables/use-home-programme.ts
src/features/home/pages/HomePage.vue
src/features/booking/pages/BookingStartPage.vue
```

Các consumer cần kiểm tra khi đổi kiểu dữ liệu:

```text
src/features/home/components/QuickBooking.vue
src/features/home/components/NowShowingSection.vue
src/features/home/components/UpcomingMoviesSection.vue
```

### Hướng thay đổi

- Query sections có status, sort, size và movieIds riêng.
- NOW_SHOWING vẫn theo tập suất tương lai OPEN_FOR_BOOKING.
- UPCOMING vẫn theo OPEN_FOR_BOOKING hoặc SCHEDULED.
- Danh sách QuickBooking phải đầy đủ theo scope, không lấy content trang đầu của section.
- Có thể tải đầy đủ các trang ứng viên trong giới hạn hợp lệ hoặc dùng nguồn riêng đã thiết kế; không mặc định size=100 luôn đủ.
- Phim từ URL /booking nên đọc detail theo ID, giữ khả năng hiển thị phim dù rạp hiện tại không có suất.
- Catalog sections không thay Hero editorial query.
- Query key/cache có phạm vi rạp và bộ lọc.
- upcoming hiện sort ngày tại client; RELEASE_ASC đặt ngày null cuối, nên cần ghi rõ thay đổi thứ tự cho dữ liệu thiếu ngày nếu áp dụng.

Số card tải ban đầu/xem thêm phải đối chiếu component và HTML/CSS tại round code, không tự coi 8 là quy tắc cho mọi section Home.

### Kiểm tra thủ công và nghiệm thu

- Home tải đúng status và scope.
- QuickBooking không mất phim ngoài trang đầu.
- /booking?movieId=… tải được phim theo ID và xử lý 404 riêng.
- Phim không có suất tại rạp hiện tại vẫn cho đổi rạp, không mất phim URL.
- Hero giữ thứ tự BE và không fallback toàn hệ thống khi scope rạp rỗng/lỗi.
- Không có dữ liệu scope cũ xuất hiện khi đổi rạp.

### Commit message

```text
refactor(home): separate section catalogs from booking movie options
```

## 10. FE-API-04 — QuickBooking tìm ngày qua bookable

### Mục tiêu và trạng thái hiện tại

useHomeShowtimes gọi by-movie để tạo danh sách ngày; QuickBooking lọc rạp/future/OPEN tại FE. Query cho ngày đã chọn và refetch trước navigation đã dùng bookable.

### File cần sửa

```text
src/features/home/api/home-queries.ts
src/features/home/components/QuickBooking.vue
```

Nếu dùng nguồn bookable chung cho Hero/Home, kiểm tra và cập nhật composables liên quan trong round riêng; không đổi programme dùng cho UPCOMING.

### Quyết định nghiệp vụ cần chốt trước phần phụ thuộc

- Bao nhiêu ngày được hiển thị ban đầu?
- Cho phép xem thêm ngày xa hơn hay chỉ cửa sổ cố định?
- Nếu cửa sổ lớn hơn maximum-range runtime, phân đoạn request thế nào?
- Phạm vi này có áp dụng cho danh sách phim và Hero hay chỉ dropdown ngày?

Giới hạn 7 ngày mặc định của BE là giới hạn mỗi request, không phải quyết định sản phẩm về lịch hiển thị.

### Hướng thay đổi sau khi chốt

- Discovery query có cinemaId, movieId, from, to.
- Đổi rạp/phim reset ngày và suất.
- Có thể tiếp tục refetch bookable của ngày chọn trước navigation.
- Giữ Room API để lấy roomType; ShowtimeResponse hiện chưa có field đó.
- Giữ timezone Việt Nam và khoảng [from,to).
- Không suy ra còn ghế từ OPEN_FOR_BOOKING.
- Không dùng bookable thay nguồn planned programme của phim sắp chiếu.

### Kiểm tra thủ công và nghiệm thu

- Không tải lịch phim của mọi rạp để tạo dropdown ngày.
- Ngày và suất đúng rạp/phim/khoảng đã chốt.
- Không chọn được suất đã quá giờ hoặc không còn OPEN.
- Lỗi discovery không dẫn tới dữ liệu toàn hệ thống.
- Đổi scope trong lúc refetch không điều hướng bằng lựa chọn cũ.

### Commit message

```text
refactor(quick-booking): discover dates from scoped bookable showtimes
```

## 11. Phần cần Backend mới hoặc quyết định riêng

### BE-DEP-01 — Programme theo rạp

Current source: cinema-programme.queries.ts lấy rooms active rồi lịch từng room, chạy từng batch tối đa 4 request.

Đề xuất API additive do Inventory sở hữu, hỗ trợ cinemaId, khoảng thời gian và trạng thái phù hợp. Route, operationId, pagination, schema và security chưa chốt; không coi đây là API đã tồn tại.

Phải xác định:

- “Programme” gồm trạng thái nào cho từng màn hình.
- Phạm vi tương lai và cách tải thêm.
- Hành vi Room/Cinema inactive.
- Pagination/count/order nếu có.
- Customer và Admin có cùng contract hoặc tách API không.

Không thay toàn bộ useCinemaProgrammeQuery bằng bookable: UPCOMING cần SCHEDULED và source hiện tại không có cửa sổ thời gian giới hạn.

### BE-DEP-02 — Movie search cho Admin

Admin Dashboard autocomplete hiện tải GET /movies rồi lọc options. Catalog chưa có q/title-search.

Nếu cần tối ưu theo quy mô, thiết kế tìm kiếm/paging phía BE và giữ ability resolve phim đã chọn theo ID. Không dùng trang đầu catalog làm toàn bộ autocomplete.

Admin Dashboard đã reuse tên phim tải sẵn và chỉ đọc detail khi thiếu; không cần thêm batch request khi không phát sinh lợi ích.

### Các phần chưa có contract chính thức

- Availability tổng hợp.
- Promotion.
- Membership.
- Concession/quote/checkout mở rộng trong tài liệu BE.

Không tạo API/mô hình/dữ liệu FE như thể những phần này đã implement.

BookingSeatSelection hiện chỉ chọn ghế và tạm tính, chưa tạo booking. Kết nối POST /bookings là round riêng; không trộn vào round read model seat-map. Không cấp inventory:write cho customer để làm hold trực tiếp.

## 12. Caller giữ nguyên và quản lý tương thích

- GET /movies cũ tiếp tục hỗ trợ caller chưa chuyển.
- GET /movies/{id} cho detail.
- GET /movies/hero cho editorial; autoplay/carousel là FE.
- GET /genres cho Admin create/edit, vì cần thể loại chưa gắn phim.
- Admin Movies catalog và các mutation CRUD hiện có.
- Admin Dashboard totals qua page.totalElements.
- Admin lịch GET /showtimes?from&to; không dùng bookable để đại diện mọi trạng thái.
- GET /cinemas cho rạp active; không gán count đó thành tổng mọi rạp.
- Room API cho roomType.
- OIDC/Authorization headers/refresh hiện có.

Có thể thống nhất cache của các query cùng endpoint khi scope/semantics giống nhau, nhưng phải xem kiểu raw data và mapper; đổi cache không nhất thiết phải đổi API.

Inventory/movies/security không cần migration mới cho các round caller nêu trên. Giữ API additive phía BE khi triển khai dependency sau.

## 13. Source tham chiếu

Các link dùng commit đã đối chiếu để tài liệu có thể tái kiểm tra.

### Backend

- [Tài liệu đề xuất](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/docs/cinema_backend_home_proposals.md)
- [MovieController](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/services/movie-service/src/main/java/com/cinema/movie/controller/MovieController.java)
- [MovieServiceImpl](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/services/movie-service/src/main/java/com/cinema/movie/service/impl/MovieServiceImpl.java)
- [MovieCatalogGenreController](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/services/movie-service/src/main/java/com/cinema/movie/controller/MovieCatalogGenreController.java)
- [MovieCatalogGenreService](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/services/movie-service/src/main/java/com/cinema/movie/service/MovieCatalogGenreService.java)
- [BookableShowtimeProperties](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/services/inventory-service/src/main/java/com/cinema/inventory/config/BookableShowtimeProperties.java)
- [ShowtimeController](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/services/inventory-service/src/main/java/com/cinema/inventory/controller/ShowtimeController.java)
- [ShowtimeRepository](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/services/inventory-service/src/main/java/com/cinema/inventory/repository/ShowtimeRepository.java)
- [Seat-map controller](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/services/inventory-service/src/main/java/com/cinema/inventory/controller/ShowtimeSeatMapController.java)
- [Seat-map service](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/services/inventory-service/src/main/java/com/cinema/inventory/service/ShowtimeSeatMapService.java)
- [Seat-map DTO](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/services/inventory-service/src/main/java/com/cinema/inventory/dto/response/ShowtimeSeatMapResponse.java)
- [Seat-map OpenAPI configuration](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/services/inventory-service/src/main/java/com/cinema/inventory/config/SeatMapOpenApiConfiguration.java)
- [Movie security](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/services/movie-service/src/main/java/com/cinema/movie/config/MovieSecurityConfig.java)
- [Inventory security](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/services/inventory-service/src/main/java/com/cinema/inventory/config/InventorySecurityConfig.java)
- [Gateway security](https://github.com/HuyKunNe/cinema-system/blob/7f51e97fe1dcd896c8dd02b8d8ed729991e357ce/infrastructure/gateway-service/src/main/java/com/cinema/gateway/config/GatewaySecurityConfiguration.java)

### Frontend

- [Movies query](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/src/features/movies/api/movie-queries.ts)
- [Movies programme](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/src/features/movies/composables/use-movies-programme.ts)
- [Movies page](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/src/features/movies/pages/MoviesPage.vue)
- [Shared cinema programme](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/src/features/cinemas/api/cinema-programme.queries.ts)
- [Home query](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/src/features/home/api/home-queries.ts)
- [Home programme](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/src/features/home/composables/use-home-programme.ts)
- [QuickBooking](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/src/features/home/components/QuickBooking.vue)
- [Booking query](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/src/features/booking/api/booking-queries.ts)
- [Booking seat mapper](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/src/features/booking/mappers/booking-seat.mapper.ts)
- [Booking seat selection](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/src/features/booking/components/BookingSeatSelection.vue)
- [Booking Start](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/src/features/booking/pages/BookingStartPage.vue)
- [Admin Dashboard query](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/src/features/admin/api/admin-dashboard-queries.ts)
- [Admin Movie query](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/src/features/movies/admin/api/admin-movie-queries.ts)
- [OpenAPI generation process](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/docs/api/OPENAPI_GENERATION.md)
- [Orval config](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/orval.config.ts)
- [Movie snapshot](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/openapi/movie-service.json)
- [Inventory snapshot](https://github.com/HuyKunNe/cinematic-web/blob/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/openapi/inventory-service.json)
- [HTML/CSS references](https://github.com/HuyKunNe/cinematic-web/tree/62d9bd07e878574ab4ef6399d26aaad9fdfd056d/docs/design/reference/html-convert)

## 14. Commit tài liệu đề xuất

Khi người phát triển tự đưa file này vào FE repository:

```text
docs(fe): plan migration to scoped catalog and showtime seat maps
```

Tạo tài liệu không đồng nghĩa thực thi bất kỳ round code nào ở trên.

