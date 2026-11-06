# Backend API Inventory

## Phạm vi và nguồn

Inventory này được lập từ controller, DTO, enum, security configuration, gateway routes và cấu hình OpenAPI trong `HuyKunNe/cinema-system`.

### Đối chiếu A0.2 — 2026-11-06

- FE đầu lượt: `8c081d0`; BE source đã đọc: `ac0915521d5562d4836ab1d95a5a3883a835148a` (working tree BE có thay đổi, chỉ đọc).
- Đã đọc OpenAPI runtime tại cả năm URL trong `orval.config.ts` và chạy `npm run api` bằng Orval 8.38.0. Generated code không có diff nội dung so với FE đầu lượt.
- Đối chiếu tĩnh operation ID với hàm generated: Movie 19, User 7, Inventory 66, Booking 6, Payment 5; không thiếu/thừa. Đây không phải kiểm tra thực thi endpoint hoặc toàn bộ DTO của năm service.
- Snapshot Movie/Inventory và metadata nguồn nằm trong `openapi/`. `/actuator/info` của cả năm service trả `{}`; chưa xác định commit của binary đang chạy. Commit trên chỉ nhận diện source đã đọc, không chứng minh runtime provenance.
- Phạm vi contract review lượt này: screening versions, matrix request/response, Admin booking/payment lookup và việc loại refund/reconciliation operations. Các mục nền khác bên dưới chưa được tái audit đầy đủ; ưu tiên source/runtime khi có khác biệt. Không dùng danh sách nền này để suy ra API hoặc permission mới.
- Không chạy test, build, lint, type-check hoặc browser. R28 Notification tiếp tục hoãn.

### Screening versions — contract đã đối chiếu

`contentFormat` chỉ có `2D`, `3D`. `projectionTechnology` tách riêng với `STANDARD`, `IMAX`, `FOUR_DX`, `SCREEN_X`. Không xem IMAX/4DX là định dạng hình ảnh.

| Method và URL | Operation ID | Contract |
| --- | --- | --- |
| `POST /api/v1/movies` | `createMovie` | `CreateMovieRequest.screeningVersions`: danh sách không rỗng của `CreateMovieScreeningVersionRequest` |
| `PUT /api/v1/movies/{id}` | `updateMovie` | `UpdateMovieRequest.screeningVersions`: toàn bộ danh sách không rỗng của `SaveMovieScreeningVersionRequest` |
| `GET /api/v1/movies/{movieId}/screening-versions` | `listMovieScreeningVersions` | Query `active` tùy chọn; danh sách `MovieScreeningVersionResponse` |
| `GET /api/v1/movies/{movieId}/screening-versions/{versionId}` | `getMovieScreeningVersion` | `MovieScreeningVersionResponse` |
| `POST /api/v1/movies/{movieId}/screening-versions` | `createMovieScreeningVersion` | Endpoint riêng vẫn tồn tại; form tạo/sửa phim dùng request lồng ở trên |
| `PUT /api/v1/movies/{movieId}/screening-versions/{versionId}/active` | `updateMovieScreeningVersionActive` | `UpdateMovieScreeningVersionActiveRequest` với active và expectedVersion |

Movie security cho phép public GET dưới movies/genres; ghi yêu cầu `movie:manage`. Bảng trên không mở rộng quyền từ khai báo Swagger.

- Create/save item mặc định 2D và STANDARD khi thiếu/null. `audioLanguage` không trắng, tối đa 100 ký tự; `presentationType` là SUBTITLED/DUBBED/NO_SUBTITLES. SUBTITLED cần phụ đề không trắng; hai kiểu còn lại yêu cầu phụ đề trống/null/không gửi.
- Update phải giữ mọi ID đã lưu và `expectedVersion` tương ứng; item mới bỏ ID/version. `active` bắt buộc trong save item. Định nghĩa đã lưu immutable; uniqueness gồm format, projection, audio, presentation, subtitle; BE so sánh ngôn ngữ không phân biệt hoa/thường sau chuẩn hóa.
- Movie response có ID, movieId, contentFormat, projectionTechnology, audioLanguage, presentationType, subtitleLanguage, active, version. Subtitle có thể null. Runtime Movie schema còn đánh dấu nullable ở một số response/item; giữ nguyên generated union/null, không sửa tay để làm mạnh contract.
- Inventory `ShowtimeScreeningVersionResponse` có projectionTechnology cùng contentFormat, ID/version và ngôn ngữ được ghim khi tạo suất. Schema runtime không khai báo required list nên generated properties vẫn optional; không tự đổi chúng thành required.

