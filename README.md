# Cinematic Web

Frontend cho hệ thống đặt vé xem phim Cinematic.

## Repositories

- Frontend: https://github.com/HuyKunNe/cinematic-web
- Backend: https://github.com/HuyKunNe/cinema-system

## Trạng thái

Đọc [docs/CURRENT_STATUS.md](docs/CURRENT_STATUS.md) và đối chiếu với code hiện tại để biết tiến độ đã xác minh. Không mặc định các đề xuất trong tài liệu đã được áp dụng.

## Công nghệ

Dự án dùng Vue 3, TypeScript, Vite, Vue Router, Pinia, TanStack Vue Query, Axios, Orval, oidc-client-ts, Tailwind CSS, Reka UI, VueUse, VeeValidate và Zod.

`package.json` và lock file là nguồn chuẩn cho phiên bản dependency và các script có thể chạy.

## Kiến trúc

Ứng dụng tổ chức theo hướng phụ thuộc:

`app → features → shared infrastructure`

- `app` quản lý khởi tạo ứng dụng và providers.
- `features` chứa các chức năng nghiệp vụ, API composables, query keys và mapper.
- Hạ tầng dùng chung nằm trong các thư mục như `components/`, `config/`, `services/`, `styles/` và `utils/`.

Xem [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Thiết kế

Figma hiện không được dùng làm nguồn triển khai. Khi xây dựng giao diện, dùng các HTML/CSS tham khảo trong [`docs/design/reference/html-convert/`](docs/design/reference/html-convert/).

Mở [`index.html`](docs/design/reference/html-convert/index.html) để xem danh mục màn hình. Đọc README trong thư mục tham khảo để biết quy tắc CSS, responsive và những phần dữ liệu chỉ mang tính minh họa.

Các giá trị giao diện nên được biểu diễn bằng CSS variables và tái sử dụng token hiện có.

## API và xác thực

API client được sinh bằng Orval từ hợp đồng OpenAPI đã kiểm tra. Không chỉnh sửa file generated thủ công và không tự suy đoán endpoint hoặc DTO.

Frontend sử dụng OAuth 2.0 / OpenID Connect Authorization Code với PKCE. Không đưa client secret vào frontend và không gửi username/password trực tiếp từ Vue.

Xem [docs/API_INTEGRATION.md](docs/API_INTEGRATION.md).

## Scripts hiện có

Các script dưới đây được khai báo trong `package.json`:

- `npm run dev`
- `npm run build`
- `npm run build-only`
- `npm run preview`
- `npm run type-check`
- `npm run api`
- `npm run format`

Kiểm tra `package.json` trước khi dùng script. Một số lệnh có thể sinh hoặc sửa file.

## Quy trình làm việc

1. Đọc `AGENTS.md` và `docs/CURRENT_STATUS.md`.
2. Đối chiếu tài liệu với code mới nhất.
3. Kiểm tra HTML/CSS tham khảo và hợp đồng backend liên quan.
4. Đề xuất một phạm vi nhỏ cùng danh sách file và code block để người dùng tự áp dụng.
5. Đưa các bước kiểm tra thủ công và commit message sau mỗi round.

Repository được giữ ở chế độ chỉ đọc trong workflow này. Không sửa file, commit hoặc push thay người dùng.

## Tài liệu

- [AI context](docs/AI_CONTEXT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [API integration](docs/API_INTEGRATION.md)
- [Current status](docs/CURRENT_STATUS.md)
- [Roadmap](docs/ROADMAP.md)
- [Agent instructions](AGENTS.md)
