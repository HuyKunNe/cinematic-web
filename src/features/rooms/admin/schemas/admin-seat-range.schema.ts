import { z } from 'zod'
import { CreateSeatRangeRequestSeatType } from '@/services/api/generated/inventory-service/model'

export const adminSeatTypeOptions = [
  { value: CreateSeatRangeRequestSeatType.STANDARD, label: 'Tiêu chuẩn' },
  { value: CreateSeatRangeRequestSeatType.VIP, label: 'VIP' },
  { value: CreateSeatRangeRequestSeatType.COUPLE, label: 'Ghế đôi' },
  { value: CreateSeatRangeRequestSeatType.ACCESSIBLE, label: 'Hỗ trợ tiếp cận' },
] as const

const seatNumberSchema = z
  .string()
  .trim()
  .min(1, 'Nhập số ghế.')
  .regex(/^\d+$/, 'Nhập số nguyên từ 1 đến 999.')
  .refine((value) => {
    const number = Number(value)
    return Number.isInteger(number) && number >= 1 && number <= 999
  }, 'Số ghế phải từ 1 đến 999.')
  .transform(Number)

export const adminSeatRangeSchema = z
  .object({
    rowLabel: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, 'Nhập tên hàng ghế.')
      .max(10, 'Tên hàng ghế tối đa 10 ký tự.'),
    startNumber: seatNumberSchema,
    endNumber: seatNumberSchema,
    seatType: z.nativeEnum(CreateSeatRangeRequestSeatType, {
      errorMap: () => ({ message: 'Chọn loại ghế hợp lệ.' }),
    }),
  })
  .superRefine((values, context) => {
    if (values.endNumber < values.startNumber) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endNumber'],
        message: 'Số cuối phải lớn hơn hoặc bằng số đầu.',
      })
    }
  })

export type AdminSeatRangeInput = z.input<typeof adminSeatRangeSchema>
export type AdminSeatRangeField = keyof AdminSeatRangeInput

export function createAdminSeatRangeValues(): AdminSeatRangeInput {
  return {
    rowLabel: '',
    startNumber: '1',
    endNumber: '10',
    seatType: CreateSeatRangeRequestSeatType.STANDARD,
  }
}