### Matrix và Admin booking đã đối chiếu

- `CreateRoomLayoutRequest { roomId }` được BE mặc định thành ma trận 6×6 rỗng.
- `ReplaceRoomLayoutContentRequest` gửi `expectedVersion` và `matrix` hoặc legacy seats/elements, không gửi cả hai biểu diễn. `RoomLayoutMatrixInput` có rowCount/columnCount (1–100) và seats (tối đa 2500); ghế mang vị trí rowIndex/columnIndex. Cell rỗng được bảo toàn qua dimensions và vị trí ghế, không gửi DTO UI trực tiếp.
- Response content có matrix dimensions/seats; không suy vị trí từ seat catalog. Xem snapshot Inventory và DTO BE để biết đầy đủ field/version/nullability.
- Admin booking có `GET /api/v1/bookings/management` (`listBookingsForAdmin`) và `GET /api/v1/bookings/management/{bookingId}` (`getBookingForAdmin`), trả ApiResponse chứa page/detail BookingResponse. Đối chiếu controller/security trước khi mở thao tác; không dùng API đọc booking của khách làm API Admin.

## Các mục nền và endpoint tham chiếu

Các phần dưới giữ thông tin nền của inventory cũ, với phần Payment/OpenAPI được cập nhật trong A0.2. Chúng không phải xác nhận toàn bộ hợp đồng hiện tại.

## Base URL và service

Frontend nên gọi API nghiệp vụ qua API Gateway, không gọi thẳng từng microservice.

| Mục tiêu                            | Local URL               |
| ----------------------------------- | ----------------------- |
| API Gateway                         | `http://localhost:8080` |
| Movie Service                       | `http://localhost:8081` |
| User Service / Authorization Server | `http://localhost:8082` |
| Inventory Service                   | `http://localhost:8083` |
| Booking Service                     | `http://localhost:8084` |
| Payment Service                     | `http://localhost:8085` |

Các port microservice là cấu hình local mặc định trong backend config repo; host/port production chưa được cung cấp. Cấu hình frontend nên dùng `VITE_API_BASE_URL` cho gateway và một cấu hình riêng cho OIDC authority.

Gateway route các API sau:

- `/api/v1/movies/**`, `/api/v1/genres/**` → Movie Service
- `/api/v1/users/**` → User Service
- `/api/v1/cinemas/**`, `/api/v1/rooms/**`, `/api/v1/showtimes/**`, `/api/v1/seats/**`, `/api/v1/show-seats/**` → Inventory Service
- `/api/v1/bookings/**` → Booking Service
- `/api/v1/payments/**` → Payment Service

Gateway có route `/api/v1/notifications/**`, nhưng Notification Service thuộc R28 và đang deferred. Route hiện có không chứng minh endpoint/controller đó đã sẵn sàng sử dụng.

## OpenAPI / Swagger

- Backend có `common-openapi`, dùng `springdoc-openapi-starter-webmvc-ui` phiên bản `2.8.9`.
- Movie, Inventory, Booking, Payment và User Service phụ thuộc vào `common-openapi`.
- Security config của các service cho phép `/swagger-ui.html`, `/swagger-ui/**`, `/v3/api-docs`, `/v3/api-docs/**`.
- OpenAPI được cấu hình động; FE lưu snapshot Movie/Inventory trong `openapi/` cùng metadata và giới hạn provenance.
- Tài liệu có thể được phục vụ trực tiếp bởi từng service khi service đang chạy, thường tại `/v3/api-docs` và `/swagger-ui/index.html` trên port của service.
- Gateway không cấu hình route/aggregation cho `/v3/api-docs` hoặc `/swagger-ui/**`. Gateway security cũng deny các exchange ngoài các route được phép.
- A0.2 đã đọc `/v3/api-docs` tại ports 8081–8085; không kiểm tra giao diện Swagger hoặc thực thi API nghiệp vụ.
- OpenAPI security scheme chung khai báo OAuth2 Authorization Code. Security scheme này không đồng nghĩa mọi route đều protected; hãy dùng security rules/controller dưới đây làm nguồn phân loại.
- Scope khai báo trong OpenAPI không khớp hoàn toàn với security rules thực tế. Xem mục “Permission discrepancies”.

