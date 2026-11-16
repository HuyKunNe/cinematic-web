import { usePageLoading } from './use-page-loading'

export function useAdminPageLoading() {
  return usePageLoading({
    layout: 'admin',
    navigationErrorMessage: 'Chưa tải được trang quản trị. Vui lòng thử lại.',
  })
}
