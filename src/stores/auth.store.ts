import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { APP_PERMISSIONS, APP_ROLES } from '../config/authorization'
import type { AppPermission, AppRole } from '../config/authorization'

export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated'

export const useAuthStore = defineStore('auth', () => {
  const status = ref<AuthStatus>('unknown')
  const subject = ref<string | null>(null)
  const roles = ref<AppRole[]>([])
  const permissions = ref<AppPermission[]>([])

  const isAuthenticated = computed(() => status.value === 'authenticated')
  const isAdmin = computed(
    () => roles.value.includes(APP_ROLES.STAFF) || roles.value.includes(APP_ROLES.ADMIN),
  )

  function setAuthorizationContext(context: {
    subject: string
    roles: AppRole[]
    permissions: AppPermission[]
  }) {
    subject.value = context.subject
    roles.value = [...context.roles]
    permissions.value = [...context.permissions]
    status.value = 'authenticated'
  }

  function clearAuthorizationContext() {
    subject.value = null
    roles.value = []
    permissions.value = []
    status.value = 'unauthenticated'
  }

  function hasRole(role: AppRole) {
    return roles.value.includes(role)
  }

  function hasPermission(permission: AppPermission) {
    return permissions.value.includes(permission)
  }

  function hasAnyPermission(values: readonly AppPermission[]) {
    return values.some((permission) => permissions.value.includes(permission))
  }

  return {
    status,
    subject,
    roles,
    permissions,
    isAuthenticated,
    isAdmin,
    setAuthorizationContext,
    clearAuthorizationContext,
    hasRole,
    hasPermission,
    hasAnyPermission,
  }
})
