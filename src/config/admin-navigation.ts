import type { AppPermission, AppRole } from './authorization'
import { ADMIN_ROLES, APP_PERMISSIONS } from './authorization'
import { ROUTE_NAMES } from '../router/route-constants'

export type AdminRouteName =
  | typeof ROUTE_NAMES.ADMIN
  | typeof ROUTE_NAMES.ADMIN_MOVIES
  | typeof ROUTE_NAMES.ADMIN_CINEMAS
  | typeof ROUTE_NAMES.ADMIN_ROOMS
  | typeof ROUTE_NAMES.ADMIN_SHOWTIMES
  | typeof ROUTE_NAMES.ADMIN_PRICING_POLICY
  | typeof ROUTE_NAMES.ADMIN_BOOKINGS
  | typeof ROUTE_NAMES.ADMIN_PROMOTIONS
  | typeof ROUTE_NAMES.ADMIN_USERS

export type AdminNavigationIcon =
  'overview' | 'movies' | 'cinemas' | 'rooms' | 'showtimes' | 'bookings' | 'promotions' | 'users'

export type AdminNavigationGroup = 'overview' | 'content' | 'operations' | 'system'

export interface AdminNavigationItem {
  label: string
  description: string
  routeName: AdminRouteName
  icon: AdminNavigationIcon
  group: AdminNavigationGroup
  roles: readonly AppRole[]
  permission?: AppPermission
}

export const ADMIN_NAVIGATION_GROUPS: readonly {
  id: AdminNavigationGroup
  label: string
}[] = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'content', label: 'Quản lý rạp' },
  { id: 'operations', label: 'Vận hành' },
  { id: 'system', label: 'Hệ thống' },
]

export const ADMIN_NAVIGATION: readonly AdminNavigationItem[] = [
  {
    label: 'Tổng quan',
    description: 'Theo dõi dữ liệu và truy cập các chức năng quản trị.',
    routeName: ROUTE_NAMES.ADMIN,
    icon: 'overview',
    group: 'overview',
    roles: ADMIN_ROLES,
  },
  {
    label: 'Phim',
    description: 'Quản lý nội dung phim và các phiên bản trình chiếu.',
    routeName: ROUTE_NAMES.ADMIN_MOVIES,
    icon: 'movies',
    group: 'content',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.MOVIE_MANAGE,
  },
  {
    label: 'Cụm rạp',
    description: 'Quản lý địa điểm, thông tin liên hệ và trạng thái hoạt động.',
    routeName: ROUTE_NAMES.ADMIN_CINEMAS,
    icon: 'cinemas',
    group: 'content',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.INVENTORY_MANAGE,
  },
  {
    label: 'Phòng & sơ đồ ghế',
    description: 'Cấu hình phòng chiếu, ghế và sơ đồ vị trí đặt chỗ.',
    routeName: ROUTE_NAMES.ADMIN_ROOMS,
    icon: 'rooms',
    group: 'content',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.INVENTORY_MANAGE,
  },
  {
    label: 'Lịch chiếu',
    description: 'Sắp xếp phim, phòng chiếu và thời gian chiếu.',
    routeName: ROUTE_NAMES.ADMIN_SHOWTIMES,
    icon: 'showtimes',
    group: 'content',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.SHOWTIME_MANAGE,
  },
  {
    label: 'Chính sách vé',
    description: 'Quản lý bảng giá, nhóm ngày, phạm vi áp dụng và phiên bản.',
    routeName: ROUTE_NAMES.ADMIN_PRICING_POLICY,
    icon: 'bookings',
    group: 'content',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.INVENTORY_MANAGE,
  },
  {
    label: 'Đơn đặt vé',
    description: 'Tra cứu giao dịch đặt vé và thông tin đơn hàng.',
    routeName: ROUTE_NAMES.ADMIN_BOOKINGS,
    icon: 'bookings',
    group: 'operations',
    roles: ADMIN_ROLES,
  },
  {
    label: 'Khuyến mãi',
    description: 'Các chương trình ưu đãi và chiến dịch.',
    routeName: ROUTE_NAMES.ADMIN_PROMOTIONS,
    icon: 'promotions',
    group: 'operations',
    roles: ADMIN_ROLES,
  },
  {
    label: 'Người dùng',
    description: 'Thông tin và trạng thái tài khoản người dùng.',
    routeName: ROUTE_NAMES.ADMIN_USERS,
    icon: 'users',
    group: 'system',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.USER_MANAGE,
  },
]

interface NavigationAuthorizationContext {
  isAuthenticated: boolean
  roles: readonly AppRole[]
  permissions: readonly AppPermission[]
}

export function getVisibleAdminNavigation(
  context: NavigationAuthorizationContext,
): readonly AdminNavigationItem[] {
  if (!context.isAuthenticated) return []

  return ADMIN_NAVIGATION.filter(
    (item) =>
      item.roles.some((role) => context.roles.includes(role)) &&
      (!item.permission || context.permissions.includes(item.permission)),
  )
}
