import type { AppPermission, AppRole } from './authorization'
import { ADMIN_ROLES, APP_PERMISSIONS } from './authorization'
import { ROUTE_NAMES } from '../router/route-constants'

export type AdminRouteName =
  | typeof ROUTE_NAMES.ADMIN_MOVIES
  | typeof ROUTE_NAMES.ADMIN_CINEMAS
  | typeof ROUTE_NAMES.ADMIN_ROOMS
  | typeof ROUTE_NAMES.ADMIN_SHOWTIMES
  | typeof ROUTE_NAMES.ADMIN_USERS

export type AdminNavigationIcon = 'movies' | 'cinemas' | 'rooms' | 'showtimes' | 'users'

export interface AdminNavigationItem {
  label: string
  routeName: AdminRouteName
  icon: AdminNavigationIcon
  roles: readonly AppRole[]
  permission: AppPermission
}

export const ADMIN_NAVIGATION: readonly AdminNavigationItem[] = [
  {
    label: 'Phim',
    routeName: ROUTE_NAMES.ADMIN_MOVIES,
    icon: 'movies',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.MOVIE_MANAGE,
  },
  {
    label: 'Rạp',
    routeName: ROUTE_NAMES.ADMIN_CINEMAS,
    icon: 'cinemas',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.INVENTORY_MANAGE,
  },
  {
    label: 'Phòng',
    routeName: ROUTE_NAMES.ADMIN_ROOMS,
    icon: 'rooms',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.INVENTORY_MANAGE,
  },
  {
    label: 'Lịch chiếu',
    routeName: ROUTE_NAMES.ADMIN_SHOWTIMES,
    icon: 'showtimes',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.SHOWTIME_MANAGE,
  },
  {
    label: 'Người dùng',
    routeName: ROUTE_NAMES.ADMIN_USERS,
    icon: 'users',
    roles: ADMIN_ROLES,
    permission: APP_PERMISSIONS.USER_MANAGE,
  },
] as const
