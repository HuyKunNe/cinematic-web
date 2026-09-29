import { ROUTE_NAMES } from '@/router/route-constants'

export type CustomerRouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES]

export type CustomerNavIcon = 'home' | 'showtimes' | 'tickets' | 'account'

export interface CustomerNavigationItem {
  label: string
  routeName: CustomerRouteName
  icon?: CustomerNavIcon
  activeRouteNames?: readonly CustomerRouteName[]
}

export const CUSTOMER_PRIMARY_NAVIGATION = [
  { label: 'Lịch chiếu', routeName: ROUTE_NAMES.SHOWTIMES },
  { label: 'Phim', routeName: ROUTE_NAMES.MOVIES },
  { label: 'Rạp', routeName: ROUTE_NAMES.CINEMAS },
  { label: 'Ưu đãi', routeName: ROUTE_NAMES.PROMOTIONS },
] as const satisfies readonly CustomerNavigationItem[]

export const CUSTOMER_BOTTOM_NAVIGATION = [
  {
    label: 'Trang chủ',
    routeName: ROUTE_NAMES.HOME,
    icon: 'home',
  },
  {
    label: 'Lịch chiếu',
    routeName: ROUTE_NAMES.SHOWTIMES,
    icon: 'showtimes',
  },
  {
    label: 'Vé của tôi',
    routeName: ROUTE_NAMES.ACCOUNT_BOOKINGS,
    icon: 'tickets',
  },
  {
    label: 'Tài khoản',
    routeName: ROUTE_NAMES.ACCOUNT,
    icon: 'account',
  },
] as const satisfies readonly CustomerNavigationItem[]
