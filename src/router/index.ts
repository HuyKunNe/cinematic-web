import { createRouter, createWebHistory } from 'vue-router'
import { ADMIN_ROLES, APP_PERMISSIONS, APP_ROLES } from '../config/authorization'
import { authorizationGuard } from './guards'
import { ROUTE_NAMES, ROUTE_PATHS } from './route-constants'
import type { RouteRecordRaw } from 'vue-router'
import {
  captureInitialEmailVerificationToken,
  captureEmailVerificationFragment,
} from '../features/auth'

const loadPlaceholder = () => import('../components/feedback/PlaceholderPage.vue')
const loadAdminDashboardPage = () => import('../features/admin/pages/AdminDashboardPage.vue')
const loadLoginPage = () => import('../features/auth/pages/LoginPage.vue')
const loadAuthCallbackPage = () => import('../features/auth/pages/AuthCallbackPage.vue')
const loadHomePage = () => import('../features/home/pages/HomePage.vue')
const loadMoviesPage = () => import('../features/movies/pages/MoviesPage.vue')
const loadMovieDetailPage = () => import('../features/movies/pages/MovieDetailPage.vue')
const loadAdminMoviesPage = () => import('../features/movies/admin/pages/AdminMoviesPage.vue')
const loadBookingStartPage = () => import('../features/booking/pages/BookingStartPage.vue')
const loadShowtimesPage = () => import('../features/home/pages/ShowtimesPage.vue')
const loadBookingPage = () => import('../features/booking/pages/BookingPage.vue')
const loadMyBookingsPage = () => import('../features/booking/pages/MyBookingsPage.vue')
const loadAccountPage = () => import('../features/account/pages/AccountPage.vue')
const loadOffersPage = () => import('../features/home/pages/OffersPage.vue')
const loadAdminCinemasPage = () => import('../features/cinemas/admin/pages/AdminCinemasPage.vue')
const loadAdminRoomsPage = () => import('../features/rooms/admin/pages/AdminRoomsPage.vue')
const loadAdminReferencePage = () => import('../features/admin/pages/AdminReferencePage.vue')
const loadAdminRoomSeatsPage = () => import('../features/rooms/admin/pages/AdminRoomSeatsPage.vue')
const loadAdminRoomLayoutPage = () =>
  import('../features/rooms/admin/pages/AdminRoomLayoutPage.vue')
const loadAdminShowtimesPage = () =>
  import('../features/showtimes/admin/pages/AdminShowtimesPage.vue')
const loadAdminShowtimeCreatePage = () =>
  import('../features/showtimes/admin/pages/AdminShowtimeBatchCreatePage.vue')
const loadAdminPricingPolicyPage = () =>
  import('../features/pricing/admin/pages/AdminPricingPolicyPage.vue')

const loadAdminBookingsPage = () => import('../features/booking/admin/pages/AdminBookingsPage.vue')
const loadAdminBookingDetailPage = () =>
  import('../features/booking/admin/pages/AdminBookingDetailPage.vue')

