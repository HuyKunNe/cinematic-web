import { storeToRefs } from 'pinia'
import { useAuthStore } from '../../../stores/auth.store'
import { beginSignIn, restoreAuthSession, signOut } from '../services/auth.service'

export function useAuth() {
  const store = useAuthStore()
  const state = storeToRefs(store)

  return {
    ...state,
    hasRole: store.hasRole,
    hasPermission: store.hasPermission,
    hasAnyPermission: store.hasAnyPermission,
    signIn: beginSignIn,
    signOut,
    restore: restoreAuthSession,
  }
}
