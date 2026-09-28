# Component Inventory

## Quy ước

- Component giao diện dùng props/events rõ ràng; không gọi Axios trực tiếp.
- Dữ liệu server được lấy qua feature composables/API layer.
- Thành phần dùng chung không chứa business logic của một feature.
- Mỗi component tương tác phải hỗ trợ keyboard, visible focus, disabled/loading khi phù hợp.
- Nguồn dữ liệu API chưa có thì component nhận trạng thái rỗng/ẩn; không tạo dữ liệu sản phẩm giả.

## Foundations

| Component      | Trách nhiệm                                               | Ghi chú                                                                                         |
| -------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `AppContainer` | Giới hạn chiều rộng và căn lề nội dung theo design tokens | Dùng cho header, main và footer để đồng bộ alignment                                            |
| `AppIcon`      | Hiển thị icon thống nhất                                  | Có accessible name khi icon truyền tải ý nghĩa; icon trang trí được ẩn với assistive technology |
| `AppButton`    | Nút dùng chung: primary, secondary, ghost, icon           | Hỗ trợ loading, disabled, focus và kích thước                                                   |
| `AppLink`      | Liên kết nội bộ hoặc ngoài ứng dụng                       | Dùng router cho route nội bộ; liên kết ngoài có hành vi an toàn                                 |
| `AppBadge`     | Badge trạng thái như Đang chiếu hoặc trạng thái ghế       | Không chỉ dùng màu để biểu thị trạng thái                                                       |
| `AppSelect`    | Select truy cập được dùng cho rạp/phim/ngày/suất chiếu    | Dùng primitive accessible phù hợp; có label, error và loading                                   |
| `AppSkeleton`  | Placeholder khi tải dữ liệu                               | Giữ gần đúng kích thước nội dung để hạn chế layout shift                                        |

## Navigation

| Component              | Trách nhiệm                                                           | Ghi chú                                                               |
| ---------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `CustomerHeader`       | Header desktop với logo, navigation, location, search, account và CTA | Dùng `AppContainer`; không chứa API logic                             |
| `CustomerMobileHeader` | Header mobile với logo, location, search và menu button               | Quản lý mở/đóng menu hoặc phát event cho drawer                       |
| `MobileBottomNav`      | Điều hướng mobile tới Trang chủ, Lịch chiếu, Vé của tôi, Tài khoản    | Fixed; hỗ trợ safe area và route active state                         |
| `AdminSidebar`         | Điều hướng admin theo route và permission                             | Ẩn mục không phù hợp về UX nhưng không thay thế backend authorization |
| `AdminHeader`          | Header admin, tiêu đề trang, user menu và action chung                | Dùng chung trong `AdminLayout`                                        |
| `Breadcrumbs`          | Hiển thị phân cấp điều hướng                                          | Dùng semantic navigation và đánh dấu trang hiện tại                   |

## Cinema

| Component           | Trách nhiệm                                                                | Ghi chú                                                                         |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `HeroBanner`        | Ảnh cover, gradient, trạng thái phim, title, metadata và CTA               | Nội dung phim lấy từ API; hero selection cần contract/quy tắc được xác nhận     |
| `QuickBooking`      | Quy trình chọn Rạp, Phim, Ngày, Suất chiếu và tiếp tục                     | Desktop ngang, mobile dọc; hỗ trợ disabled/loading/error                        |
| `MovieCard`         | Artwork, trạng thái, title, genre, runtime, release date và trailer action | Rating chỉ render khi API cung cấp                                              |
| `MovieCarousel`     | Hiển thị movie cards theo hàng cuộn                                        | Hỗ trợ swipe, nút điều khiển, keyboard và reduced motion                        |
| `UpcomingMovieCard` | Card phim sắp chiếu gồm ảnh, tên, ngày phát hành, thể loại                 | Dữ liệu dựa trên movie API/status                                               |
| `PromotionBanner`   | Banner nội dung khuyến mãi và CTA                                          | Chỉ hiển thị nội dung từ API hoặc nội dung tĩnh đã được duyệt                   |
| `MembershipBanner`  | Giới thiệu thành viên và lợi ích                                           | Chưa có API membership trong inventory; không hiển thị dữ liệu cá nhân/điểm giả |

## Layouts

| Component        | Trách nhiệm                                                          | Ghi chú                                                                 |
| ---------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `CustomerLayout` | Bao bọc các trang khách hàng bằng header, main, footer và mobile nav | Mobile nav chỉ hiện tại breakpoint phù hợp; main có safe bottom spacing |
| `AuthLayout`     | Bố cục tối giản cho callback, trạng thái xác thực và lỗi OIDC        | Không xây form gửi username/password trực tiếp từ Vue                   |
| `AdminLayout`    | Bao bọc giao diện quản trị bằng sidebar, admin header và main        | Route metadata hỗ trợ navigation; backend vẫn là nguồn quyết định quyền |

## Đề xuất cấu trúc theo feature

```text
src/
├── app/
│   ├── layouts/
│   │   ├── CustomerLayout.vue
│   │   ├── AuthLayout.vue
│   │   └── AdminLayout.vue
│   └── router/
├── modules/
│   ├── home/
│   │   ├── components/
│   │   │   ├── HeroBanner.vue
│   │   │   ├── QuickBooking.vue
│   │   │   ├── MovieCarousel.vue
│   │   │   ├── UpcomingMovieCard.vue
│   │   │   ├── PromotionBanner.vue
│   │   │   └── MembershipBanner.vue
│   │   └── pages/
│   ├── movie/
│   │   └── components/MovieCard.vue
│   └── admin/
│       └── components/
└── shared/
    ├── ui/
    │   ├── AppContainer.vue
    │   ├── AppIcon.vue
    │   ├── AppButton.vue
    │   ├── AppLink.vue
    │   ├── AppBadge.vue
    │   ├── AppSelect.vue
    │   └── AppSkeleton.vue
    └── navigation/
        ├── CustomerHeader.vue
        ├── CustomerMobileHeader.vue
        ├── MobileBottomNav.vue
        ├── AdminSidebar.vue
        ├── AdminHeader.vue
        └── Breadcrumbs.vue
```
