// Ephemeral handoff from router bootstrap to the verification page. Never persist this value.
let pendingToken: string | null = null

export function captureEmailVerificationFragment(fragment: string): void {
  const values = new URLSearchParams(fragment.replace(/^#/, '')).getAll('token')
  pendingToken = values.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(values[0] ?? '')
    ? values[0]!
    : null
}

export function captureInitialEmailVerificationToken(): void {
  if (window.location.pathname.replace(/\/$/, '') !== '/verify-email' || !window.location.hash) return
  captureEmailVerificationFragment(window.location.hash)
  // Run before createWebHistory so neither router state nor route observers receive the secret.
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

export function consumeEmailVerificationToken(): string | null {
  const token = pendingToken
  pendingToken = null
  return token
}
