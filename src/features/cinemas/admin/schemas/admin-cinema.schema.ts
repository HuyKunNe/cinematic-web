import { z } from 'zod'
import type {
  CinemaResponse,
  CreateCinemaRequest,
} from '@/services/api/generated/inventory-service/model'
import type { ApiError } from '@/services/http/api-error'

const cinemaEmail = z
  .string()
  .trim()
  .max(254, 'Email tối đa 254 ký tự.')
  .refine(
    (value) => value === '' || z.string().email().safeParse(value).success,
    'Email không hợp lệ.',
  )

export const adminCinemaSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên cụm rạp.').max(150, 'Tên cụm rạp tối đa 150 ký tự.'),
  address: z.string().trim().min(1, 'Nhập địa chỉ.').max(500, 'Địa chỉ tối đa 500 ký tự.'),
  city: z.string().trim().min(1, 'Nhập thành phố.').max(100, 'Thành phố tối đa 100 ký tự.'),
  phone: z.string().trim().max(32, 'Số điện thoại tối đa 32 ký tự.'),
  email: cinemaEmail,
  openingHours: z.string().trim().max(150, 'Giờ mở cửa tối đa 150 ký tự.'),
  directions: z.string().trim().max(1000, 'Hướng dẫn đường đi tối đa 1000 ký tự.'),
  timeZone: z.string().trim().max(64, 'Múi giờ tối đa 64 ký tự.'),
})

export type AdminCinemaValues = z.infer<typeof adminCinemaSchema>
export type AdminCinemaField = keyof AdminCinemaValues

export function createAdminCinemaValues(cinema?: CinemaResponse): AdminCinemaValues {
  return {
    name: cinema?.name ?? '',
    address: cinema?.address ?? '',
    city: cinema?.city ?? '',
    phone: cinema?.phone ?? '',
    email: cinema?.email ?? '',
    openingHours: cinema?.openingHours ?? '',
    directions: cinema?.directions ?? '',
    timeZone: cinema?.timeZone ?? '',
  }
}

export function toAdminCinemaRequest(values: AdminCinemaValues): CreateCinemaRequest {
  const timeZone = values.timeZone.trim()

  return {
    name: values.name.trim(),
    address: values.address.trim(),
    city: values.city.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    openingHours: values.openingHours.trim(),
    directions: values.directions.trim(),
    ...(timeZone ? { timeZone } : {}),
  }
}

export function isAdminCinemaApiError(error: unknown): error is ApiError {
  if (!error || typeof error !== 'object') return false

  const candidate = error as Partial<ApiError>

  return (
    typeof candidate.message === 'string' &&
    (candidate.status === null || typeof candidate.status === 'number') &&
    Array.isArray(candidate.fieldErrors)
  )
}

export function adminCinemaErrorMessage(
  error: unknown,
  fallback = 'Không thể tải thông tin cụm rạp.',
) {
  if (isAdminCinemaApiError(error)) {
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn.'
    if (error.status === 403) return 'Không đủ quyền quản lý rạp.'
    if (error.status === 404) return 'Cụm rạp không còn tồn tại.'
    if (error.status === null) return 'Không thể kết nối dịch vụ.'
    return error.message || fallback
  }

  return error instanceof Error ? error.message : fallback
}
