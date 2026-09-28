# Cinematic Design Tokens

## Nguyên tắc

Các giá trị dưới đây là điểm bắt đầu được ước lượng từ ảnh reference, chưa phải giá trị đã đo từ file thiết kế. Tất cả kích thước giao diện cần dùng CSS variables hoặc token ngữ nghĩa; không đưa giá trị tùy ý vào template/Tailwind class.

Breakpoint được khai báo tập trung trong cấu hình responsive; không dùng CSS variable làm điều kiện media query.

| Token name          | CSS variable             |                   Giá trị đề xuất | Nơi sử dụng                   | Desktop / mobile             |
| ------------------- | ------------------------ | --------------------------------: | ----------------------------- | ---------------------------- |
| Background          | `--color-background`     |                         `#061017` | Nền trang                     | Giống nhau                   |
| Surface             | `--color-surface`        |                         `#0D1B26` | Header, card, panel           | Giống nhau                   |
| Raised surface      | `--color-surface-raised` |                         `#122330` | Quick booking, menu, card nổi | Giống nhau                   |
| Primary             | `--color-primary`        |                         `#FFC96D` | CTA, điểm nhấn, icon          | Giống nhau                   |
| Primary hover       | `--color-primary-hover`  |                         `#FFD98A` | Hover/focus CTA               | Giống nhau                   |
| Secondary           | `--color-secondary`      |                         `#20313D` | CTA phụ, vùng tương tác phụ   | Giống nhau                   |
| Border              | `--color-border`         |                         `#2A3C49` | Viền card, divider, control   | Giống nhau                   |
| Primary text        | `--color-text-primary`   |                         `#F5F1E8` | Tiêu đề và nội dung chính     | Giống nhau                   |
| Secondary text      | `--color-text-secondary` |                         `#AAB7C1` | Mô tả, metadata               | Giống nhau                   |
| Muted text          | `--color-text-muted`     |                         `#7F909D` | Nội dung phụ ít ưu tiên       | Giống nhau                   |
| Success             | `--color-success`        |                         `#67C995` | Thành công                    | Giống nhau                   |
| Warning             | `--color-warning`        |                         `#F0B84D` | Cảnh báo                      | Giống nhau                   |
| Error               | `--color-error`          |                         `#F17878` | Lỗi/validation                | Giống nhau                   |
| Focus               | `--color-focus`          |                         `#FFE0A3` | Focus ring                    | Giống nhau                   |
| Overlay             | `--color-overlay`        |                `rgb(0 0 0 / 64%)` | Drawer/dialog                 | Giống nhau                   |
| Container           | `--container-width`      |                           `80rem` | AppContainer                  | Giống nhau                   |
| Page gutter         | `--page-gutter`          |               `2.75rem / 1.25rem` | Padding ngang trang           | Desktop / mobile             |
| Header height       | `--header-height`        |               `4.25rem / 3.75rem` | Header                        | Desktop / mobile             |
| Admin sidebar width | `--admin-sidebar-width`  |                           `17rem` | AdminLayout                   | Desktop; ẩn/thu gọn mobile   |
| Mobile nav height   | `--mobile-nav-height`    |                            `4rem` | MobileBottomNav               | Desktop: `0`; mobile: `4rem` |
| Section spacing     | `--section-space`        |                   `2rem / 1.5rem` | Khoảng cách section           | Desktop / mobile             |
| Grid gap            | `--grid-gap`             |                  `1rem / 0.75rem` | Grid/card                     | Desktop / mobile             |
| Control height      | `--control-height-md`    |                         `2.75rem` | Select, input, button         | Giống nhau                   |
| Poster ratio        | `--poster-aspect-ratio`  |                           `2 / 3` | Poster dọc chuẩn              | Giống nhau                   |
| Card artwork ratio  | `--movie-card-art-ratio` |              `1.2 / 1` và `2 / 1` | Artwork ngang trong MovieCard | Desktop / mobile             |
| Card radius         | `--radius-md`            |                         `0.75rem` | Card, control                 | Giống nhau                   |
| Large radius        | `--radius-lg`            |                            `1rem` | Banner, panel lớn             | Giống nhau                   |
| Small radius        | `--radius-sm`            |                          `0.5rem` | Badge, icon button            | Giống nhau                   |
| Space 1             | `--space-1`              |                         `0.25rem` | Spacing nhỏ                   | Giống nhau                   |
| Space 2             | `--space-2`              |                          `0.5rem` | Spacing nhỏ                   | Giống nhau                   |
| Space 3             | `--space-3`              |                         `0.75rem` | Spacing card                  | Giống nhau                   |
| Space 4             | `--space-4`              |                            `1rem` | Spacing chuẩn                 | Giống nhau                   |
| Space 6             | `--space-6`              |                          `1.5rem` | Spacing section nhỏ           | Giống nhau                   |
| Space 8             | `--space-8`              |                            `2rem` | Spacing section               | Giống nhau                   |
| Card shadow         | `--shadow-card`          | `0 0.75rem 2rem rgb(0 0 0 / 24%)` | Card nổi                      | Giống nhau                   |
| Header z-index      | `--z-header`             |                              `20` | Header sticky                 | Giống nhau                   |
| Mobile nav z-index  | `--z-mobile-nav`         |                              `30` | Bottom navigation             | Giống nhau                   |
| Drawer z-index      | `--z-drawer`             |                              `40` | Mobile menu                   | Giống nhau                   |
| Modal z-index       | `--z-modal`              |                              `50` | Dialog/modal                  | Giống nhau                   |

## Typography

| Token name       | CSS variable               | Giá trị đề xuất                | Nơi sử dụng        | Desktop / mobile         |
| ---------------- | -------------------------- | ------------------------------ | ------------------ | ------------------------ |
| Font family      | `--font-family-base`       | `Inter, system-ui, sans-serif` | Nội dung giao diện | Giống nhau               |
| Display size     | `--font-size-display`      | `clamp(2.5rem, 5vw, 4.5rem)`   | Hero title         | Mobile nhỏ hơn qua clamp |
| H1 size          | `--font-size-h1`           | `clamp(2rem, 3vw, 3rem)`       | Page/section title | Responsive               |
| H2 size          | `--font-size-h2`           | `clamp(1.5rem, 2.2vw, 2rem)`   | Section title      | Responsive               |
| Body size        | `--font-size-body`         | `1rem`                         | Nội dung           | Giống nhau               |
| Small size       | `--font-size-small`        | `0.875rem`                     | Metadata           | Giống nhau               |
| Hero tracking    | `--letter-spacing-display` | `0.06em`                       | Hero title         | Giống nhau               |
| Base line height | `--line-height-base`       | `1.5`                          | Nội dung           | Giống nhau               |

## Responsive breakpoints

Các ngưỡng dưới đây là đề xuất tập trung trong cấu hình Tailwind/responsive:

| Tên     |       Ngưỡng | Hành vi chính                                                    |
| ------- | -----------: | ---------------------------------------------------------------- |
| Mobile  | dưới `48rem` | Header mobile, quick booking dọc, carousel ngang, bottom nav     |
| Tablet  |   từ `48rem` | Có thể dùng quick booking 2 cột; giảm gutter và số cột card      |
| Desktop |   từ `64rem` | Header desktop, quick booking ngang, grid nhiều card             |
| Wide    |   từ `90rem` | Giới hạn nội dung theo `--container-width`, giữ nhịp khoảng cách |

Các màu và giá trị responsive phải được kiểm tra tương phản, focus visibility và độ đọc trước khi chốt.