## Phân loại

- **Public read:** GET được security config cho phép không cần access token.
- **Authenticated:** cần bearer token hợp lệ.
- **Admin/protected:** cần bearer token và permission được nêu trong security config.
- **Operational:** endpoint phục vụ provider/service integration, không phải luồng UI khách hàng.

Các status thành công dưới đây là status controller trả về. API có thể trả lỗi ngoài các status đó.

## Movie Service — `/api/v1/movies`, `/api/v1/genres`

Base URL qua gateway: `http://localhost:8080`.

| Method và URL                | Phân loại / quyền      | Parameters                        | Request DTO          | Response DTO / status         |
| ---------------------------- | ---------------------- | --------------------------------- | -------------------- | ----------------------------- |
| `GET /api/v1/movies`         | Public read            | Không có query parameter khai báo | —                    | `List<MovieResponse>` · `200` |
| `GET /api/v1/movies/{id}`    | Public read            | Path: `id` UUID                   | —                    | `MovieResponse` · `200`       |
| `POST /api/v1/movies`        | Admin · `movie:manage` | —                                 | `CreateMovieRequest` | `MovieResponse` · `201`       |
| `PUT /api/v1/movies/{id}`    | Admin · `movie:manage` | Path: `id` UUID                   | `UpdateMovieRequest` | `MovieResponse` · `200`       |
| `DELETE /api/v1/movies/{id}` | Admin · `movie:manage` | Path: `id` UUID                   | —                    | Không có body · `204`         |
| `GET /api/v1/genres`         | Public read            | —                                 | —                    | `List<GenreResponse>` · `200` |
| `GET /api/v1/genres/{id}`    | Public read            | Path: `id` UUID                   | —                    | `GenreResponse` · `200`       |
| `POST /api/v1/genres`        | Admin · `movie:manage` | —                                 | `CreateGenreRequest` | `GenreResponse` · `201`       |
| `PUT /api/v1/genres/{id}`    | Admin · `movie:manage` | Path: `id` UUID                   | `UpdateGenreRequest` | `GenreResponse` · `200`       |
| `DELETE /api/v1/genres/{id}` | Admin · `movie:manage` | Path: `id` UUID                   | —                    | Không có body · `204`         |

### Movie và Genre DTO

`MovieResponse`:

- `id: UUID`
- `title: string`
- `description: string`
- `durationMinutes: integer`
- `releaseDate: LocalDate`
- `posterUrl: string`
- `trailerUrl: string`
- `status: MovieStatus`
- `genres: Set<GenreResponse>`
- `version: integer`
- `createdAt`, `updatedAt: OffsetDateTime`

`GenreResponse`:

- `id: UUID`, `name`, `description`
- `version`
- `createdAt`, `updatedAt: OffsetDateTime`

`CreateMovieRequest` và `UpdateMovieRequest`:

- `title`: bắt buộc, không trắng, tối đa 255 ký tự.
- `description`: tối đa 5.000 ký tự.
- `durationMinutes`: bắt buộc, tối thiểu 1.
- `releaseDate`: `LocalDate`, không bắt buộc.
- `posterUrl`, `trailerUrl`: tối đa 500 ký tự.
- `status`: bắt buộc, enum `MovieStatus`.
- `genreIds`: bắt buộc, không rỗng, tập hợp UUID.

`CreateGenreRequest` và `UpdateGenreRequest`:

- `name`: bắt buộc, không trắng, tối đa 100 ký tự.
- `description`: tối đa 500 ký tự.

Không có filter hoặc pagination được khai báo ở `GET /movies` hoặc `GET /genres`. Không giả định API tự lọc status, sắp xếp hoặc tìm kiếm nếu chưa xác minh contract/service behavior.

