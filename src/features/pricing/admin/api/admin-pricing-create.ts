import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { z } from 'zod'
import { createCinemaPricingPolicyDraft } from '@/services/api/generated/inventory-service/cinema-pricing-policy-controller/cinema-pricing-policy-controller'
import type { CreateCinemaPricingPolicyRequest } from '@/services/api/generated/inventory-service/model/createCinemaPricingPolicyRequest'
import { CreateCinemaPricingPolicyRequestPricingModel } from '@/services/api/generated/inventory-service/model/createCinemaPricingPolicyRequestPricingModel'

export const pricingDraftSchema = z
  .object({
    cinemaId: z.string().uuid('Chọn rạp hợp lệ.'),
    effectiveFrom: z.string().date('Nhập ngày bắt đầu hợp lệ.'),
    effectiveTo: z.union([z.literal(''), z.string().date('Nhập ngày kết thúc hợp lệ.')]),
  })
  .refine((value) => !value.effectiveTo || value.effectiveTo > value.effectiveFrom, {
    path: ['effectiveTo'],
    message: 'Ngày kết thúc phải sau ngày bắt đầu.',
  })

export type PricingDraftInput = z.input<typeof pricingDraftSchema>

const acknowledgementSchema = z.object({
  id: z.string().uuid(),
  cinemaId: z.string().uuid(),
  policyVersion: z.number().int().positive(),
  status: z.literal('DRAFT'),
  pricingModel: z.literal('FARE_MATRIX_V2'),
  currency: z.literal('VND'),
})

export type CreatedPricingDraft = z.infer<typeof acknowledgementSchema>

export class PricingDraftCreationError extends Error {
  constructor(
    message: string,
    public readonly uncertain: boolean,
  ) {
    super(message)
    this.name = 'PricingDraftCreationError'
  }
}

function creationError(error: unknown): PricingDraftCreationError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    if (error.status === 401) {
      return new PricingDraftCreationError(
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        false,
      )
    }

    if (error.status === 403) {
      return new PricingDraftCreationError('Bạn không có quyền tạo chính sách giá.', false)
    }

    if (error.status === 404) {
      return new PricingDraftCreationError('Không tìm thấy rạp. Hãy tải lại danh mục.', false)
    }

    if ([400, 409, 422].includes(error.status)) {
      return new PricingDraftCreationError(
        'Backend từ chối tạo bản nháp. Kiểm tra ngày hiệu lực và cấu hình timezone của rạp.',
        false,
      )
    }
  }

  return new PricingDraftCreationError(
    'Chưa xác định được kết quả tạo bản nháp. Hãy tải lại danh sách phiên bản trước khi gửi yêu cầu mới.',
    true,
  )
}

export function useCreatePricingDraft() {
  const queryClient = useQueryClient()

  return useMutation({
    retry: false,

    mutationFn: async (input: PricingDraftInput) => {
      const parsed = pricingDraftSchema.safeParse(input)

      if (!parsed.success) {
        throw new PricingDraftCreationError('Thông tin tạo bản nháp chưa hợp lệ.', false)
      }

      const value = parsed.data

      const request = {
        currency: 'VND',
        pricingModel: CreateCinemaPricingPolicyRequestPricingModel.FARE_MATRIX_V2,
        effectiveFrom: value.effectiveFrom,
        ...(value.effectiveTo ? { effectiveTo: value.effectiveTo } : {}),
      } satisfies CreateCinemaPricingPolicyRequest

      let response: unknown

      try {
        response = await createCinemaPricingPolicyDraft(value.cinemaId, request)
      } catch (error: unknown) {
        throw creationError(error)
      }

      const result = acknowledgementSchema.safeParse(response)

      if (!result.success || result.data.cinemaId !== value.cinemaId) {
        throw new PricingDraftCreationError(
          'Backend đã phản hồi nhưng dữ liệu xác nhận không hợp lệ. Hãy tải lại danh sách trước khi tạo thêm.',
          true,
        )
      }

      return result.data
    },

    onSuccess: (draft) => {
      // Refresh danh sách độc lập với kết quả POST đã thành công.
      void queryClient
        .invalidateQueries({
          queryKey: ['pricing', 'admin', 'policies', draft.cinemaId],
        })
        .catch(() => undefined)
    },
  })
}
