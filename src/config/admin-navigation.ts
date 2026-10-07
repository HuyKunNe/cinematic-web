import type { AppPermission, AppRole } from './authorization'
import { ADMIN_ROLES, APP_PERMISSIONS } from './authorization'
import { ROUTE_NAMES } from '../router/route-constants'

export type AdminRouteName =
  | typeof ROUTE_NAMES.ADMIN
  | typeof ROUTE_NAMES.ADMIN_MOVIES
  | typeof ROUTE_NAMES.ADMIN_CINEMAS
  | typeof ROUTE_NAMES.ADMIN_ROOMS
  | typeof ROUTE_NAMES.ADMIN_SHOWTIMES
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
  { id: 'overview', label: 'Điều hành' },
  { id: 'content', label: 'Nội dung' },
  { id: 'operations', label: 'Vận hành' },
  { id: 'system', label: 'Hệ thống' },
]

export const ADMIN_NAVIGATION: readonly AdminNavigationItem[] = [
  {
    label: 'Đặt vé',
    description: 'Tra cứu giao dịch đặt vé và thanh toán.',
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
    group: 'content',
    roles: ADMIN_ROLES,
  },
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
    description: 'Thông tin phim, thể loại, hình ảnh và trạng thái phát hành.',
    routeName: ROUTE_NAMES.ADMIN_MOVIES,
    icon: 'movies',
    group: 'content',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.MOVIE_MANAGE,
  },
  {
    label: 'Rạp',
    description: 'Thông tin rạp, thành phố và trạng thái hoạt động.',
    routeName: ROUTE_NAMES.ADMIN_CINEMAS,
    icon: 'cinemas',
    group: 'operations',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.INVENTORY_MANAGE,
  },
  {
    label: 'Phòng và ghế',
    description: 'Phòng chiếu và danh sách ghế của từng phòng.',
    routeName: ROUTE_NAMES.ADMIN_ROOMS,
    icon: 'rooms',
    group: 'operations',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.INVENTORY_MANAGE,
  },
  {
    label: 'Lịch chiếu',
    description: 'Phân bổ phim, phòng chiếu và thời gian chiếu.',
    routeName: ROUTE_NAMES.ADMIN_SHOWTIMES,
    icon: 'showtimes',
    group: 'operations',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.SHOWTIME_MANAGE,
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