## Inventory Service — rạp, phòng và ghế

Base URL qua gateway: `http://localhost:8080`.

Các GET inventory dưới đây là public theo `InventorySecurityConfig`. Các thao tác ghi cần permission theo từng route.

| Method và URL                          | Phân loại / quyền          | Parameters                | Request DTO              | Response DTO / status          |
| -------------------------------------- | -------------------------- | ------------------------- | ------------------------ | ------------------------------ |
| `GET /api/v1/cinemas`                  | Public read                | Query `city` tùy chọn     | —                        | `List<CinemaResponse>` · `200` |
| `GET /api/v1/cinemas/{cinemaId}`       | Public read                | Path `cinemaId: UUID`     | —                        | `CinemaResponse` · `200`       |
| `POST /api/v1/cinemas`                 | Admin · `inventory:manage` | —                         | `CreateCinemaRequest`    | `CinemaResponse` · `201`       |
| `PUT /api/v1/cinemas/{cinemaId}`       | Admin · `inventory:manage` | Path `cinemaId: UUID`     | `UpdateCinemaRequest`    | `CinemaResponse` · `200`       |
| `GET /api/v1/rooms?cinemaId={id}`      | Public read                | Query `cinemaId` bắt buộc | —                        | `List<RoomResponse>` · `200`   |
| `GET /api/v1/rooms/{roomId}`           | Public read                | Path `roomId: UUID`       | —                        | `RoomResponse` · `200`         |
| `POST /api/v1/rooms?cinemaId={id}`     | Admin · `inventory:manage` | Query `cinemaId` bắt buộc | `CreateRoomRequest`      | `RoomResponse` · `201`         |
| `PUT /api/v1/rooms/{roomId}`           | Admin · `inventory:manage` | Path `roomId: UUID`       | `UpdateRoomRequest`      | `RoomResponse` · `200`         |
| `GET /api/v1/seats?roomId={id}`        | Public read                | Query `roomId` bắt buộc   | —                        | `List<SeatResponse>` · `200`   |
| `GET /api/v1/seats/{seatId}`           | Public read                | Path `seatId: UUID`       | —                        | `SeatResponse` · `200`         |
| `POST /api/v1/seats?roomId={id}`       | Admin · `inventory:manage` | Query `roomId` bắt buộc   | `CreateSeatRequest`      | `SeatResponse` · `201`         |
| `POST /api/v1/seats/range?roomId={id}` | Admin · `inventory:manage` | Query `roomId` bắt buộc   | `CreateSeatRangeRequest` | `List<SeatResponse>` · `201`   |
| `PUT /api/v1/seats/{seatId}`           | Admin · `inventory:manage` | Path `seatId: UUID`       | `UpdateSeatRequest`      | `SeatResponse` · `200`         |

Không thấy delete endpoint cho cinema, room hoặc physical seat trong các controller hiện tại.

### Cinema, Room, Seat DTO và validation

`CinemaResponse`: `id`, `name`, `address`, `city`, `active`, `createdAt`, `updatedAt`.

- `CreateCinemaRequest`: `name` bắt buộc tối đa 150; `address` bắt buộc tối đa 500; `city` bắt buộc tối đa 100.
- `UpdateCinemaRequest`: các trường trên và `active` đều bắt buộc; cùng giới hạn độ dài.

`RoomResponse`: `id`, `cinemaId`, `name`, `roomType`, `active`, timestamps.

- `CreateRoomRequest`: `name` bắt buộc tối đa 100; `roomType` bắt buộc.
- `UpdateRoomRequest`: các trường trên và `active` đều bắt buộc.

`SeatResponse`: `id`, `roomId`, `seatNumber`, `rowLabel`, `seatType`, `active`, timestamps.

- `CreateSeatRequest`: `seatNumber` bắt buộc tối đa 20; `rowLabel` bắt buộc tối đa 10; `seatType` bắt buộc.
- `UpdateSeatRequest`: các trường trên và `active` đều bắt buộc.
- `CreateSeatRangeRequest`: `rowLabel` bắt buộc tối đa 10; `startNumber`, `endNumber` bắt buộc và từ 1 đến 999; `seatType` bắt buộc; `endNumber >= startNumber`.

