import { createRouter, createWebHistory } from 'vue-router'
import { ADMIN_ROLES, APP_PERMISSIONS } from '../config/authorization'
import { authorizationGuard } from './guards'
import { ROUTE_NAMES, ROUTE_PATHS } from './route-constants'
import type { RouteRecordRaw } from 'vue-router'

const loadPlaceholder = () => import('../components/feedback/PlaceholderPage.vue')

const routes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.HOME,
    name: ROUTE_NAMES.HOME,
    component: loadPlaceholder,
    props: {
      title: 'Cinematic',
      description: 'Trang chủ sẽ được triển khai ở milestone Home.',
    },
    meta: { layout: 'customer', title: 'Trang chủ' },
  },
  {
    path: ROUTE_PATHS.MOVIES,
    name: ROUTE_NAMES.MOVIES,
    component: loadPlaceholder,
    props: {
      title: 'Phim',
      description: 'Danh sách phim sẽ lấy từ Movie Service.',
    },
    meta: { layout: 'customer', title: 'Phim' },
  },
  {
    path: ROUTE_PATHS.MOVIE_DETAIL,
    name: ROUTE_NAMES.MOVIE_DETAIL,
    component: loadPlaceholder,
    props: {
      title: 'Chi tiết phim',
      description: 'Chi tiết phim sẽ lấy theo movie ID từ backend.',
    },
    meta: { layout: 'customer', title: 'Chi tiết phim' },
  },
  {
    path: ROUTE_PATHS.CINEMAS,
    name: ROUTE_NAMES.CINEMAS,
    component: loadPlaceholder,
    props: {
      title: 'Rạp',
      description: 'Danh sách rạp sẽ lấy từ Inventory Service.',
    },
    meta: { layout: 'customer', title: 'Rạp' },
  },
  {
    path: ROUTE_PATHS.SHOWTIMES,
    name: ROUTE_NAMES.SHOWTIMES,
    component: loadPlaceholder,
    props: {
      title: 'Lịch chiếu',
      description: 'Lịch chiếu sẽ lấy từ Inventory Service.',
    },
    meta: { layout: 'customer', title: 'Lịch chiếu' },
  },
  {
    path: ROUTE_PATHS.PROMOTIONS,
    name: ROUTE_NAMES.PROMOTIONS,
    component: loadPlaceholder,
    props: {
      title: 'Ưu đãi',
      description: 'Backend hiện chưa có Promotions API. Trang này chưa hiển thị dữ liệu ưu đãi.',
    },
    meta: { layout: 'customer', title: 'Ưu đãi' },
  },
  {
    path: ROUTE_PATHS.BOOKING,
    name: ROUTE_NAMES.BOOKING,
    component: loadPlaceholder,
    props: {
      title: 'Đặt vé',
      description: 'Luồng đặt vé sẽ dùng booking API đã xác nhận.',
    },
    meta: {
      layout: 'customer',
      title: 'Đặt vé',
      requiresAuth: true,
    },
  },
  {
    path: ROUTE_PATHS.ACCOUNT,
    name: ROUTE_NAMES.ACCOUNT,
    component: loadPlaceholder,
    props: {
      title: 'Tài khoản',
      description: 'Thông tin tài khoản sẽ lấy từ User Service.',
    },
    meta: {
      layout: 'customer',
      title: 'Tài khoản',
      requiresAuth: true,
    },
  },
  {
    path: ROUTE_PATHS.ACCOUNT_BOOKINGS,
    name: ROUTE_NAMES.ACCOUNT_BOOKINGS,
    component: loadPlaceholder,
    props: {
      title: 'Vé của tôi',
      description: 'Danh sách booking thuộc người dùng hiện tại.',
    },
    meta: {
      layout: 'customer',
      title: 'Vé của tôi',
      requiresAuth: true,
    },
  },

  {
    path: ROUTE_PATHS.AUTH_CALLBACK,
    name: ROUTE_NAMES.AUTH_CALLBACK,
    component: loadPlaceholder,
    props: {
      title: 'Đang xác thực',
      description:
        'OIDC callback route đã được tạo. Cần cấu hình client và redirect URI được backend xác nhận trước khi hoàn thiện xử lý callback.',
      showHomeLink: false,
    },
    meta: { layout: 'auth', title: 'Đang xác thực' },
  },
  {
    path: ROUTE_PATHS.AUTH_REQUIRED,
    name: ROUTE_NAMES.AUTH_REQUIRED,
    component: loadPlaceholder,
    props: {
      title: 'Cần đăng nhập',
      description:
        'Trang này yêu cầu xác thực. Luồng bắt đầu đăng nhập sẽ được nối với OIDC client sau khi cấu hình được xác nhận.',
    },
    meta: { layout: 'auth', title: 'Cần đăng nhập' },
  },
  {
    path: ROUTE_PATHS.AUTH_FORBIDDEN,
    name: ROUTE_NAMES.AUTH_FORBIDDEN,
    component: loadPlaceholder,
    props: {
      title: 'Không đủ quyền',
      description: 'Tài khoản hiện tại không có quyền truy cập trang này.',
    },
    meta: { layout: 'auth', title: 'Không đủ quyền' },
  },

  {
    path: ROUTE_PATHS.ADMIN,
    name: ROUTE_NAMES.ADMIN,
    component: loadPlaceholder,
    props: {
      title: 'Quản trị',
      description: 'Dashboard sẽ được triển khai theo dữ liệu backend hỗ trợ.',
    },
    meta: {
      layout: 'admin',
      title: 'Quản trị',
      requiresAuth: true,
      roles: ADMIN_ROLES,
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_MOVIES,
    name: ROUTE_NAMES.ADMIN_MOVIES,
    component: loadPlaceholder,
    props: {
      title: 'Quản lý phim',
      description: 'Movie Service hỗ trợ quản lý phim và thể loại.',
    },
    meta: {
      layout: 'admin',
      title: 'Quản lý phim',
      requiresAuth: true,
      roles: ADMIN_ROLES,
      permissions: [APP_PERMISSIONS.MOVIE_MANAGE],
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_CINEMAS,
    name: ROUTE_NAMES.ADMIN_CINEMAS,
    component: loadPlaceholder,
    props: {
      title: 'Quản lý rạp',
      description: 'Inventory Service hỗ trợ quản lý rạp.',
    },
    meta: {
      layout: 'admin',
      title: 'Quản lý rạp',
      requiresAuth: true,
      roles: ADMIN_ROLES,
      permissions: [APP_PERMISSIONS.INVENTORY_MANAGE],
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_ROOMS,
    name: ROUTE_NAMES.ADMIN_ROOMS,
    component: loadPlaceholder,
    props: {
      title: 'Quản lý phòng',
      description: 'Inventory Service hỗ trợ quản lý phòng.',
    },
    meta: {
      layout: 'admin',
      title: 'Quản lý phòng',
      requiresAuth: true,
      roles: ADMIN_ROLES,
      permissions: [APP_PERMISSIONS.INVENTORY_MANAGE],
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_SHOWTIMES,
    name: ROUTE_NAMES.ADMIN_SHOWTIMES,
    component: loadPlaceholder,
    props: {
      title: 'Quản lý lịch chiếu',
      description: 'Inventory Service hỗ trợ quản lý lịch chiếu.',
    },
    meta: {
      layout: 'admin',
      title: 'Quản lý lịch chiếu',
      requiresAuth: true,
      roles: ADMIN_ROLES,
      permissions: [APP_PERMISSIONS.SHOWTIME_MANAGE],
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_BOOKINGS,
    name: ROUTE_NAMES.ADMIN_BOOKINGS,
    component: loadPlaceholder,
    props: {
      title: 'Booking quản trị',
      description:
        'Booking Service hiện chỉ cung cấp danh sách booking của người dùng hiện tại; chưa có API quản trị booking.',
    },
    meta: {
      layout: 'admin',
      title: 'Booking quản trị',
      requiresAuth: true,
      roles: ADMIN_ROLES,
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_USERS,
    name: ROUTE_NAMES.ADMIN_USERS,
    component: loadPlaceholder,
    props: {
      title: 'Quản lý người dùng',
      description: 'User Service hỗ trợ các thao tác khóa và mở tài khoản.',
    },
    meta: {
      layout: 'admin',
      title: 'Quản lý người dùng',
      requiresAuth: true,
      roles: ADMIN_ROLES,
      permissions: [APP_PERMISSIONS.USER_MANAGE],
    },
  },
  {
    path: ROUTE_PATHS.NOT_FOUND,
    name: ROUTE_NAMES.NOT_FOUND,
    component: loadPlaceholder,
    props: {
      title: 'Không tìm thấy trang',
      description: 'Địa chỉ bạn mở không tồn tại.',
    },
    meta: { layout: 'customer', title: 'Không tìm thấy trang' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(authorizationGuard)

export default router
