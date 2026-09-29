export const APP_ROLES = {
  USER: 'USER',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
  SERVICE: 'SERVICE',
} as const

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES]

export const APP_PERMISSIONS = {
  BOOKING_CREATE: 'booking:create',
  BOOKING_READ: 'booking:read',
  BOOKING_CANCEL: 'booking:cancel',
  MOVIE_MANAGE: 'movie:manage',
  SHOWTIME_MANAGE: 'showtime:manage',
  INVENTORY_MANAGE: 'inventory:manage',
  PAYMENT_READ: 'payment:read',
  NOTIFICATION_MANAGE: 'notification:manage',
  USER_MANAGE: 'user:manage',
} as const

export type AppPermission = (typeof APP_PERMISSIONS)[keyof typeof APP_PERMISSIONS]

export const ADMIN_ROLES: AppRole[] = [APP_ROLES.STAFF, APP_ROLES.ADMIN]