## Inventory Service — lịch chiếu và ghế theo suất

| Method và URL                                   | Phân loại / quyền             | Parameters                                                        | Request DTO                | Response DTO / status            |
| ----------------------------------------------- | ----------------------------- | ----------------------------------------------------------------- | -------------------------- | -------------------------------- |
| `GET /api/v1/showtimes`                         | Public read                   | `from`, `to` bắt buộc, ISO date-time                              | —                          | `List<ShowtimeResponse>` · `200` |
| `GET /api/v1/showtimes/{showtimeId}`            | Public read                   | Path UUID                                                         | —                          | `ShowtimeResponse` · `200`       |
| `GET /api/v1/showtimes/by-room/{roomId}`        | Public read                   | Path UUID                                                         | —                          | `List<ShowtimeResponse>` · `200` |
| `GET /api/v1/showtimes/by-movie/{movieId}`      | Public read                   | Path UUID                                                         | —                          | `List<ShowtimeResponse>` · `200` |
| `POST /api/v1/showtimes`                        | Admin · `showtime:manage`     | —                                                                 | `CreateShowtimeRequest`    | `ShowtimeResponse` · `201`       |
| `PUT /api/v1/showtimes/{showtimeId}`            | Admin · `showtime:manage`     | Path UUID                                                         | `UpdateShowtimeRequest`    | `ShowtimeResponse` · `200`       |
| `PATCH /api/v1/showtimes/{showtimeId}/open`     | Admin · `showtime:manage`     | Path UUID                                                         | —                          | `ShowtimeResponse` · `200`       |
| `PATCH /api/v1/showtimes/{showtimeId}/close`    | Admin · `showtime:manage`     | Path UUID                                                         | —                          | `ShowtimeResponse` · `200`       |
| `PATCH /api/v1/showtimes/{showtimeId}/cancel`   | Admin · `showtime:manage`     | Path UUID                                                         | —                          | `ShowtimeResponse` · `200`       |
| `PATCH /api/v1/showtimes/{showtimeId}/complete` | Admin · `showtime:manage`     | Path UUID                                                         | —                          | `ShowtimeResponse` · `200`       |
| `GET /api/v1/show-seats`                        | Public read                   | `showtimeId` bắt buộc; `availableOnly` tùy chọn, mặc định `false` | —                          | `List<ShowSeatResponse>` · `200` |
| `GET /api/v1/show-seats/{showSeatId}`           | Public read                   | Path UUID                                                         | —                          | `ShowSeatResponse` · `200`       |
| `POST /api/v1/show-seats?showtimeId={id}`       | Admin · `inventory:manage`    | Query `showtimeId` bắt buộc                                       | `GenerateShowSeatsRequest` | `List<ShowSeatResponse>` · `201` |
| `PUT /api/v1/show-seats/{id}/hold`              | Protected · `inventory:write` | Path UUID                                                         | `HoldShowSeatRequest`      | `ShowSeatResponse` · `200`       |
| `PUT /api/v1/show-seats/{id}/book`              | Protected · `inventory:write` | Path UUID                                                         | `ShowSeatBookingRequest`   | `ShowSeatResponse` · `200`       |
| `PUT /api/v1/show-seats/{id}/release`           | Protected · `inventory:write` | Path UUID                                                         | `ShowSeatBookingRequest`   | `ShowSeatResponse` · `200`       |
| `PUT /api/v1/show-seats/{id}/unavailable`       | Admin · `inventory:manage`    | Path UUID                                                         | —                          | `ShowSeatResponse` · `200`       |
| `PUT /api/v1/show-seats/{id}/available`         | Admin · `inventory:manage`    | Path UUID                                                         | —                          | `ShowSeatResponse` · `200`       |

`CreateShowtimeRequest`:

- `movieId`, `roomId`: UUID bắt buộc.
- `startsAt`, `endsAt`: `OffsetDateTime` bắt buộc, phải ở tương lai.
- `basePrice`: bắt buộc, tối thiểu `0.01`, tối đa 10 chữ số nguyên và 2 chữ số thập phân.
- `endsAt` phải sau `startsAt`.

