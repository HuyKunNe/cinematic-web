# AGENTS.md — Frontend

## Dự án và phạm vi

- Repository FE: https://github.com/HuyKunNe/cinematic-web
- Repository BE tham chiếu: https://github.com/HuyKunNe/cinema-system
- Frontend phục vụ các role Admin, Staff và khách hàng.
- Chỉ sửa role, route và màn hình được nêu trong task hiện tại.
- Không tự mở rộng từ Admin sang customer/staff hoặc ngược lại.
- Đọc code trong checkout hiện tại; không giả định trạng thái từ chat hoặc roadmap cũ.

## Làm việc trong repository

- Trước khi sửa, kiểm tra `git status` và giữ nguyên mọi thay đổi có sẵn.
- Codex được sửa file FE cần thiết trong phạm vi task hiện tại để tôi review.
- Không tự pull, reset, đổi branch, xóa thay đổi, commit hoặc push.
- Không sửa repository BE. Chỉ đọc BE để đối chiếu contract khi cần.
- Không chạy test, lint, type-check, build hoặc format toàn repo nếu tôi chưa yêu cầu.
- Không tuyên bố đã kiểm tra runtime/browser nếu chưa thực sự mở và quan sát giao diện.
- Không ghi secret, password, token hay connection string vào code hoặc tài liệu.
- Nếu tôi chỉ yêu cầu hướng dẫn, không sửa file.

## Nguồn thông tin và thiết kế

Đọc các tài liệu liên quan trước khi làm:

- `README.md`
- `docs/CURRENT_STATUS.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/API_INTEGRATION.md`
- `docs/DESIGN_SYSTEM.md`
- Các design reference và `AGENTS.md` trong thư mục con nếu có

Ưu tiên:

1. Yêu cầu task mới nhất của tôi và reference được chỉ định trong task.
2. Reference HTML/CSS, hình ảnh và design tokens có trong repo.
3. Component và layout đang dùng.
4. Figma chỉ khi tôi yêu cầu rõ.

Với Admin, dùng `docs/design/reference/cinema-admin` khi task chỉ định thiết kế này và thư mục đó có trong checkout. Với các màn hình khác, tìm reference phù hợp trong repo. Không thay đổi reference gốc khi đang triển khai ứng dụng.

Nếu code, reference và tài liệu khác nhau, nêu khác biệt. Không tự sửa các khu vực ngoài phạm vi để đồng bộ hình thức.

## Công nghệ và kiến trúc

- Dùng phiên bản thư viện và scripts hiện có trong `package.json` cùng lock file; kiểm tra trước khi dùng.
- Không thêm dependency nếu thư viện hiện tại giải quyết được. Trước khi thêm dependency, nêu lý do và chờ tôi duyệt.
- Giữ kiến trúc phụ thuộc hiện tại: `app → features → shared infrastructure`.
- `app` quản lý bootstrap, providers và routes.
- `features` sở hữu nghiệp vụ, pages, API composables, query keys, mapper và model của feature.
- Shared component không chứa nghiệp vụ riêng của một feature.
- Page ghép component/composable; không gọi Axios trực tiếp trong page.
- TanStack Vue Query quản lý server state. Pinia chỉ giữ client state dùng chung giữa routes.
- Không để feature import file nội bộ của feature khác; dùng public exports hoặc shared abstraction.

## Design và UI

- Tạo giao diện từ component và CSS; không dùng screenshot làm nền giả cho UI.
- Trước khi làm màn hình, đọc reference desktop/mobile, tokens, responsive behavior và trạng thái tương tác.
- Giữ header, sidebar, chiều rộng, khoảng cách và cấu trúc layout nhất quán giữa các trang cùng role.
- Bảo đảm trạng thái loading, empty, error, success, disabled, focus và permission-denied phù hợp với màn hình.
- Thiết kế responsive và keyboard accessible; dùng label, focus state và thông báo lỗi có thể đọc được.
- Ưu tiên Reka UI cho dialog, drawer, dropdown, popover, select, tabs và tooltip; phần styling phải tuân theo reference.
- Không thêm Vuetify, PrimeVue, Element Plus hoặc design system khác nếu chưa được tôi duyệt.
- Dùng Lucide khi phù hợp với reference; nếu có SVG riêng trong repo thì ưu tiên asset đó.

### CSS variables và design tokens

- Tái sử dụng token/CSS variables hiện có.
- Không rải giá trị thiết kế cứng trong template, inline style hoặc arbitrary Tailwind classes.
- Mọi giá trị thiết kế mới cần được tái sử dụng phải dùng token có tên rõ nghĩa.
- Token bao gồm màu sắc, width/height, min/max dimensions, spacing, padding, margin, gap, typography, radius, border, shadow, icon size, opacity, transition và z-index.
- Breakpoints quản lý tập trung trong cấu hình responsive hiện có.

