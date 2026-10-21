import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import { getCinemaPricingPolicyFareMatrix } from '@/services/api/generated/inventory-service/cinema-pricing-policy-controller/cinema-pricing-policy-controller'
import { MatrixFareRuleResponseExperienceType } from '@/services/api/generated/inventory-service/model/matrixFareRuleResponseExperienceType'
import { MatrixFareRuleResponseContentFormat } from '@/services/api/generated/inventory-service/model/matrixFareRuleResponseContentFormat'
import { MatrixFareRuleResponseFareUnit } from '@/services/api/generated/inventory-service/model/matrixFareRuleResponseFareUnit'
import { MatrixFareRuleResponseAdvanceScreeningCondition } from '@/services/api/generated/inventory-service/model/matrixFareRuleResponseAdvanceScreeningCondition'

const uuid = z.string().uuid()
const code = z.string().trim().min(1)

const matrixSchema = z.object({
  policy: z.object({
    id: uuid,
    cinemaId: uuid,
    version: z.number().int().nonnegative(),
    pricingModel: z.literal('FARE_MATRIX_V2'),
    currency: code,
    timeZone: code,
  }),
  dayGroups: z.array(
    z.object({
      id: uuid,
      code,
      name: code,
    }),
  ),
  timeBands: z.array(
    z.object({
      id: uuid,
      code,
      name: code,
      fromMinute: z.number().int().min(0).max(1439),
      toMinute: z.number().int().min(1).max(1440),
    }),
  ),
  fareRules: z.array(
    z.object({
      id: uuid,
      code,
      experienceType: z.nativeEnum(MatrixFareRuleResponseExperienceType),
      contentFormat: z.nativeEnum(MatrixFareRuleResponseContentFormat),
      dayGroupCode: code,
      timeBandCode: code,
      ticketCategoryCode: code,
      seatTypeCode: code,
      advanceScreeningCondition: z.nativeEnum(MatrixFareRuleResponseAdvanceScreeningCondition),
      requiredEligibilityCode: code.nullable(),
      amountVnd: z.string().regex(/^(0|[1-9][0-9]*)$/),
      fareUnit: z.nativeEnum(MatrixFareRuleResponseFareUnit),
      priority: z.number().int(),
      effectiveFrom: z.string().date(),
      effectiveTo: z.string().date().nullable(),
    }),
  ),
})

type MatrixContext = {
  cinemaId: string
  policyId: string
  version: number
}

export function useAdminPricingMatrixQuery(
  context: MaybeRefOrGetter<MatrixContext>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(() => {
      const value = toValue(context)

      return ['pricing', 'admin', 'matrix', value.cinemaId, value.policyId, value.version] as const
    }),
    enabled: computed(() => {
      const value = toValue(context)

      return (
        toValue(enabled) &&
        uuid.safeParse(value.cinemaId).success &&
        uuid.safeParse(value.policyId).success &&
        Number.isSafeInteger(value.version) &&
        value.version >= 0
      )
    }),
    queryFn: async ({ queryKey }) => {
      if (!toValue(enabled)) {
        throw new Error('Không có quyền xem ma trận.')
      }

      const cinemaId = uuid.parse(queryKey[3])
      const policyId = uuid.parse(queryKey[4])
      const expectedVersion = queryKey[5]

      const result = matrixSchema.parse(await getCinemaPricingPolicyFareMatrix(cinemaId, policyId))

      if (
        result.policy.cinemaId !== cinemaId ||
        result.policy.id !== policyId ||
        result.policy.version !== expectedVersion
      ) {
        throw new Error('Metadata chính sách đã thay đổi hoặc không khớp.')
      }

      for (const items of [result.dayGroups, result.timeBands, result.fareRules]) {
        if (
          new Set(items.map((item) => item.id)).size !== items.length ||
          new Set(items.map((item) => item.code)).size !== items.length
        ) {
          throw new Error('Cấu hình trả về chứa mã trùng.')
        }
      }

      return result
    },
    placeholderData: () => undefined,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    retry: false,
  })
}