`UpdateShowtimeRequest`:

- `startsAt`, `endsAt`, `status` đều bắt buộc.
- `endsAt` phải sau `startsAt`.

`GenerateShowSeatsRequest`: `defaultPrice` bắt buộc, tối thiểu `0.01`.

`HoldShowSeatRequest`: `bookingId` UUID bắt buộc; `expiresAt` là `OffsetDateTime` bắt buộc và phải ở tương lai.

`ShowSeatBookingRequest`: `bookingId` UUID bắt buộc.

`ShowtimeResponse`: `id`, `movieId`, `roomId`, `roomName`, `cinemaId`, `cinemaName`, `startsAt`, `endsAt`, `status`, timestamps.

`ShowSeatResponse`: `id`, `showtimeId`, `seatId`, `seatNumber`, `seatType`, `price`, `status`, `heldByBookingId`, `holdExpiresAt`, timestamps.

## Booking Service — `/api/v1/bookings`

Mọi route booking cần bearer token theo `BookingSecurityConfig`. Controller truyền `CurrentUser.id()` vào service; request không nhận `userId` từ client. Vì vậy thao tác đọc/hủy được xử lý trong ngữ cảnh người dùng hiện tại.

| Method và URL                              | Phân loại / quyền      | Parameters                                          | Request DTO            | Response DTO / status                                                       |
| ------------------------------------------ | ---------------------- | --------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `POST /api/v1/bookings`                    | Authenticated customer | —                                                   | `CreateBookingRequest` | `ApiResponse<BookingResponse>` · `202 Accepted`; trả `Location` tới booking |
| `GET /api/v1/bookings/{bookingId}`         | Authenticated customer | Path UUIDv7                                         | —                      | `ApiResponse<BookingResponse>` · `200`                                      |
| `GET /api/v1/bookings`                     | Authenticated customer | `page` mặc định 0; `size` mặc định 20, từ 1 đến 100 | —                      | `ApiResponse<PageResponse<BookingResponse>>` · `200`                        |
| `POST /api/v1/bookings/{bookingId}/cancel` | Authenticated customer | Path UUIDv7                                         | —                      | `ApiResponse<BookingResponse>` · `200`                                      |

`CreateBookingRequest`:

- `clientRequestId`: bắt buộc, không trắng, tối đa 100 ký tự; dùng cho request idempotency.
- `showtimeId`: UUIDv7 bắt buộc.
- `seatNumbers`: danh sách không rỗng; mỗi phần tử không trắng, tối đa 20 ký tự.
- Booking config mặc định giới hạn tối đa 10 ghế mỗi booking; reservation expiration mặc định 10 phút.

`BookingResponse`: `id`, `userId`, `showtimeId`, `clientRequestId`, `status`, `totalAmount`, `currency`, `expiresAt`, `confirmedAt`, `cancelledAt`, `rejectionReason`, `seats`, `version`, timestamps.

`BookingSeatResponse`: `id`, `inventorySeatId`, `showtimeId`, `seatNumber`, `seatType`, `price`.

`PageResponse<T>`:

- `content: T[]`
- `page: { page, size, totalElements, totalPages, first, last }`

Tạo booking là luồng bất đồng bộ và trả `202`; frontend nên đọc lại booking bằng GET để theo dõi status. Không gửi user ID từ frontend.

## User Service — profile và tài khoản admin

API nghiệp vụ User đi qua gateway. Authorization Server/OIDC protocol paths không được gateway route trong cấu hình hiện tại.

