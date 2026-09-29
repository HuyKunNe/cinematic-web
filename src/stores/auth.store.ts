import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AppPermission, AppRole } from '../config/authorization'
import { APP_ROLES } from '../config/authorization'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const roles = ref<AppRole[]>([])
  const permissions = ref<AppPermission[]>([])

  const isAdmin = computed(
    () => roles.value.includes(APP_ROLES.STAFF) || roles.value.includes(APP_ROLES.ADMIN),
  )

  function setAuthorizationContext(context: { roles: AppRole[]; permissions: AppPermission[] }) {
    // Chỉ gọi sau khi OIDC client xác thực session/token.
    isAuthenticated.value = true
    roles.value = [...context.roles]
    permissions.value = [...context.permissions]
  }

  function clearAuthorizationContext() {
    isAuthenticated.value = false
    roles.value = []
    permissions.value = []
  }

  return {
    isAuthenticated,
    roles,
    permissions,
    isAdmin,
    setAuthorizationContext,
    clearAuthorizationContext,
  }
})
