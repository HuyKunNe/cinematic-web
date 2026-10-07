import { z } from 'zod'
import {
  CreateRoomRequestRoomType,
  type CreateRoomRequest,
  type RoomResponse,
} from '@/services/api/generated/inventory-service/model'
import type { ApiError } from '@/services/http/api-error'

export const adminRoomTypeOptions = [
  { value: CreateRoomRequestRoomType.STANDARD, label: 'Tiêu chuẩn' },
  { value: CreateRoomRequestRoomType.IMAX, label: 'IMAX' },
  { value: CreateRoomRequestRoomType.FOUR_DX, label: '4DX' },
  { value: CreateRoomRequestRoomType.SCREEN_X, label: 'ScreenX' },
  { value: CreateRoomRequestRoomType.VIP, label: 'VIP' },
] as const

export const adminRoomSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên phòng.').max(100, 'Tên phòng tối đa 100 ký tự.'),
  roomType: z.nativeEnum(CreateRoomRequestRoomType, {
    errorMap: () => ({ message: 'Chọn loại phòng hợp lệ.' }),
  }),
})

export type AdminRoomValues = z.infer<typeof adminRoomSchema>
export type AdminRoomField = keyof AdminRoomValues

export function createAdminRoomValues(room?: RoomResponse): AdminRoomValues {
  const type = adminRoomSchema.shape.roomType.safeParse(room?.roomType)

  return {
    name: room?.name ?? '',
    roomType: type.success ? type.data : CreateRoomRequestRoomType.STANDARD,
  }
}

export function toAdminRoomRequest(values: AdminRoomValues): CreateRoomRequest {
  return {
    name: values.name.trim(),
    roomType: values.roomType,
  }
}

export function adminRoomTypeLabel(type?: string) {
  return adminRoomTypeOptions.find((item) => item.value === type)?.label ?? type ?? 'Chưa xác định'
}

export function normalizeAdminRoomSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi-VN')
    .trim()
}

export function isAdminRoomApiError(error: unknown): error is ApiError {
  if (!error || typeof error !== 'object') return false

  const candidate = error as Partial<ApiError>

  return (
    typeof candidate.message === 'string' &&
    (candidate.status === null || typeof candidate.status === 'number') &&
    Array.isArray(candidate.fieldErrors)
  )
}

export function adminRoomErrorMessage(error: unknown, fallback = 'Không thể tải thông tin phòng.') {
  if (isAdminRoomApiError(error)) {
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn.'
    if (error.status === 403) return 'Không đủ quyền quản lý phòng.'
    if (error.status === 404) return 'Rạp hoặc phòng không còn tồn tại.'
    if (error.status === null) return 'Không thể kết nối dịch vụ.'
    return error.message || fallback
  }

  return error instanceof Error ? error.message : fallback
}