| Method và URL                          | Phân loại / quyền      | Parameters | Request DTO                        | Response DTO / status                |
| -------------------------------------- | ---------------------- | ---------- | ---------------------------------- | ------------------------------------ |
| `GET /api/v1/users/me`                 | Authenticated customer | —          | —                                  | `CurrentUserProfileResponse` · `200` |
| `PUT /api/v1/users/me`                 | Authenticated customer | —          | `UpdateCurrentUserProfileRequest`  | `CurrentUserProfileResponse` · `200` |
| `PUT /api/v1/users/me/password`        | Authenticated customer | —          | `ChangeCurrentUserPasswordRequest` | Không có body · `204`                |
| `PATCH /api/v1/users/{userId}/lock`    | Admin · `user:manage`  | Path UUID  | —                                  | Không có body · `204`                |
| `PATCH /api/v1/users/{userId}/unlock`  | Admin · `user:manage`  | Path UUID  | —                                  | Không có body · `204`                |
| `PATCH /api/v1/users/{userId}/disable` | Admin · `user:manage`  | Path UUID  | —                                  | Không có body · `204`                |
| `PATCH /api/v1/users/{userId}/enable`  | Admin · `user:manage`  | Path UUID  | —                                  | Không có body · `204`                |

`UpdateCurrentUserProfileRequest`: `firstName` tối đa 100 ký tự; `lastName` tối đa 100; `phoneNumber` tối đa 32. Các trường không được đánh dấu bắt buộc trong DTO.

`ChangeCurrentUserPasswordRequest`: `currentPassword` và `newPassword` bắt buộc, không trắng. DTO không định nghĩa giới hạn độ dài trong bean validation.

`CurrentUserProfileResponse`: `id`, `email`, `username`, `status`, `firstName`, `lastName`, `phoneNumber`, `emailVerifiedAt`, `createdAt`, `updatedAt`.

## Payment Service — endpoints có controller

Mọi API payment đi qua gateway. Đã đối chiếu PaymentManagementController, PaymentAuditController, PaymentProviderWebhookController và PaymentSecurityConfig với runtime OpenAPI trong A0.2. Không có API refund/resolve/reject reconciliation được phục vụ; security deny các đường dẫn refund/reconciliation cũ.

| Method và URL                                             | Phân loại / quyền                                                   | Parameters                                                | Request DTO                    | Response DTO / status                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------ | ------------------------------------------------------ |
| `GET /api/v1/payments/management/by-booking/{bookingId}` | ADMIN và `payment:read` | UUIDv7; page=0, size=20 (1–100) | — | `ApiResponse<PageResponse<PaymentManagementResponse>>` · `200` |
| `GET /api/v1/payments/management/{paymentId}` | ADMIN và `payment:read` | UUIDv7 | — | `ApiResponse<PaymentManagementResponse>` · `200` |
| `GET /api/v1/payments/management/{paymentId}/transactions` | ADMIN và `payment:read` | UUIDv7; page=0, size=20 (1–100) | — | `ApiResponse<PageResponse<PaymentTransactionManagementResponse>>` · `200` |
| `GET /api/v1/payments/{paymentId}/audit`                  | Protected/admin · `payment:audit`                                   | Path UUID                                                 | —                              | `List<FinancialAuditRecordResponse>` · `200`           |
| `POST /api/v1/payments/webhooks/{provider}`               | Operational webhook; POST được permit trong Payment security config | Path `provider: string`; nhận raw request body và headers | Provider-specific bytes        | Raw `byte[]`, status/content-type theo acknowledgement |

Payment DTO:

- `PaymentManagementResponse`: id, bookingId, userId, paymentAttempt, amount, currency, provider, status, providerReference, failureCode, holdExpiresAt, requestedAt, completedAt, version, createdAt, updatedAt. Số tiền lấy từ dữ liệu đã lưu; providerReference/failureCode/completedAt có thể null.
- `PaymentTransactionManagementResponse`: id, paymentId, provider, transactionType (CHARGE), attemptNumber, status, amount, currency, providerReference, failureCode, requestedAt, completedAt, createdAt, updatedAt. attemptNumber khác paymentAttempt; các field nullable theo DTO/generated.
- `FinancialAuditRecordResponse`: `id`, `paymentId`, `action`, `actorType`, `actorId`, `reason`, `metadata`, `correlationId`, `occurredAt`.

### Không có controller tương ứng

`GET /api/v1/payments/{paymentId}` ngoài nhánh management không có controller trong source/runtime đã kiểm tra; matcher `GET /api/v1/payments/*` không tạo endpoint đó. Lookup Admin thực tế là `/api/v1/payments/management/{paymentId}` trong bảng trên.

