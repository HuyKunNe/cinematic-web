const localApiBaseUrl = 'http://localhost:8080'

function normalizeBaseUrl(value: string): string {
  try {
    return new URL(value).toString().replace(/\/$/, '')
  } catch {
    throw new Error('VITE_API_BASE_URL phải là URL hợp lệ.')
  }
}

export const appEnv = Object.freeze({
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || localApiBaseUrl),
  oidcAuthority: import.meta.env.VITE_OIDC_AUTHORITY || '',
  oidcClientId: import.meta.env.VITE_OIDC_CLIENT_ID || '',
})
