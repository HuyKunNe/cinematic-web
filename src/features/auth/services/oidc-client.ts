import { UserManager, WebStorageStateStore } from 'oidc-client-ts'
import { APP_PERMISSIONS } from '../../../config/authorization'
import { appEnv } from '../../../config/env'
import { ROUTE_PATHS } from '../../../router/route-constants'

const CINEMA_WEB_SCOPES = [
  'openid',
  'profile',
  'email',
  APP_PERMISSIONS.BOOKING_CREATE,
  APP_PERMISSIONS.BOOKING_READ,
  APP_PERMISSIONS.BOOKING_CANCEL,
  APP_PERMISSIONS.MOVIE_MANAGE,
  APP_PERMISSIONS.SHOWTIME_MANAGE,
  APP_PERMISSIONS.INVENTORY_MANAGE,
  APP_PERMISSIONS.PAYMENT_READ,
  APP_PERMISSIONS.USER_MANAGE,
].join(' ')

let userManager: UserManager | null = null

export function getUserManager(): UserManager {
  if (!appEnv.oidcAuthority || !appEnv.oidcClientId) {
    throw new Error('Thiếu VITE_OIDC_AUTHORITY hoặc VITE_OIDC_CLIENT_ID.')
  }

  if (!userManager) {
    userManager = new UserManager({
      authority: appEnv.oidcAuthority,
      client_id: appEnv.oidcClientId,
      response_type: 'code',
      scope: CINEMA_WEB_SCOPES,
      redirect_uri: new URL(ROUTE_PATHS.AUTH_CALLBACK, window.location.origin).toString(),
      post_logout_redirect_uri: `${window.location.origin}/`,
      userStore: new WebStorageStateStore({
        store: window.sessionStorage,
      }),
      automaticSilentRenew: false,
      revokeTokensOnSignout: false,
    })
  }

  return userManager
}
