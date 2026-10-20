# Đề xuất thay đổi Frontend: form suất chiếu

> Tài liệu gồm luồng FE và mockup HTML/CSS tham khảo. Không thay đổi repository.

## 1. Hành vi mong muốn

- Người dùng chọn rạp, phòng, phim và thời gian chiếu.
- Không nhập basePrice hoặc chọn layout thủ công.
- Khi chọn phòng, trang hiển thị layout PUBLISHED mới nhất mà BE sẽ gắn vào showtime.
- Khi có rạp và thời gian chiếu, trang hiển thị preview chỉ đọc theo nhóm vé và các phụ thu dự kiến.
- Loại vé phụ thuộc khách/điều kiện mua; loại ghế và định dạng là yếu tố phụ thu riêng.
- Không cho lưu nếu thiếu layout hoặc pricing policy; hiển thị lỗi BE cạnh phần cấu hình liên quan.

## 2. API và luồng FE

API sơ đồ đang có:

```http
GET /api/v1/room-layouts/published-seat-map?roomId={roomId}
```

API này yêu cầu inventory:manage; BE cần mở quyền đọc tối thiểu cho người quản lý showtime hoặc tạo API read-only tương ứng.

Các API giá dưới đây là đề xuất mới, chưa có trong contract hiện tại:

```http
GET  /api/v1/cinemas/{cinemaId}/pricing-policies/active
POST /api/v1/showtimes/pricing-preview
POST /api/v1/bookings/quote
```

Pricing preview nhận cinemaId, roomId, movieId và startsAt; trả bảng giá theo TicketCategory cùng policy version/rule đã áp dụng. Preview chỉ mang tính tham khảo đến khi chọn ghế và loại vé. Booking quote tính tổng cuối cùng cho từng seatId/TicketCategory. FE không tự tính tiền và không gửi basePrice.

Request/response minh họa cho pricing preview:

```json
{
  "cinemaId": "cinema-uuid",
  "roomId": "room-uuid",
  "movieId": "movie-uuid",
  "startsAt": "2026-10-25T18:30:00+07:00"
}
```

```json
{
  "policyVersion": 3,
  "appliedRule": "WEEKDAY_18_22",
  "ticketPrices": [
    { "ticketCategory": "ADULT", "baseFare": 75000 },
    { "ticketCategory": "SENIOR_55_PLUS", "baseFare": 55000 },
    { "ticketCategory": "STUDENT_U22_TEACHER", "baseFare": 49000 },
    { "ticketCategory": "CHILD", "baseFare": 49000 }
  ],
  "possibleSurcharges": [
    { "code": "COUPLE_SEAT", "amount": 10000 },
    { "code": "BLOCKBUSTER", "amount": 5000 },
    { "code": "SPECIAL_FORMAT", "amount": 5000 }
  ]
}
```

Luồng:

1. Tải rạp theo quyền người dùng; khi chọn rạp tải phòng và policy PUBLISHED.
2. Khi chọn phòng, tải layout PUBLISHED mới nhất và hiển thị phiên bản/số ghế.
3. Khi có rạp, phim và startsAt, gọi pricing preview để hiển thị giá theo nhóm vé.
4. Hiển thị phụ thu ghế đôi/phim bom tấn/định dạng ở phần riêng; không gộp chúng thành giá loại ghế.
5. Gửi movieId, roomId, startsAt, endsAt. Sau khi BE đổi contract, không gửi basePrice/roomLayoutId.
6. Nếu BE trả lỗi thiếu layout/policy/rule giá, nêu cấu hình còn thiếu và dẫn tới trang quản lý phù hợp nếu người dùng có quyền.

## 3. Khu vực FE cần cập nhật

- src/app/pages/admin/AdminShowtimesPage.vue: nút tạo mới và điều hướng sau khi lưu.
- Route /admin/showtimes/new hiện dùng AdminReferencePage: thay bằng trang form thật.
- Tạo AdminShowtimeCreatePage.vue theo quy ước page hiện tại.
- Tạo query/service cho published seat map, active pricing policy và pricing preview.
- Render preview theo ADULT, SENIOR_55_PLUS, STUDENT_U22_TEACHER, CHILD; hiển thị phụ thu thành danh sách riêng.
- Tái sinh src/services/api client/model từ OpenAPI BE; tránh chỉnh trực tiếp file generated.
- Dùng design tokens hiện có khi chuyển mockup sang Vue.

## 4. Mockup HTML/CSS độc lập

