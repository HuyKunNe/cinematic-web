import { z } from 'zod'
import {
  CreateRoomRequestContentFormatsItem,
  CreateRoomRequestRoomType,
  type CreateRoomRequest,
  type RoomResponse,
  type UpdateRoomRequest,
} from '@/services/api/generated/inventory-service/model'
import type { ApiError } from '@/services/http/api-error'

export const adminRoomTypeOptions = [
  { value: CreateRoomRequestRoomType.STANDARD, label: 'Tiêu chuẩn' },
  { value: CreateRoomRequestRoomType.IMAX, label: 'IMAX' },
  { value: CreateRoomRequestRoomType.FOUR_DX, label: '4DX' },
  { value: CreateRoomRequestRoomType.SCREEN_X, label: 'ScreenX' },
  { value: CreateRoomRequestRoomType.VIP, label: 'VIP' },
] as const

const layoutErrorMessages = new Map<string, string>([
  [
    'INVENTORY_ROOM_LAYOUT_DATA_INVALID',
    'Sơ đồ chưa hợp lệ. Kiểm tra hàng, cột, số ghế và ô dành cho ghế đôi.',
  ],
  [
    'INVENTORY_ROOM_LAYOUT_SEAT_ROOM_MISMATCH',
    'Có ghế trong sơ đồ không thuộc phòng đang chỉnh sửa.',
  ],
  [
    'INVENTORY_ROOM_LAYOUT_NOT_DRAFT',
    'Phiên bản này không còn là bản nháp. Mở lại để xem trạng thái hiện tại.',
  ],
  [
    'INVENTORY_ROOM_LAYOUT_NOT_FOUND',
    'Phiên bản sơ đồ không còn tồn tại. Hãy tải lại danh sách phiên bản.',
  ],
  ['INVENTORY_ROOM_LAYOUT_VERSION_EXHAUSTED', 'Phòng đã đạt giới hạn phiên bản sơ đồ.'],
  [
    'INVENTORY_ROOM_LAYOUT_VERSION_CONFLICT',
    'Sơ đồ đã được cập nhật. Mở lại phiên bản trước khi lưu tiếp.',
  ],
  [
    'INVENTORY_ROOM_LAYOUT_DUPLICATE_SEAT',
    'Một ghế trong danh mục đang được liên kết với nhiều vị trí trong sơ đồ.',
  ],
  [
    'INVENTORY_ROOM_LAYOUT_MATRIX_CONVERSION_REQUIRED',
    'Phiên bản này dùng sơ đồ cũ. Hãy tạo bản nháp sơ đồ mới để tiếp tục.',
  ],
  [
    'INVENTORY_ROOM_LAYOUT_MATRIX_PUBLICATION_PENDING',
    'Chưa hỗ trợ xuất bản sơ đồ. Bạn vẫn có thể lưu bản nháp.',
  ],
  [
    'INVENTORY_ROOM_CONTENT_FORMATS_INVALID',
    'Danh sách định dạng không hợp lệ. Chỉ hỗ trợ các giá trị do API cung cấp.',
  ],
  [
    'INVENTORY_ROOM_VERSION_CONFLICT',
    'Thông tin phòng đã thay đổi. Đã tải lại dữ liệu mới; hãy kiểm tra và lưu lại.',
  ],
])

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
  if (!isAdminRoomApiError(error)) {
    return error instanceof Error ? error.message : fallback
  }

  if (error.status === 401) return 'Phiên đăng nhập đã hết hạn.'
  if (error.status === 403) return 'Không đủ quyền quản lý phòng.'
  if (error.status === null) return 'Không thể kết nối dịch vụ.'

  const layoutMessage = error.code ? layoutErrorMessages.get(error.code) : undefined

  if (layoutMessage) return layoutMessage

  if (error.status === 404) {
    return 'Cụm rạp hoặc phòng chiếu không còn tồn tại.'
  }

  return error.message || fallback
}

export const adminRoomContentFormatOptions = Object.values(CreateRoomRequestContentFormatsItem).map(
  (value) => ({ value, label: value }),
)

export const adminRoomSchema = z.object({
  name: z.string().trim().min(1, 'Nhập tên phòng.').max(100, 'Tên phòng tối đa 100 ký tự.'),
  roomType: z.nativeEnum(CreateRoomRequestRoomType, {
    errorMap: () => ({ message: 'Chọn loại phòng hợp lệ.' }),
  }),
})

export const adminRoomCreateSchema = adminRoomSchema.extend({
  active: z.boolean(),
  contentFormats: z
    .array(z.nativeEnum(CreateRoomRequestContentFormatsItem))
    .min(1, 'Chọn ít nhất một định dạng phòng hỗ trợ.'),
})

export type AdminRoomValues = z.infer<typeof adminRoomSchema>
export type AdminRoomField = keyof AdminRoomValues
export type AdminRoomCreateValues = z.infer<typeof adminRoomCreateSchema>

export function createAdminRoomValues(room?: RoomResponse): AdminRoomValues {
  const type = adminRoomSchema.shape.roomType.safeParse(room?.roomType)

  return {
    name: room?.name ?? '',
    roomType: type.success ? type.data : CreateRoomRequestRoomType.STANDARD,
  }
}

export function createAdminRoomCreateValues(): AdminRoomCreateValues {
  return {
    ...createAdminRoomValues(),
    active: true,
    contentFormats: [CreateRoomRequestContentFormatsItem['2D']],
  }
}

export function toAdminRoomCreateRequest(values: AdminRoomCreateValues): CreateRoomRequest {
  return {
    name: values.name.trim(),
    roomType: values.roomType,
    active: values.active,
    contentFormats: [...values.contentFormats],
  }
}

export function toAdminRoomUpdateRequest(
  values: AdminRoomValues,
): Pick<UpdateRoomRequest, 'name' | 'roomType'> {
  return {
    name: values.name.trim(),
    roomType: values.roomType,
  }
}