## API và dữ liệu

- BE/MySQL là nguồn dữ liệu; FE chỉ gọi API.
- Không kết nối trực tiếp tới MySQL/Supabase và không thêm Supabase client.
- Contract API lấy từ code BE/OpenAPI hiện hành; không tự đoán endpoint, DTO, enum, permission hoặc dữ liệu.
- API client được generate bằng Orval từ OpenAPI.
- Không sửa tay file trong `src/services/api/generated`.
- Trước khi dùng API, kiểm tra generated client, DTO và contract BE. Nếu lệch, nêu rõ phần cần đồng bộ.
- Dùng Axios instance tập trung và API base URL từ Vite env theo cấu hình hiện có.
- Dùng mapper khi transport DTO khác model hiển thị.
- Không thêm mock data để che API thiếu. Nếu reference chỉ mang dữ liệu minh họa, dùng nội dung API thật hoặc placeholder asset có sẵn.

### Phim và phiên bản chiếu

- Theo contract BE hiện tại: phiên bản chiếu thuộc request tạo/sửa phim khi API hỗ trợ `screeningVersions` lồng trong payload.
- Không tạo một form/model riêng hoặc gọi API tạo phiên bản sau khi lưu phim nếu không có yêu cầu mới.
- Phân biệt định dạng hình ảnh 2D/3D với công nghệ trình chiếu như IMAX, 4DX, ScreenX theo contract BE.
- Không tự sinh tổ hợp mà BE không hỗ trợ.

### Bảng giá

- Giá ghế đôi tính theo cả cặp.
- Giá ghế đôi được phép khác giữa nhóm vé, khung giờ và định dạng phim theo cấu hình.
- Không thêm kiểm tra ép giá ghế đôi bằng nhau giữa nhóm khách hoặc khung giờ.
- Phân biệt “Chưa nhập giá”, “Không áp dụng” và giá bằng 0.
- Dùng bảng giá/chính sách do API cung cấp; không tự tính hoặc ghi cứng giá trong FE.

### Tạo nhiều suất chiếu

Khi task liên quan đến tạo suất chiếu theo đợt, giữ các quy tắc đã được thống nhất:

- Một đợt có thể tạo suất cho một phim tại một rạp, qua nhiều phòng.
- Chọn một phim cho cả đợt; phiên bản chiếu được chọn riêng theo phòng.
- Nhập khung giờ theo từng phòng rồi áp dụng vào các ngày cụ thể đã chọn.
- Nếu có suất trùng, chặn lưu toàn bộ đợt; hiển thị danh sách xung đột và yêu cầu sửa hết. Không lưu một phần.

Nếu API chưa hỗ trợ luồng này, báo contract cần BE cập nhật; không giả lập lưu thành công.

## Xác thực

- Dùng OIDC Authorization Code với PKCE theo cấu hình hiện có.
- FE tiếp tục chuyển hướng đăng nhập tới User Service.
- Không thêm Google Client Secret, OAuth client secret hoặc SMTP password vào FE.
- Không gửi username/password trực tiếp từ Vue.
- Route guard chỉ hỗ trợ điều hướng; quyền truy cập vẫn phải được BE xác thực.
- Không tự tạo authentication endpoint.
- Nếu task Google Login, tích hợp giao diện với luồng User Service đã được BE xác nhận; không tự nhận hoặc lưu Google token như token của Cinema.

## Kiểm tra

- Không chạy test, lint, type-check, build hoặc format toàn repo nếu tôi chưa yêu cầu.
- Được đề xuất checklist kiểm tra thủ công.
- Nếu tôi yêu cầu chạy kiểm tra, chỉ chạy lệnh có trong `package.json` và báo chính xác kết quả.
- Không nói “đã xác minh giao diện” nếu chưa mở đúng route/viewport và quan sát kết quả.

## Báo cáo sau mỗi lượt

Trả lời bằng tiếng Việt, gồm:

1. Mục tiêu và role/phạm vi.
2. File đã sửa và lý do.
3. API hoặc dữ liệu phụ thuộc BE.
4. Những trạng thái UI và responsive đã xử lý.
5. Kiểm tra đã chạy/chưa chạy; ghi rõ test đã bỏ qua.
6. Việc còn lại hoặc quyết định cần tôi chốt.
7. Commit message gợi ý.

Không tự commit hoặc push.
