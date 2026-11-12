import axios, { AxiosHeaders, type AxiosRequestConfig } from 'axios'
import { appEnv } from '../../config/env'
import { normalizeApiError } from './api-error'
import { getApiAuthSession } from './auth-session'

declare module 'axios' {
  interface AxiosRequestConfig {
    _retriedAfterRefresh?: boolean
  }
}

export const apiClient = axios.create({
  baseURL: appEnv.apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
  paramsSerializer: {
    indexes: null,
  },
})

let refreshInFlight: Promise<boolean> | null = null

function refreshSessionOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = getApiAuthSession()
      .refreshAccessToken()
      .finally(() => {
        refreshInFlight = null
      })
  }

  return refreshInFlight
}

function createRequestId(): string | null {
  return globalThis.crypto?.randomUUID?.() ?? null
}

// Registration and email confirmation are public, including their invalid-token 401 responses.
function isPublicRegistrationRequest(config: AxiosRequestConfig): boolean {
  return config.method?.toLowerCase() === 'post' && [
    '/api/v1/auth/registrations',
    '/api/v1/auth/email-verifications/confirm',
  ].includes(config.url?.split('?')[0] ?? '')
}

apiClient.interceptors.request.use(async (config) => {
  const headers = AxiosHeaders.from(config.headers)
  const requestId = createRequestId()

  if (!headers.has('X-Request-Id') && requestId) {
    headers.set('X-Request-Id', requestId)
  }

  const accessToken = isPublicRegistrationRequest(config) ? null : await getApiAuthSession().getAccessToken()

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  config.headers = headers
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(normalizeApiError(error))
    }

    const config = error.config
    const isUnauthorized = error.response?.status === 401

    if (isUnauthorized && config && !isPublicRegistrationRequest(config) && !config._retriedAfterRefresh) {
      config._retriedAfterRefresh = true

      let refreshed = false
      try {
        refreshed = await refreshSessionOnce()
      } catch {
        refreshed = false
      }

      if (refreshed) {
        const method = (config.method || 'get').toLowerCase()
        const safeToRetry = ['get', 'head', 'options'].includes(method)

        if (safeToRetry) {
          return apiClient.request(config)
        }
      } else {
        getApiAuthSession().onReauthenticationRequired()
      }
    }

    return Promise.reject(normalizeApiError(error))
  },
)

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>(config)
  return response.data
}