const routes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.HOME,
    name: ROUTE_NAMES.HOME,
    component: loadHomePage,
    meta: { layout: 'customer', title: 'Trang chủ' },
  },
  {
    path: ROUTE_PATHS.MOVIES,
    name: ROUTE_NAMES.MOVIES,
    component: loadMoviesPage,
    meta: { layout: 'customer', title: 'Phim' },
  },
  {
    path: ROUTE_PATHS.MOVIE_DETAIL,
    name: ROUTE_NAMES.MOVIE_DETAIL,
    component: loadMovieDetailPage,
    meta: { layout: 'customer', title: 'Chi tiết phim' },
  },
  {
    path: ROUTE_PATHS.CINEMAS,
    name: ROUTE_NAMES.CINEMAS,
    component: () => import('../features/cinemas/pages/CinemasPage.vue'),
    meta: {
      layout: 'customer',
      title: 'Hệ thống rạp',
    },
  },
  {
    path: ROUTE_PATHS.SHOWTIMES,
    name: ROUTE_NAMES.SHOWTIMES,
    component: loadShowtimesPage,
    meta: { layout: 'customer', title: 'Lịch chiếu' },
  },
  {
    path: ROUTE_PATHS.PROMOTIONS,
    name: ROUTE_NAMES.PROMOTIONS,
    component: loadOffersPage,
    meta: { layout: 'customer', title: 'Ưu đãi' },
  },
  {
    path: ROUTE_PATHS.BOOKING_START,
    name: ROUTE_NAMES.BOOKING_START,
    component: loadBookingStartPage,
    meta: {
      layout: 'customer',
      title: 'Đặt vé',
    },
  },
  {
    path: ROUTE_PATHS.BOOKING,
    name: ROUTE_NAMES.BOOKING,
    component: loadBookingPage,
    props: {
      title: 'Chọn ghế',
      description: 'Luồng đặt vé sẽ dùng booking API đã xác nhận.',
    },
    meta: {
      layout: 'customer',
      title: 'Chọn ghế',
      requiresAuth: true,
    },
  },
  {
    path: ROUTE_PATHS.BOOKING_CHECKOUT,
    name: ROUTE_NAMES.BOOKING_CHECKOUT,
    component: loadMyBookingsPage,
    meta: { layout: 'customer', title: 'Kiểm tra và thanh toán', requiresAuth: true },
  },
  {
    path: ROUTE_PATHS.BOOKING_RESULT,
    name: ROUTE_NAMES.BOOKING_RESULT,
    component: loadMyBookingsPage,
    meta: { layout: 'customer', title: 'Kết quả đặt vé', requiresAuth: true },
  },
  {
    path: ROUTE_PATHS.ACCOUNT,
    name: ROUTE_NAMES.ACCOUNT,
    component: loadAccountPage,
    meta: {
      layout: 'customer',
      title: 'Tài khoản',
      requiresAuth: true,
    },
  },
  {
    path: ROUTE_PATHS.ACCOUNT_BOOKINGS,
    name: ROUTE_NAMES.ACCOUNT_BOOKINGS,
    component: loadMyBookingsPage,
    meta: {
      layout: 'customer',
      title: 'Vé của tôi',
      requiresAuth: true,
    },
  },
  {
    path: ROUTE_PATHS.REGISTER,
    name: ROUTE_NAMES.REGISTER,
    component: () => import('../features/auth/pages/RegisterPage.vue'),
    meta: { layout: 'customer', title: 'Đăng ký tài khoản' },
  },
  {
    path: ROUTE_PATHS.VERIFY_EMAIL,
    name: ROUTE_NAMES.VERIFY_EMAIL,
    component: () => import('../features/auth/pages/VerifyEmailPage.vue'),
    meta: { layout: 'customer', title: 'Xác minh email' },
  },
  {
    path: ROUTE_PATHS.LOGIN,
    name: ROUTE_NAMES.LOGIN,
    component: loadLoginPage,
    meta: { layout: 'auth', title: 'Đăng nhập' },
  },
  {
    path: ROUTE_PATHS.AUTH_CALLBACK,
    name: ROUTE_NAMES.AUTH_CALLBACK,
    component: loadAuthCallbackPage,
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
    component: loadAdminDashboardPage,
    meta: {
      layout: 'admin',
      title: 'Tổng quan',
      requiresAuth: true,
      roles: ADMIN_ROLES,
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_MOVIES,
    name: ROUTE_NAMES.ADMIN_MOVIES,
    component: loadAdminMoviesPage,
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
    component: loadAdminCinemasPage,
    meta: {
      layout: 'admin',
      title: 'Quản lý cụm rạp',
      requiresAuth: true,
      roles: ADMIN_ROLES,
      permissions: [APP_PERMISSIONS.INVENTORY_MANAGE],
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_ROOMS,
    name: ROUTE_NAMES.ADMIN_ROOMS,
    component: loadAdminRoomsPage,
    meta: {
      layout: 'admin',
      title: 'Quản lý phòng',
      requiresAuth: true,
      roles: ADMIN_ROLES,
      permissions: [APP_PERMISSIONS.INVENTORY_MANAGE],
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_ROOM_SEATS,
    name: ROUTE_NAMES.ADMIN_ROOM_SEATS,
    component: loadAdminRoomSeatsPage,
    meta: {
      layout: 'admin',
      title: 'Ghế của phòng',
      requiresAuth: true,
      roles: ADMIN_ROLES,
      permissions: [APP_PERMISSIONS.INVENTORY_MANAGE],
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_ROOM_LAYOUT,
    name: ROUTE_NAMES.ADMIN_ROOM_LAYOUT,
    component: loadAdminRoomLayoutPage,
    meta: {
      layout: 'admin',
      title: 'Thiết kế không gian phòng',
      requiresAuth: true,
      roles: ADMIN_ROLES,
      permissions: [APP_PERMISSIONS.INVENTORY_MANAGE],
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_SHOWTIMES,
    name: ROUTE_NAMES.ADMIN_SHOWTIMES,
    component: loadAdminShowtimesPage,
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
    component: loadAdminBookingsPage,
    meta: {
      layout: 'admin',
      title: 'Đơn đặt vé',
      requiresAuth: true,
      roles: [APP_ROLES.ADMIN],
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_BOOKING_DETAIL,
    name: ROUTE_NAMES.ADMIN_BOOKING_DETAIL,
    component: loadAdminBookingDetailPage,
    meta: {
      layout: 'admin',
      title: 'Chi tiết đơn đặt vé',
      requiresAuth: true,
      roles: [APP_ROLES.ADMIN],
    },
  },

  {
    path: ROUTE_PATHS.ADMIN_USERS,
    name: ROUTE_NAMES.ADMIN_USERS,
    component: loadAdminReferencePage,
    props: { module: 'users' },
    meta: {
      layout: 'admin',
      title: 'Quản lý người dùng',
      requiresAuth: true,
      roles: ADMIN_ROLES,
      permissions: [APP_PERMISSIONS.USER_MANAGE],
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_SHOWTIME_CREATE,
    name: ROUTE_NAMES.ADMIN_SHOWTIME_CREATE,
    component: loadAdminShowtimeCreatePage,
    meta: {
      layout: 'admin',
      title: 'Tạo suất chiếu',
      requiresAuth: true,
      roles: ADMIN_ROLES,
      permissions: [APP_PERMISSIONS.SHOWTIME_MANAGE],
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_PROMOTIONS,
    name: ROUTE_NAMES.ADMIN_PROMOTIONS,
    component: loadAdminReferencePage,
    props: { module: 'promotions' },
    meta: {
      layout: 'admin',
      title: 'Quản lý khuyến mãi',
      requiresAuth: true,
      roles: ADMIN_ROLES,
    },
  },
  {
    path: ROUTE_PATHS.ADMIN_PRICING_POLICY,
    name: ROUTE_NAMES.ADMIN_PRICING_POLICY,
    component: loadAdminPricingPolicyPage,
    meta: {
      layout: 'admin',
      title: 'Quản lý bảng giá vé',
      requiresAuth: true,
      roles: ADMIN_ROLES,
      permissions: [APP_PERMISSIONS.INVENTORY_MANAGE],
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

captureInitialEmailVerificationToken()

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  if (to.name === ROUTE_NAMES.VERIFY_EMAIL && to.hash) {
    captureEmailVerificationFragment(to.hash)
    return { path: to.path, query: to.query, hash: '', replace: true }
  }
})
router.beforeEach(authorizationGuard)

export default router
