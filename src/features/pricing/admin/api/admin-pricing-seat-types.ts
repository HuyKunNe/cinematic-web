import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import {
  getCinemaPricingSeatTypes,
  replaceCinemaPricingSeatTypes,
} from '@/services/api/generated/inventory-service/cinema-pricing-policy-controller/cinema-pricing-policy-controller'
import { CinemaPricingPolicyResponseStatus } from '@/services/api/generated/inventory-service/model/cinemaPricingPolicyResponseStatus'
import { SeatTypeInputMappingStatus } from '@/services/api/generated/inventory-service/model/seatTypeInputMappingStatus'
import { SeatTypeInputPhysicalSeatType } from '@/services/api/generated/inventory-service/model/seatTypeInputPhysicalSeatType'
import type { ReplaceCinemaPricingSeatTypesRequest } from '@/services/api/generated/inventory-service/model/replaceCinemaPricingSeatTypesRequest'
import { pricingErrorMessage } from './admin-pricing-queries'

const seatSchema = z.object({
  id: z.string().uuid(),
  code: z.string().regex(/^[A-Z][A-Z0-9_]{0,63}$/),
  name: z.string().min(1).max(150),
  mappingStatus: z.nativeEnum(SeatTypeInputMappingStatus),
  physicalSeatType: z
    .nativeEnum(SeatTypeInputPhysicalSeatType)
    .nullish()
    .transform((value) => value ?? null),
})

const responseSchema = z.object({
  policy: z.object({
    id: z.string().uuid(),
    cinemaId: z.string().uuid(),
    version: z.number().int().nonnegative(),
    status: z.nativeEnum(CinemaPricingPolicyResponseStatus),
    pricingModel: z.literal('FARE_MATRIX_V2'),
  }),
  seatTypes: z.array(seatSchema).max(100),
})

export const pricingSeatFormSchema = z.object({
  name: z.string().trim().min(1).max(150),
  physicalSeatType: z.nativeEnum(SeatTypeInputPhysicalSeatType),
})

type EditorContext = {
  cinemaId: string
  policyId: string
  version: number
}

type AddSeatInput = EditorContext & z.output<typeof pricingSeatFormSchema>

export class SeatTypeEditorError extends Error {
  constructor(
    message: string,
    public readonly requiresReload: boolean,
  ) {
    super(message)
    this.name = 'SeatTypeEditorError'
  }
}

export function seatTypeErrorMessage(error: unknown): string {
  return error instanceof SeatTypeEditorError ? error.message : pricingErrorMessage(error)
}

export function seatTypeRequiresReload(error: unknown): boolean {
  return error instanceof SeatTypeEditorError && error.requiresReload
}

function mutationError(error: unknown): SeatTypeEditorError {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    if (error.status === 409) {
      return new SeatTypeEditorError(
        'Bản giá đã thay đổi hoặc không còn cho sửa. Hãy tải lại bản giá.',
        true,
      )
    }

    if (error.status === 400 || error.status === 422) {
      return new SeatTypeEditorError(
        'Không thể lưu loại ghế. Kiểm tra tên và bảo đảm loại ghế trong phòng chưa được sử dụng.',
        false,
      )
    }

    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return new SeatTypeEditorError(pricingErrorMessage(error), true)
    }
  }

  return new SeatTypeEditorError(
    'Chưa xác định được kết quả lưu. Hãy tải lại bản giá trước khi lưu tiếp.',
    true,
  )
}

function matchesContext(policy: z.output<typeof responseSchema>['policy'], context: EditorContext) {
  return (
    policy.cinemaId === context.cinemaId &&
    policy.id === context.policyId &&
    policy.version === context.version
  )
}

export function usePricingSeatTypes(
  context: MaybeRefOrGetter<EditorContext>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const query = useQuery({
    queryKey: computed(() => {
      const value = toValue(context)

      return [
        'pricing',
        'admin',
        'seat-types',
        value.cinemaId,
        value.policyId,
        value.version,
      ] as const
    }),
    enabled: computed(() => toValue(enabled)),
    queryFn: async ({ queryKey }) => {
      if (!toValue(enabled)) {
        throw new SeatTypeEditorError('Bạn không có quyền xem loại ghế.', true)
      }

      const result = responseSchema.parse(await getCinemaPricingSeatTypes(queryKey[3], queryKey[4]))

      if (
        !matchesContext(result.policy, {
          cinemaId: queryKey[3],
          policyId: queryKey[4],
          version: queryKey[5],
        })
      ) {
        throw new SeatTypeEditorError(
          'Bản giá đã thay đổi. Hãy tải lại để xem dữ liệu mới nhất.',
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

  const add = useMutation({
    retry: false,
    mutationFn: async (input: AddSeatInput) => {
      const current = query.data.value

      if (
        !toValue(enabled) ||
        !query.isSuccess.value ||
        query.isFetching.value ||
        !current ||
        !matchesContext(current.policy, input) ||
        current.policy.status !== 'DRAFT'
      ) {
        throw new SeatTypeEditorError(
          'Không thể sửa bản giá hiện tại. Hãy tải lại trước khi tiếp tục.',
          true,
        )
      }

      const form = pricingSeatFormSchema.safeParse(input)

      if (!form.success) {
        throw new SeatTypeEditorError('Nhập tên và chọn loại ghế trong phòng chiếu.', false)
      }

      if (current.seatTypes.length >= 100) {
        throw new SeatTypeEditorError('Bản giá đã đạt giới hạn 100 loại ghế.', false)
      }

      if (current.seatTypes.some((item) => item.physicalSeatType === form.data.physicalSeatType)) {
        throw new SeatTypeEditorError('Loại ghế trong phòng này đã được thêm vào bản giá.', false)
      }

      const codes = new Set(current.seatTypes.map((item) => item.code))
      const prefix = `SEAT_${form.data.physicalSeatType}_`
      let index = 1

      while (codes.has(`${prefix}${index}`)) index++

      const code = `${prefix}${index}`

      const request = {
        expectedVersion: input.version,
        seatTypes: [
          ...current.seatTypes.map((item) => ({
            code: item.code,
            name: item.name,
            mappingStatus: item.mappingStatus,
            ...(item.physicalSeatType !== null ? { physicalSeatType: item.physicalSeatType } : {}),
          })),
          {
            code,
            name: form.data.name,
            mappingStatus: SeatTypeInputMappingStatus.CONFIRMED,
            physicalSeatType: form.data.physicalSeatType,
          },
        ],
      } satisfies ReplaceCinemaPricingSeatTypesRequest

      let response: unknown

      try {
        response = await replaceCinemaPricingSeatTypes(input.cinemaId, input.policyId, request)
      } catch (error: unknown) {
        throw mutationError(error)
      }

      const result = responseSchema.safeParse(response)

      if (
        !result.success ||
        result.data.policy.cinemaId !== input.cinemaId ||
        result.data.policy.id !== input.policyId ||
        result.data.policy.status !== 'DRAFT' ||
        result.data.policy.version <= input.version ||
        result.data.seatTypes.length !== request.seatTypes.length ||
        !request.seatTypes.every((expected) =>
          result.data.seatTypes.some(
            (actual) =>
              actual.code === expected.code &&
              actual.name === expected.name &&
              actual.mappingStatus === expected.mappingStatus &&
              actual.physicalSeatType === (expected.physicalSeatType ?? null),
          ),
        )
      ) {
        throw new SeatTypeEditorError(
          'Chưa xác nhận được dữ liệu đã lưu. Hãy tải lại bản giá để kiểm tra.',
          true,
        )
      }

      return result.data
    },
  })

  return { query, add }
}
