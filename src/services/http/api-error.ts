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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readText(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function readHeader(headers: unknown, name: string): string | null {
  if (headers instanceof AxiosHeaders) {
    return readText(headers.get(name))
  }

  if (!isRecord(headers)) return null

  const normalizedName = name.toLowerCase()

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === normalizedName) {
      return readText(value)
    }
  }

  return null
}

function readBackendError(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null

  const error = value['error']
  return isRecord(error) ? error : null
}

function readFieldErrors(value: unknown): BackendFieldErrorDto[] {
  if (!Array.isArray(value)) return []

  const items: unknown[] = value
  const result: BackendFieldErrorDto[] = []

  for (const item of items) {
    if (!isRecord(item)) continue

    const field = item['field']
    const message = item['message']

    if (typeof field === 'string' && typeof message === 'string') {
      result.push({ field, message })
    }
  }

  return result
}

export function normalizeApiError(error: unknown): ApiError {
  if (!axios.isAxiosError<unknown>(error)) {
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

  const backendError = readBackendError(error.response?.data)
  const status = error.response?.status ?? null

  return {
    status,
    code: readText(backendError?.['code']),
    message: readText(backendError?.['message']) || error.message || 'Không thể kết nối dịch vụ.',
    category: readText(backendError?.['category']),
    fieldErrors: readFieldErrors(backendError?.['details']),
    requestId: readHeader(error.response?.headers, 'x-request-id'),
    correlationId: readHeader(error.response?.headers, 'x-correlation-id'),
    retryable: status === null || status >= 500,
  }
}