Mockup dùng placeholder cho dữ liệu động. Không lấy giá trị ví dụ làm dữ liệu nghiệp vụ.

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Tạo suất chiếu | Cinema Admin</title>
    <style>
      :root {
        color-scheme: dark;
        --primary: #e11d48;
        --primary-hover: #be123c;
        --bg: #0b0d12;
        --sidebar: #10131a;
        --surface: #151923;
        --surface-raised: #1b202b;
        --border: #2a3040;
        --text: #f4f5f7;
        --muted: #9ba3b4;
        --success: #34d399;
        --warning: #fbbf24;
        --danger: #fb7185;
        --sidebar-width: 248px;
        --header-height: 72px;
        --content-max: 1440px;
        --control-height: 46px;
        --radius-sm: 10px;
        --radius-md: 16px;
        --radius-lg: 22px;
        --space-1: 6px;
        --space-2: 10px;
        --space-3: 14px;
        --space-4: 18px;
        --space-5: 24px;
        --space-6: 32px;
        --space-7: 40px;
        --panel-shadow: 0 18px 48px rgb(0 0 0 / 20%);
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          'Segoe UI',
          sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      * {
        box-sizing: border-box;
      }
      body {
        min-width: 320px;
        margin: 0;
        background: var(--bg);
      }
      button,
      input,
      select {
        font: inherit;
      }
      button,
      select {
        cursor: pointer;
      }
      .app-shell {
        min-height: 100vh;
      }
      .sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        z-index: 3;
        display: flex;
        width: var(--sidebar-width);
        flex-direction: column;
        gap: var(--space-6);
        padding: var(--space-5) var(--space-4);
        border-right: 1px solid var(--border);
        background: var(--sidebar);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        color: var(--text);
        text-decoration: none;
      }
      .brand-mark {
        display: grid;
        width: 42px;
        aspect-ratio: 1;
        place-items: center;
        border-radius: var(--radius-sm);
        background: var(--primary);
        color: white;
        font-weight: 800;
      }
      .brand-name {
        display: block;
        font-size: 16px;
        font-weight: 750;
        letter-spacing: 0.02em;
      }
      .brand-caption {
        display: block;
        margin-top: 3px;
        color: var(--muted);
        font-size: 12px;
      }
      .nav-label {
        margin: 0 0 var(--space-2);
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .nav-list {
        display: grid;
        gap: var(--space-1);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .nav-link {
        display: flex;
        min-height: 44px;
        align-items: center;
        gap: var(--space-3);
        padding: 0 var(--space-3);
        border-radius: var(--radius-sm);
        color: var(--muted);
        text-decoration: none;
      }
      .nav-link:hover,
      .nav-link[aria-current='page'] {
        background: rgb(225 29 72 / 12%);
        color: var(--text);
      }
      .nav-link[aria-current='page'] {
        box-shadow: inset 3px 0 var(--primary);
      }
      .nav-icon {
        width: 20px;
        text-align: center;
      }
      .sidebar-bottom {
        margin-top: auto;
      }
      .main-area {
        min-height: 100vh;
        margin-left: var(--sidebar-width);
      }
      .topbar {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        min-height: var(--header-height);
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        padding: 0 var(--space-7);
        border-bottom: 1px solid var(--border);
        background: rgb(11 13 18 / 88%);
        backdrop-filter: blur(18px);
      }
      .breadcrumbs {
        color: var(--muted);
        font-size: 13px;
      }
      .breadcrumbs strong {
        color: var(--text);
        font-weight: 600;
      }
      .user-chip {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        color: var(--muted);
        font-size: 13px;
      }
      .avatar {
        display: grid;
        width: 34px;
        aspect-ratio: 1;
        place-items: center;
        border-radius: 50%;
        background: var(--surface-raised);
        color: var(--text);
        font-weight: 700;
      }
      main {
        width: min(100%, var(--content-max));
        margin: 0 auto;
        padding: var(--space-7);
      }
      .page-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: var(--space-4);
        margin-bottom: var(--space-6);
      }
      .eyebrow {
        margin: 0 0 var(--space-2);
        color: var(--primary);
        font-size: 12px;
        font-weight: 750;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: clamp(28px, 3vw, 38px);
        letter-spacing: -0.04em;
      }
      .page-description {
        max-width: 620px;
        margin: var(--space-2) 0 0;
        color: var(--muted);
        line-height: 1.6;
      }
      .button {
        display: inline-flex;
        min-height: var(--control-height);
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        padding: 0 var(--space-4);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--surface-raised);
        color: var(--text);
        font-weight: 650;
        text-decoration: none;
      }
      .button:hover {
        border-color: var(--muted);
      }
      .button-primary {
        border-color: var(--primary);
        background: var(--primary);
      }
      .button-primary:hover {
        border-color: var(--primary-hover);
        background: var(--primary-hover);
      }
      .button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
      .form-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.6fr) minmax(290px, 0.8fr);
        align-items: start;
        gap: var(--space-5);
      }
      .panel {
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: var(--surface);
        box-shadow: var(--panel-shadow);
      }
      .panel + .panel {
        margin-top: var(--space-5);
      }
      .panel-heading {
        padding: var(--space-5);
        border-bottom: 1px solid var(--border);
      }
      .panel-heading h2 {
        margin: 0;
        font-size: 17px;
      }
      .panel-heading p {
        margin: var(--space-1) 0 0;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.5;
      }
      .panel-body,
      .summary-card {
        display: grid;
        gap: var(--space-4);
        padding: var(--space-5);
      }
      .field-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-4);
      }
      .field {
        display: grid;
        min-width: 0;
        gap: var(--space-2);
      }
      .field-full {
        grid-column: 1 / -1;
      }
      label {
        color: var(--text);
        font-size: 13px;
        font-weight: 650;
      }
      .required {
        color: var(--primary);
      }
      .control {
        width: 100%;
        min-height: var(--control-height);
        padding: 0 var(--space-3);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        outline: none;
        background: var(--bg);
        color: var(--text);
      }
      .control:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgb(225 29 72 / 18%);
      }
      .control::placeholder {
        color: #687184;
      }
      .control:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      .readonly {
        background: var(--surface-raised);
        color: var(--muted);
      }
      .field-hint,
      .footer-hint {
        margin: 0;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.5;
      }
      .inline-note {
        display: flex;
        align-items: flex-start;
        gap: var(--space-2);
        padding: var(--space-3);
        border: 1px solid rgb(251 191 36 / 24%);
        border-radius: var(--radius-sm);
        background: rgb(251 191 36 / 7%);
        color: var(--muted);
        font-size: 12px;
        line-height: 1.5;
      }
      .inline-note strong {
        color: var(--warning);
      }
      .summary-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-3);
      }
      .summary-title {
        margin: 0;
        font-size: 15px;
      }
      .summary-subtitle {
        margin: var(--space-1) 0 0;
        color: var(--muted);
        font-size: 12px;
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        padding: 5px 9px;
        border-radius: 999px;
        background: rgb(52 211 153 / 10%);
        color: var(--success);
        font-size: 11px;
        font-weight: 750;
        white-space: nowrap;
      }
      .status::before {
        width: 6px;
        aspect-ratio: 1;
        border-radius: 50%;
        background: currentColor;
        content: '';
      }
      .detail-list {
        display: grid;
        gap: var(--space-3);
        margin: 0;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        gap: var(--space-3);
        color: var(--muted);
        font-size: 13px;
      }
      .detail-row dd {
        margin: 0;
      }
      .detail-row strong,
      .price-row strong {
        color: var(--text);
        font-weight: 600;
        text-align: right;
      }
      .price-list {
        display: grid;
        gap: var(--space-2);
      }
      .price-row {
        display: flex;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--border);
        color: var(--muted);
        font-size: 13px;
      }
      .price-row:last-child {
        border-bottom: 0;
      }
      .empty-state {
        padding: var(--space-4);
        border: 1px dashed var(--border);
        border-radius: var(--radius-sm);
        color: var(--muted);
        font-size: 13px;
        line-height: 1.5;
        text-align: center;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-3);
        padding-top: var(--space-4);
        border-top: 1px solid var(--border);
      }
      @media (max-width: 1050px) {
        :root {
          --sidebar-width: 210px;
        }
        main {
          padding: var(--space-5);
        }
        .topbar {
          padding-inline: var(--space-5);
        }
        .form-layout {
          grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
        }
      }
      @media (max-width: 800px) {
        .sidebar {
          position: static;
          width: auto;
          min-height: auto;
          padding: var(--space-3) var(--space-4);
          border-right: 0;
          border-bottom: 1px solid var(--border);
        }
        .sidebar nav,
        .sidebar-bottom {
          display: none;
        }
        .main-area {
          margin-left: 0;
        }
        .topbar {
          min-height: 58px;
        }
        .form-layout {
          grid-template-columns: 1fr;
        }
        .summary-column {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--space-4);
        }
        .summary-column .panel + .panel {
          margin-top: 0;
        }
      }
      @media (max-width: 560px) {
        main {
          padding: var(--space-4);
        }
        .topbar {
          padding-inline: var(--space-4);
        }
        .page-heading {
          align-items: flex-start;
          flex-direction: column;
        }
        .page-heading > .button,
        .form-actions .button {
          width: 100%;
        }
        .field-grid,
        .summary-column {
          grid-template-columns: 1fr;
        }
        .panel-heading,
        .panel-body,
        .summary-card {
          padding: var(--space-4);
        }
        .user-chip span {
          display: none;
        }
        .form-actions {
          flex-direction: column-reverse;
        }
      }
    </style>
  </head>
  <body>
    <div class="app-shell">
      <aside class="sidebar" aria-label="Điều hướng quản trị">
        <a class="brand" href="#" aria-label="Cinema Admin">
          <span class="brand-mark" aria-hidden="true">C</span>
          <span
            ><span class="brand-name">CINEMA</span
            ><span class="brand-caption">Quản trị hệ thống</span></span
          >
        </a>
        <nav aria-label="Menu chính">
          <p class="nav-label">Vận hành</p>
          <ul class="nav-list">
            <li>
              <a class="nav-link" href="#"
                ><span class="nav-icon" aria-hidden="true">▦</span>Tổng quan</a
              >
            </li>
            <li>
              <a class="nav-link" href="#"
                ><span class="nav-icon" aria-hidden="true">▣</span>Phim</a
              >
            </li>
            <li>
              <a class="nav-link" href="#"
                ><span class="nav-icon" aria-hidden="true">▤</span>Phòng chiếu</a
              >
            </li>
            <li>
              <a class="nav-link" href="#" aria-current="page"
                ><span class="nav-icon" aria-hidden="true">◷</span>Suất chiếu</a
              >
            </li>
            <li>
              <a class="nav-link" href="#"
                ><span class="nav-icon" aria-hidden="true">▧</span>Đặt vé</a
              >
            </li>
          </ul>
        </nav>
        <div class="sidebar-bottom">
          <p class="nav-label">Tài khoản</p>
          <a class="nav-link" href="#"><span class="nav-icon" aria-hidden="true">⚙</span>Cài đặt</a>
        </div>
      </aside>
      <div class="main-area">
        <header class="topbar">
          <div class="breadcrumbs">
            Quản trị <span aria-hidden="true">/</span> Suất chiếu <span aria-hidden="true">/</span>
            <strong>Tạo mới</strong>
          </div>
          <div class="user-chip">
            <span>Quản trị viên</span><span class="avatar" aria-hidden="true">AD</span>
          </div>
        </header>
        <main>
          <div class="page-heading">
            <div>
              <p class="eyebrow">Lịch chiếu</p>
              <h1>Tạo suất chiếu</h1>
              <p class="page-description">
                Chọn phim, phòng và thời gian. Sơ đồ ghế cùng giá vé được áp dụng theo cấu hình hiện
                hành của rạp.
              </p>
            </div>
            <a class="button" href="#">← <span>Quay lại danh sách</span></a>
          </div>
          <form class="form-layout">
            <div class="form-main">
              <section class="panel" aria-labelledby="showtime-info-title">
                <div class="panel-heading">
                  <h2 id="showtime-info-title">Thông tin suất chiếu</h2>
                  <p>Các trường có dấu <span class="required">*</span> là bắt buộc.</p>
                </div>
                <div class="panel-body">
                  <div class="field-grid">
                    <div class="field">
                      <label for="cinema">Rạp chiếu <span class="required">*</span></label>
                      <select class="control" id="cinema" required>
                        <option value="">Chọn rạp</option>
                      </select>
                      <p class="field-hint">Danh sách rạp theo quyền quản lý của tài khoản.</p>
                    </div>
                    <div class="field">
                      <label for="room">Phòng chiếu <span class="required">*</span></label>
                      <select class="control" id="room" required disabled>
                        <option value="">Chọn rạp trước</option>
                      </select>
                    </div>
                    <div class="field field-full">
                      <label for="movie">Phim <span class="required">*</span></label>
                      <select class="control" id="movie" required>
                        <option value="">Chọn phim</option>
                      </select>
                    </div>
                    <div class="field">
                      <label for="starts-at"
                        >Ngày và giờ bắt đầu <span class="required">*</span></label
                      >
                      <input class="control" id="starts-at" type="datetime-local" required />
                    </div>
                    <div class="field">
                      <label for="ends-at">Giờ kết thúc dự kiến</label>
                      <input
                        class="control readonly"
                        id="ends-at"
                        type="text"
                        value="—"
                        readonly
                        aria-describedby="end-time-hint"
                      />
                      <p class="field-hint" id="end-time-hint">
                        Tự tính từ giờ bắt đầu và thời lượng phim.
                      </p>
                    </div>
                  </div>
                  <div class="inline-note">
                    <span aria-hidden="true">ⓘ</span>
                    <span
                      ><strong>Kiểm tra lịch trống:</strong> hệ thống cần xác nhận phòng không có
                      suất chiếu trùng thời gian.</span
                    >
                  </div>
                </div>
              </section>
              <section class="panel">
                <div class="panel-body">
                  <p class="footer-hint">
                    Suất chiếu khóa phiên bản layout và pricing policy. Giá cuối cùng phụ thuộc loại
                    vé khách chọn khi đặt.
                  </p>
                  <div class="form-actions">
                    <a class="button" href="#">Hủy</a>
                    <button class="button button-primary" type="submit" disabled>
                      Lưu suất chiếu
                    </button>
                  </div>
                </div>
              </section>
            </div>
            <aside class="summary-column" aria-label="Cấu hình áp dụng">
              <section class="panel" aria-labelledby="layout-title">
                <div class="panel-heading">
                  <div class="summary-top">
                    <div>
                      <h2 class="summary-title" id="layout-title">Sơ đồ ghế áp dụng</h2>
                      <p class="summary-subtitle">Tự chọn bản PUBLISHED mới nhất</p>
                    </div>
                    <span class="status">Đã xuất bản</span>
                  </div>
                </div>
                <div class="summary-card">
                  <dl class="detail-list">
                    <div class="detail-row">
                      <dt>Sơ đồ</dt>
                      <dd><strong>Chưa chọn phòng</strong></dd>
                    </div>
                    <div class="detail-row">
                      <dt>Phiên bản</dt>
                      <dd><strong>—</strong></dd>
                    </div>
                    <div class="detail-row">
                      <dt>Tổng số ghế</dt>
                      <dd><strong>—</strong></dd>
                    </div>
                    <div class="detail-row">
                      <dt>Loại ghế</dt>
                      <dd><strong>—</strong></dd>
                    </div>
                  </dl>
                  <div class="empty-state">Chọn phòng để tải sơ đồ ghế PUBLISHED mới nhất.</div>
                </div>
              </section>
              <section class="panel" aria-labelledby="pricing-title">
                <div class="panel-heading">
                  <div class="summary-top">
                    <div>
                      <h2 class="summary-title" id="pricing-title">Giá vé dự kiến</h2>
                      <p class="summary-subtitle">Theo lịch chiếu và nhóm vé</p>
                    </div>
                    <span class="status">Đang áp dụng</span>
                  </div>
                </div>
                <div class="summary-card">
                  <div class="price-list" aria-live="polite">
                    <div class="price-row"><span>Người lớn</span><strong>—</strong></div>
                    <div class="price-row"><span>Trên 55 tuổi</span><strong>—</strong></div>
                    <div class="price-row">
                      <span>HSSV / U22 / Giáo viên</span><strong>—</strong>
                    </div>
                    <div class="price-row"><span>Trẻ em</span><strong>—</strong></div>
                  </div>
                  <p class="field-hint">Phụ thu tùy cấu hình và lựa chọn:</p>
                  <div class="price-list" aria-label="Phụ thu dự kiến">
                    <div class="price-row"><span>Ghế đôi</span><strong>+—</strong></div>
                    <div class="price-row"><span>Phim bom tấn</span><strong>+—</strong></div>
                    <div class="price-row"><span>Định dạng đặc biệt</span><strong>+—</strong></div>
                  </div>
                  <p class="footer-hint">
                    Preview thay đổi theo ngày, giờ và ưu đãi. BE chốt giá cuối cùng khi đặt vé.
                  </p>
                </div>
              </section>
            </aside>
          </form>
        </main>
      </div>
    </div>
  </body>
</html>
```

## 5. Ghi chú tích hợp

- Chuyển placeholder thành trạng thái loading, empty, error và loaded.
- Đổi rạp/phòng thì xóa ngay layout/giá đã tải trước đó.
- Chỉ bật submit khi dữ liệu bắt buộc và cấu hình của rạp/phòng đã hợp lệ.
- Không dùng màu sắc một mình để biểu diễn trạng thái; giữ nhãn văn bản.
- Dùng tokens CSS hiện có của dự án khi chuyển sang Vue; token trong mockup chỉ để file chạy độc lập.

## 6. Commit message gợi ý

```text
feat(admin): preview showtime prices by schedule and ticket category
```
