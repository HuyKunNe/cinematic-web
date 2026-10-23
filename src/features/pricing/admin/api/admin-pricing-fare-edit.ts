import { toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { z } from 'zod'
import { replaceCinemaPricingPolicyFareMatrix } from '@/services/api/generated/inventory-service/cinema-pricing-policy-controller/cinema-pricing-policy-controller'
import type { ReplaceCinemaFareMatrixRequest } from '@/services/api/generated/inventory-service/model/replaceCinemaFareMatrixRequest'
import type { useAdminPricingMatrixQuery } from './admin-pricing-matrix-query'
import { fareCreateSchema } from './admin-pricing-fare-create'
import { pricingErrorMessage } from './admin-pricing-queries'

type Matrix = NonNullable<ReturnType<typeof useAdminPricingMatrixQuery>['data']['value']>

type EditContext = {
  matrix: Matrix
  categoryCode: string
}

const editSchema = z.object({
  cinemaId: z.string().uuid(),
  policyId: z.string().uuid(),
  version: z.number().int().nonnegative(),
  categoryCode: z.string().min(1),
  changes: z
    .array(
      z.object({
        code: z.string().min(1),
        amountVnd: fareCreateSchema.shape.amountVnd,
      }),
    )
    .min(1)
    .max(2000),
})

type EditInput = z.input<typeof editSchema>

const acknowledgementSchema = z.object({
  id: z.string().uuid(),
  cinemaId: z.string().uuid(),
  version: z.number().int().nonnegative(),
  status: z.literal('DRAFT'),
  pricingModel: z.literal('FARE_MATRIX_V2'),
})

export class FareEditError extends Error {
  constructor(
    message: string,
    public readonly requiresReload = false,
  ) {
    super(message)
    this.name = 'FareEditError'
  }
}

export function fareEditErrorMessage(error: unknown): string {
  return error instanceof FareEditError ? error.message : pricingErrorMessage(error)
}

export function fareEditRequiresReload(error: unknown): boolean {
  return error instanceof FareEditError && error.requiresReload
}

export function normalizeFareAmount(value: string): string | null {
  const text = value.trim()

  // Chấp nhận 55000 hoặc 55.000; không chấp nhận số thập phân.
  if (!/^(?:0|[1-9][0-9]*|[1-9][0-9]{0,2}(?:\.[0-9]{3})+)$/.test(text)) {
    return null
  }

  const parsed = fareCreateSchema.shape.amountVnd.safeParse(text.replace(/\./g, ''))

  return parsed.success ? parsed.data : null
}

function saveError(error: unknown): FareEditError {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    if (error.status === 409) {
      return new FareEditError(
        'Bản giá đã thay đổi hoặc không còn cho sửa. Hãy tải lại bản giá.',
        true,
      )
    }

    if (error.status === 400 || error.status === 422) {
      return new FareEditError(
        'Chưa lưu được giá. Kiểm tra số tiền và thông tin áp dụng của các mức giá.',
      )
    }

    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return new FareEditError(pricingErrorMessage(error), true)
    }
  }

  return new FareEditError(
    'Chưa xác định được kết quả lưu. Hãy tải lại bản giá trước khi gửi tiếp.',
    true,
  )
}

export function usePricingFareEdit(
  context: MaybeRefOrGetter<EditContext>,
  enabled: MaybeRefOrGetter<boolean>,
  canEdit: MaybeRefOrGetter<boolean>,
) {
  return useMutation({
    retry: false,
    mutationFn: async (input: EditInput) => {
      const parsed = editSchema.safeParse(input)

      if (!parsed.success) {
        throw new FareEditError('Kiểm tra các số tiền cần lưu.')
      }

      const data = parsed.data
      const active = toValue(context)
      const current = active.matrix

      if (
        !toValue(enabled) ||
        !toValue(canEdit) ||
        current.policy.id !== data.policyId ||
        current.policy.cinemaId !== data.cinemaId ||
        current.policy.version !== data.version ||
        active.categoryCode !== data.categoryCode ||
        current.policy.status !== 'DRAFT' ||
        current.policy.currency !== 'VND'
      ) {
        throw new FareEditError(
          'Không thể sửa bản giá hiện tại. Hãy tải lại trước khi tiếp tục.',
          true,
        )
      }

      const category = current.ticketCategories.find((item) => item.code === data.categoryCode)

      if (
        !category ||
        category.pricingRole === 'UNCONFIRMED' ||
        category.eligibilityMode === 'UNCONFIRMED'
      ) {
        throw new FareEditError('Cần xác định đầy đủ loại vé trước khi sửa giá.')
      }

      const changes = new Map(data.changes.map((item) => [item.code, item.amountVnd]))

      if (changes.size !== data.changes.length) {
        throw new FareEditError('Danh sách thay đổi có mức giá bị lặp.')
      }

      for (const code of changes.keys()) {
        const fare = current.fareRules.find(
          (item) => item.code === code && item.ticketCategoryCode === data.categoryCode,
        )

        const seat = fare
          ? current.seatTypes.find((item) => item.code === fare.seatTypeCode)
          : undefined

        if (
          !fare ||
          !seat ||
          seat.mappingStatus !== 'CONFIRMED' ||
          !seat.physicalSeatType ||
          fare.advanceScreeningCondition === 'ANY' ||
          fare.fareUnit !== (seat.physicalSeatType === 'COUPLE' ? 'PER_PAIR' : 'PER_TICKET')
        ) {
          throw new FareEditError(
            'Có mức giá chưa xác định đầy đủ loại ghế hoặc cách tính. Hãy kiểm tra lại.',
          )
        }
      }

      const request = {
        expectedVersion: data.version,
        dayGroups: current.dayGroups.map((item) => ({
          code: item.code,
          name: item.name,
          daysOfWeek: [...item.daysOfWeek],
          includesHolidays: item.includesHolidays,
        })),
        timeBands: current.timeBands.map((item) => ({
          code: item.code,
          name: item.name,
          fromMinute: item.fromMinute,
          toMinute: item.toMinute,
        })),
        fareRules: current.fareRules.map((item) => ({
          code: item.code,
          experienceType: item.experienceType,
          contentFormat: item.contentFormat,
          dayGroupCode: item.dayGroupCode,
          timeBandCode: item.timeBandCode,
          ticketCategoryCode: item.ticketCategoryCode,
          seatTypeCode: item.seatTypeCode,
          advanceScreeningCondition: item.advanceScreeningCondition,
          ...(item.requiredEligibilityCode !== null
            ? { requiredEligibilityCode: item.requiredEligibilityCode }
            : {}),
          amountVnd: changes.get(item.code) ?? item.amountVnd,
          fareUnit: item.fareUnit,
          priority: item.priority,
          effectiveFrom: item.effectiveFrom,
          ...(item.effectiveTo !== null ? { effectiveTo: item.effectiveTo } : {}),
        })),
      } satisfies ReplaceCinemaFareMatrixRequest

      let response: unknown

      try {
        response = await replaceCinemaPricingPolicyFareMatrix(data.cinemaId, data.policyId, request)
      } catch (error: unknown) {
        throw saveError(error)
      }

      const result = acknowledgementSchema.safeParse(response)

      if (
        !result.success ||
        result.data.id !== data.policyId ||
        result.data.cinemaId !== data.cinemaId ||
        result.data.version <= data.version
      ) {
        throw new FareEditError(
          'Chưa xác nhận được kết quả lưu. Hãy tải lại bản giá để kiểm tra.',
          true,
        )
      }

      return result.data
    },
  })
}
