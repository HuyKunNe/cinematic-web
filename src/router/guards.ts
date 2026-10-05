import type { NavigationGuard } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import {
  beginSignIn,
  restoreAuthSession,
  safeReturnTo,
} from '../features/auth/services/auth.service'
import { ROUTE_NAMES } from './route-constants'

export const authorizationGuard: NavigationGuard = async (to) => {
  await restoreAuthSession()

  const auth = useAuthStore()

  const isSignInRoute = to.name === ROUTE_NAMES.LOGIN || to.name === ROUTE_NAMES.AUTH_REQUIRED

  if (isSignInRoute && auth.isAuthenticated) {
    return safeReturnTo(to.query.returnTo)
  }

  // Chỉ cho trang login FE hiển thị khi lần redirect trước thất bại.
  const isSignInFailurePage =
    to.name === ROUTE_NAMES.LOGIN && to.query.authError === 'signin_redirect_failed'

  if (!auth.isAuthenticated && isSignInFailurePage) {
    return true
  }

  if (!auth.isAuthenticated && (to.meta.requiresAuth || isSignInRoute)) {
    const returnTo = safeReturnTo(isSignInRoute ? to.query.returnTo : to.fullPath)

    try {
      await beginSignIn(returnTo)

      // Trình duyệt đang chuyển sang User Service.
      return false
    } catch {
      return {
        name: ROUTE_NAMES.LOGIN,
        query: {
          returnTo,
          authError: 'signin_redirect_failed',
        },
        replace: true,
      }
    }
  }

  if (to.meta.roles?.length) {
    const hasAllowedRole = to.meta.roles.some((role) => auth.roles.includes(role))

    if (!hasAllowedRole) {
      return { name: ROUTE_NAMES.AUTH_FORBIDDEN }
    }
  }

  if (to.meta.permissions?.length) {
    const hasAllPermissions = to.meta.permissions.every((permission) =>
      auth.permissions.includes(permission),
    )

    if (!hasAllPermissions) {
      return { name: ROUTE_NAMES.AUTH_FORBIDDEN }
    }
  }

  if (to.meta.anyPermissions?.length) {
    const hasAnyPermission = to.meta.anyPermissions.some((permission) =>
      auth.permissions.includes(permission),
    )

    if (!hasAnyPermission) {
      return { name: ROUTE_NAMES.AUTH_FORBIDDEN }
    }
  }

  return true
}
