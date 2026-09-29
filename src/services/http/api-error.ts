import axios, { AxiosHeaders } from 'axios'

export interface BackendFieldErrorDto {
  field: string
  message: string
}

export interface BackendErrorDto {
  code?: string | null
  message?: string | null
  category?: string | null
  details?: BackendFieldErrorDto[] | null
}

export interface BackendErrorEnvelopeDto {
  success?: false
  timestamp?: string
  data?: null
  error?: BackendErrorDto | null
}

export interface ApiError {
  status: number | null
  code: string | null
  message: string
  category: string | null
  fieldErrors: BackendFieldErrorDto[]
  requestId: string | null
  correlationId: string | null
  retryable: boolean
}

function readHeader(headers: any, name: string): string | null {
  if (!headers) return null

  const value = AxiosHeaders.from(headers).get(name)
  return typeof value === 'string' ? value : null
}

export function normalizeApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return {
      status: null,
      code: null,
      message: 'Đã xảy ra lỗi không xác định.',
      category: null,
      fieldErrors: [],
      requestId: null,
      correlationId: null,
      retryable: false,
    }
  }

  const data = error.response?.data as BackendErrorEnvelopeDto | undefined
  const backendError = data?.error
  const status = error.response?.status ?? null
  const details = backendError?.details

  return {
    status,
    code: backendError?.code ?? null,
    message: backendError?.message || error.message || 'Không thể kết nối dịch vụ.',
    category: backendError?.category ?? null,
    fieldErrors: Array.isArray(details)
      ? details.filter(
          (item): item is BackendFieldErrorDto =>
            Boolean(item) && typeof item.field === 'string' && typeof item.message === 'string',
        )
      : [],
    requestId: readHeader(error.response?.headers, 'x-request-id'),
    correlationId: readHeader(error.response?.headers, 'x-correlation-id'),
    retryable: status === null || status >= 500,
  }
}
