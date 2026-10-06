import type { User } from 'oidc-client-ts'
import { APP_PERMISSIONS, APP_ROLES } from '../../../config/authorization'
import { ROUTE_PATHS } from '../../../router/route-constants'
import type { AppPermission, AppRole } from '../../../config/authorization'
import { useAuthStore } from '../../../stores/auth.store'
import { getUserManager } from './oidc-client'

interface AccessTokenClaims {
  sub?: unknown
  username?: unknown
  roles?: unknown
  permissions?: unknown
}

function decodeAccessToken(token: string): AccessTokenClaims {
  const payload = token.split('.')[1]
  if (!payload) return {}

  const normalized = payload
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(payload.length / 4) * 4, '=')

  const binary = atob(normalized)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes)) as AccessTokenClaims
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function validRoles(claims: AccessTokenClaims): AppRole[] {
  const knownRoles = Object.values(APP_ROLES)
  return toStringArray(claims.roles).filter((role): role is AppRole =>
    knownRoles.includes(role as AppRole),
  )
}

function validPermissions(claims: AccessTokenClaims): AppPermission[] {
  const knownPermissions = Object.values(APP_PERMISSIONS)
  return toStringArray(claims.permissions).filter((permission): permission is AppPermission =>
    knownPermissions.includes(permission as AppPermission),
  )
}

export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return '/'
  }

  try {
    const target = new URL(value, window.location.origin)
    if (target.origin !== window.location.origin) return '/'
    const pathname = target.pathname.replace(/\/+$/, '').toLowerCase()
    const authEntryPaths = new Set<string>([
      ROUTE_PATHS.LOGIN,
      ROUTE_PATHS.AUTH_REQUIRED,
      ROUTE_PATHS.AUTH_CALLBACK,
    ])

    // Không quay lại trang bắt đầu đăng nhập hoặc callback.
    if (authEntryPaths.has(pathname)) return ROUTE_PATHS.HOME
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return '/'
  }
}

function applyUser(user: User) {
  const claims = decodeAccessToken(user.access_token)
  const store = useAuthStore()

  store.setAuthorizationContext({
    subject: typeof claims.sub === 'string' ? claims.sub : user.profile.sub,
    username: typeof claims.username === 'string' ? claims.username.trim() || null : null,
    roles: validRoles(claims),
    permissions: validPermissions(claims),
  })
}

let refreshInFlight: Promise<User | null> | null = null

async function renewWithRefreshToken(user: User): Promise<User | null> {
  if (!user.refresh_token) return null

  if (!refreshInFlight) {
    refreshInFlight = getUserManager()
      .signinSilent()
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null
      })
  }

  return refreshInFlight
}

let signInInFlight: Promise<void> | null = null

export async function beginSignIn(returnTo: unknown): Promise<void> {
  if (!signInInFlight) {
    signInInFlight = getUserManager()
      .signinRedirect({
        state: { returnTo: safeReturnTo(returnTo) },
      })
      .finally(() => {
        signInInFlight = null
      })
  }

  await signInInFlight
}

export async function completeSignIn(): Promise<string> {
  const user = await getUserManager().signinRedirectCallback()
  applyUser(user)

  const state = user.state as { returnTo?: unknown } | undefined
  return safeReturnTo(state?.returnTo)
}

export async function restoreAuthSession(): Promise<boolean> {
  const store = useAuthStore()

  try {
    const manager = getUserManager()
    let user = await manager.getUser()

    if (user && (user.expired || (user.expires_in ?? 0) < 30)) {
      user = await renewWithRefreshToken(user)
    }

    if (!user || user.expired) {
      store.clearAuthorizationContext()
      return false
    }

    applyUser(user)
    return true
  } catch {
    store.clearAuthorizationContext()
    return false
  }
}

export async function getAccessToken(): Promise<string | null> {
  const manager = getUserManager()
  let user = await manager.getUser()

  if (!user) return null

  if (user.expired || (user.expires_in ?? 0) < 30) {
    user = await renewWithRefreshToken(user)
  }

  if (!user || user.expired) return null
  return user.access_token
}

export async function refreshAuthSession(): Promise<boolean> {
  try {
    const manager = getUserManager()
    const user = await manager.getUser()
    if (!user?.refresh_token) return false

    const renewedUser = await renewWithRefreshToken(user)
    if (!renewedUser || renewedUser.expired) return false

    applyUser(renewedUser)
    return true
  } catch {
    useAuthStore().clearAuthorizationContext()
    return false
  }
}

export async function signOut(): Promise<void> {
  useAuthStore().clearAuthorizationContext()
  await getUserManager().signoutRedirect()
}
