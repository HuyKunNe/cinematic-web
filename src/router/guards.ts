import type { NavigationGuard } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import { ROUTE_NAMES } from './route-constants'

export const authorizationGuard: NavigationGuard = (to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return {
      name: ROUTE_NAMES.AUTH_REQUIRED,
      query: {
        returnTo: to.fullPath,
      },
    }
  }

  if (to.meta.roles?.length) {
    const hasAllowedRole = to.meta.roles.some((role) => auth.roles.includes(role))

    if (!hasAllowedRole) {
      return {
        name: ROUTE_NAMES.AUTH_FORBIDDEN,
      }
    }
  }

  if (to.meta.permissions?.length) {
    const hasAllPermissions = to.meta.permissions.every((permission) =>
      auth.permissions.includes(permission),
    )

    if (!hasAllPermissions) {
      return {
        name: ROUTE_NAMES.AUTH_FORBIDDEN,
      }
    }
  }

  if (to.meta.anyPermissions?.length) {
    const hasAnyPermission = to.meta.anyPermissions.some((permission) =>
      auth.permissions.includes(permission),
    )

    if (!hasAnyPermission) {
      return {
        name: ROUTE_NAMES.AUTH_FORBIDDEN,
      }
    }
  }

  return true
}
