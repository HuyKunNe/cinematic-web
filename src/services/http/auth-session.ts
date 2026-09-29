export interface ApiAuthSession {
  getAccessToken(): Promise<string | null>
  refreshAccessToken(): Promise<boolean>
  onReauthenticationRequired(): void
}

const defaultSession: ApiAuthSession = {
  async getAccessToken() {
    return null
  },
  async refreshAccessToken() {
    return false
  },
  onReauthenticationRequired() {
    window.dispatchEvent(new Event('cinematic:authentication-required'))
  },
}

let currentSession: ApiAuthSession = defaultSession

export function configureApiAuthSession(session: ApiAuthSession): void {
  currentSession = session
}

export function getApiAuthSession(): ApiAuthSession {
  return currentSession
}
