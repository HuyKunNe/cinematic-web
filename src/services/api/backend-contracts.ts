export interface ApiResponseDto<T> {
  success: boolean
  timestamp?: string
  data: T
  error?: unknown
}

export interface BackendPageMetadataDto {
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface BackendPageResponseDto<T> {
  content: T[]
  page: BackendPageMetadataDto
}

export interface PageModel<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}