Không tìm thấy endpoint trong controller để frontend khởi tạo payment trực tiếp. Luồng payment hiện bắt đầu qua backend booking/payment saga.

## Enum và trạng thái backend

Các enum refund/reconciliation/audit còn trong source nội bộ không chứng minh tồn tại API thao tác tương ứng. Không generate client hoặc dựng UI từ riêng danh sách enum này.

| Enum                       | Giá trị                                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `MovieStatus`              | `UPCOMING`, `NOW_SHOWING`, `ENDED`, `INACTIVE`                                                                                         |
| `RoomType`                 | `STANDARD`, `IMAX`, `FOUR_DX`, `SCREEN_X`, `VIP`                                                                                       |
| `SeatType`                 | `STANDARD`, `VIP`, `COUPLE`, `ACCESSIBLE`                                                                                              |
| `ShowtimeStatus`           | `SCHEDULED`, `OPEN_FOR_BOOKING`, `CLOSED`, `CANCELLED`, `COMPLETED`                                                                    |
| `ShowSeatStatus`           | `AVAILABLE`, `HELD`, `BOOKED`, `UNAVAILABLE`                                                                                           |
| `BookingStatus`            | `PENDING`, `RESERVED`, `REJECTED`, `CONFIRMED`, `PAYMENT_FAILED`, `CANCELLED`, `EXPIRED`                                               |
| `AccountStatus`            | `PENDING_VERIFICATION`, `ACTIVE`, `LOCKED`, `DISABLED`                                                                                 |
| `PaymentStatus`            | `RECEIVED`, `PROCESSING`, `PENDING_PROVIDER`, `SUCCEEDED`, `FAILED`, `EXPIRED`, `RECONCILIATION_REQUIRED`                              |
| `RefundStatus`             | `NOT_REQUESTED`, `PENDING`, `SUCCEEDED`, `FAILED`                                                                                      |
| `ReconciliationStatus`     | `OPEN`, `RESOLVED`, `REJECTED`                                                                                                         |
| `ReconciliationResolution` | `REFUND_SUCCEEDED`, `REFUND_FAILED`                                                                                                    |
| `PaymentTransactionStatus` | Kiểm tra enum backend trước khi dùng; được tham chiếu bởi `ReconciliationOperationResult`                                              |
| `FinancialAuditAction`     | `REFUND_REQUESTED`, `REFUND_SUCCEEDED`, `REFUND_FAILED`, `RECONCILIATION_OPENED`, `RECONCILIATION_RESOLVED`, `RECONCILIATION_REJECTED` |
| `FinancialAuditActorType`  | `USER`, `SERVICE`, `SYSTEM`                                                                                                            |

## Permission discrepancies cần xử lý trước khi bật chức năng

1. `InventorySecurityConfig` yêu cầu `inventory:write` cho hold/book/release. Permission này không có trong `PermissionCode` hoặc seed migration `V3__seed_initial_authorities.sql`.
2. Audit đọc yêu cầu `payment:audit`; lookup quản trị yêu cầu ADMIN và `payment:read`. Refund/reconciliation routes bị deny; không cấp hoặc suy ra `payment:refund`/`payment:reconcile` từ inventory cũ.
3. OpenAPI scope list cũng không khớp security rules trên; nó khai báo OAuth2 Authorization Code nhưng không liệt kê các permission/payment scope nói trên.
4. `GET /api/v1/payments/*` có security matcher nhưng chưa tìm thấy controller tương ứng.
5. Frontend không nên tự gọi inventory hold/book/release để đặt ghế. Public booking API là `POST /api/v1/bookings`; Inventory service sở hữu state ghế và saga xử lý các bước liên service.

## API chưa có trong controller hiện tại

- Hero và movie catalog đã có trong source/runtime Movie; không còn thuộc danh sách API thiếu. Xem `getHeroMovies`, `updateMovieHero`, `getMovieCatalog` và `getMovieCatalogGenres` trong generated client.
- Rating/review phim.
- Promotion/coupon/combo.
- Membership/points.
- Notification endpoints thuộc R28.
- Endpoint frontend khởi tạo payment hoặc chọn provider.

Không dựng sản phẩm giả hoặc tự suy đoán contract cho các mục này.
