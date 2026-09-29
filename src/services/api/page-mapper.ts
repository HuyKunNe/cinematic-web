import type { BackendPageResponseDto, PageModel } from './backend-contracts'

export function mapBackendPage<T>(dto: BackendPageResponseDto<T>): PageModel<T> {
  return {
    items: dto.content,
    page: dto.page.page,
    size: dto.page.size,
    totalElements: dto.page.totalElements,
    totalPages: dto.page.totalPages,
    first: dto.page.first,
    last: dto.page.last,
  }
}
