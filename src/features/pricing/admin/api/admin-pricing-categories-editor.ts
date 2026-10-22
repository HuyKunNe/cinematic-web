import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import {
  getCinemaPricingTicketCategories,
  replaceCinemaPricingTicketCategories,
} from '@/services/api/generated/inventory-service/cinema-pricing-policy-controller/cinema-pricing-policy-controller'
import { CategoryInputEligibilityMode } from '@/services/api/generated/inventory-service/model/categoryInputEligibilityMode'
import { CategoryInputPricingRole } from '@/services/api/generated/inventory-service/model/categoryInputPricingRole'
import { CinemaPricingPolicyResponseStatus } from '@/services/api/generated/inventory-service/model/cinemaPricingPolicyResponseStatus'
import type { ReplaceCinemaPricingTicketCategoriesRequest } from '@/services/api/generated/inventory-service/model/replaceCinemaPricingTicketCategoriesRequest'
import { pricingErrorMessage } from './admin-pricing-queries'

const codePattern = /^[A-Z][A-Z0-9_]{0,63}$/

const categorySchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(codePattern, 'Mã phải bắt đầu bằng chữ và chỉ gồm A–Z, 0–9, _.'),
    name: z.string().trim().min(1, 'Nhập tên nhóm vé.').max(150),
    pricingRole: z.nativeEnum(CategoryInputPricingRole),
    eligibilityMode: z.nativeEnum(CategoryInputEligibilityMode),
    eligibilityRuleCode: z
      .string()
      .nullish()
      .transform((value) => (value ?? '').trim().toUpperCase()),
  })
  .superRefine((value, context) => {
    if (value.pricingRole === 'REGULAR' && value.eligibilityMode !== 'UNRESTRICTED') {
      context.addIssue({
        code: 'custom',
        path: ['eligibilityMode'],
        message: 'REGULAR phải dùng UNRESTRICTED.',
      })
    }

    if (value.eligibilityMode === 'RULE_REQUIRED') {
      if (!codePattern.test(value.eligibilityRuleCode)) {
        context.addIssue({
          code: 'custom',
          path: ['eligibilityRuleCode'],
          message: 'Nhập mã rule điều kiện hợp lệ.',
        })
      }
    } else if (value.eligibilityRuleCode !== '') {
      context.addIssue({
        code: 'custom',
        path: ['eligibilityRuleCode'],
        message: 'Chỉ khai báo mã rule khi chọn RULE_REQUIRED.',
      })
    }
  })

export const categoryListSchema = z
  .array(categorySchema)
  .max(100, 'Tối đa 100 nhóm vé.')
  .superRefine((items, context) => {
    const codes = new Set<string>()
    let regularCount = 0

    items.forEach((item, index) => {
      if (codes.has(item.code)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'code'],
          message: `Mã ${item.code} bị trùng.`,
        })
      }

      codes.add(item.code)

      if (item.pricingRole === 'REGULAR') {
        regularCount++

        if (regularCount > 1) {
          context.addIssue({
            code: 'custom',
            path: [index, 'pricingRole'],
            message: 'Chỉ được có một nhóm REGULAR.',
          })
        }
      }
    })
  })

export type CategoryForm = z.output<typeof categorySchema>

const responseSchema = z.object({
  policy: z.object({
    id: z.string().uuid(),
    cinemaId: z.string().uuid(),
    version: z.number().int().nonnegative(),
    status: z.nativeEnum(CinemaPricingPolicyResponseStatus),
    pricingModel: z.literal('FARE_MATRIX_V2'),
  }),
  ticketCategories: categoryListSchema,
})

type EditorContext = {
  cinemaId: string
  policyId: string
  version: number
}

type SaveInput = EditorContext & {
  ticketCategories: CategoryForm[]
}

export class CategoryEditorError extends Error {
  constructor(
    message: string,
    public readonly requiresReload: boolean,
  ) {
    super(message)
    this.name = 'CategoryEditorError'
  }
}

function saveError(error: unknown): CategoryEditorError {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    if (error.status === 409) {
      return new CategoryEditorError(
        'Policy đã thay đổi hoặc không còn cho sửa. Hãy tải lại policy.',
        true,
      )
    }

    if (error.status === 400 || error.status === 422) {
      return new CategoryEditorError(
        'Backend từ chối danh mục. Kiểm tra mã, vai trò giá và điều kiện.',
        false,
      )
    }

    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return new CategoryEditorError(pricingErrorMessage(error), true)
    }
  }

  return new CategoryEditorError(
    'Chưa xác định được kết quả lưu. Hãy tải lại policy trước khi gửi tiếp.',
    true,
  )
}

export function usePricingCategoriesEditor(
  context: MaybeRefOrGetter<EditorContext>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const query = useQuery({
    queryKey: computed(() => {
      const value = toValue(context)

      return [
        'pricing',
        'admin',
        'category-editor',
        value.cinemaId,
        value.policyId,
        value.version,
      ] as const
    }),
    enabled: computed(() => toValue(enabled)),
    queryFn: async ({ queryKey }) => {
      if (!toValue(enabled)) throw new Error('Không có quyền đọc.')

      const result = responseSchema.parse(
        await getCinemaPricingTicketCategories(queryKey[3], queryKey[4]),
      )

      if (
        result.policy.cinemaId !== queryKey[3] ||
        result.policy.id !== queryKey[4] ||
        result.policy.version !== queryKey[5]
      ) {
        throw new CategoryEditorError(
          'Metadata policy đã thay đổi. Hãy tải lại phần thông tin policy.',
          true,
        )
      }

      return result
    },
    placeholderData: () => undefined,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })

  const save = useMutation({
    retry: false,
    mutationFn: async (input: SaveInput) => {
      if (!toValue(enabled)) {
        throw new CategoryEditorError('Không có quyền lưu.', true)
      }

      const categories = categoryListSchema.parse(input.ticketCategories)

      const request = {
        expectedVersion: input.version,
        ticketCategories: categories.map((item) => ({
          code: item.code,
          name: item.name,
          pricingRole: item.pricingRole,
          eligibilityMode: item.eligibilityMode,
          ...(item.eligibilityMode === 'RULE_REQUIRED'
            ? { eligibilityRuleCode: item.eligibilityRuleCode }
            : {}),
        })),
      } satisfies ReplaceCinemaPricingTicketCategoriesRequest

      let response: unknown

      try {
        response = await replaceCinemaPricingTicketCategories(
          input.cinemaId,
          input.policyId,
          request,
        )
      } catch (error: unknown) {
        throw saveError(error)
      }

      const result = responseSchema.safeParse(response)

      if (
        !result.success ||
        result.data.policy.cinemaId !== input.cinemaId ||
        result.data.policy.id !== input.policyId ||
        result.data.policy.status !== 'DRAFT' ||
        result.data.policy.version <= input.version
      ) {
        throw new CategoryEditorError(
          'Response xác nhận không hợp lệ. Hãy tải lại policy để kiểm tra kết quả.',
          true,
        )
      }

      return result.data
    },
  })

  return { query, save }
}
