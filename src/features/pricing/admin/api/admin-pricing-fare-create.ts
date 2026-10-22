import { toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { z } from 'zod'
import { replaceCinemaPricingPolicyFareMatrix } from '@/services/api/generated/inventory-service/cinema-pricing-policy-controller/cinema-pricing-policy-controller'
import { FareRuleInputExperienceType } from '@/services/api/generated/inventory-service/model/fareRuleInputExperienceType'
import { FareRuleInputContentFormat } from '@/services/api/generated/inventory-service/model/fareRuleInputContentFormat'
import { FareRuleInputFareUnit } from '@/services/api/generated/inventory-service/model/fareRuleInputFareUnit'
import { FareRuleInputAdvanceScreeningCondition } from '@/services/api/generated/inventory-service/model/fareRuleInputAdvanceScreeningCondition'
import type { FareRuleInput } from '@/services/api/generated/inventory-service/model/fareRuleInput'
import type { ReplaceCinemaFareMatrixRequest } from '@/services/api/generated/inventory-service/model/replaceCinemaFareMatrixRequest'
import { useAdminPricingMatrixQuery } from './admin-pricing-matrix-query'
import { pricingErrorMessage } from './admin-pricing-queries'

export const fareCreateSchema = z.object({
  dayGroupCode: z.string().min(1, 'Chọn nhóm ngày.'),
  timeBandCode: z.string().min(1, 'Chọn khung giờ.'),
  seatTypeCode: z.string().min(1, 'Chọn loại ghế.'),
  contentFormat: z.nativeEnum(FareRuleInputContentFormat),
  advanceScreeningCondition: z
    .nativeEnum(FareRuleInputAdvanceScreeningCondition)
    .refine((value) => value !== 'ANY', 'Chọn suất chiếu thông thường hoặc suất chiếu sớm.'),
  fareUnit: z
    .nativeEnum(FareRuleInputFareUnit)
    .refine((value) => value !== 'UNCONFIRMED', 'Xác nhận giá tính theo mỗi vé hoặc mỗi cặp.'),
  amountVnd: z
    .string()
    .trim()
    .regex(
      /^(0|[1-9][0-9]{0,18})$/,
      'Nhập số tiền nguyên không âm, không dùng dấu chấm hoặc dấu phẩy.',
    )
    .refine(
      (value) => value.length < 19 || value <= '9223372036854775807',
      'Số tiền vượt giới hạn hệ thống.',
    ),
})

type EditorContext = {
  cinemaId: string
  policyId: string
  version: number
  categoryCode: string
}

type SaveInput = EditorContext & z.output<typeof fareCreateSchema>

const acknowledgementSchema = z.object({
  id: z.string().uuid(),
  cinemaId: z.string().uuid(),
  version: z.number().int().nonnegative(),
  status: z.literal('DRAFT'),
  pricingModel: z.literal('FARE_MATRIX_V2'),
})

export class FareCreateError extends Error {
  constructor(
    message: string,
    public readonly requiresReload: boolean,
  ) {
    super(message)
    this.name = 'FareCreateError'
  }
}

export function fareCreateErrorMessage(error: unknown): string {
  return error instanceof FareCreateError ? error.message : pricingErrorMessage(error)
}

export function fareCreateRequiresReload(error: unknown): boolean {
  return error instanceof FareCreateError && error.requiresReload
}

function saveError(error: unknown): FareCreateError {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    if (error.status === 409) {
      return new FareCreateError(
        'Bản giá đã thay đổi hoặc không còn cho sửa. Hãy tải lại bản giá.',
        true,
      )
    }

    if (error.status === 400 || error.status === 422) {
      return new FareCreateError(
        'Hệ thống chưa chấp nhận mức giá. Kiểm tra số tiền, ngày, giờ và loại ghế đã chọn.',
        false,
      )
    }

    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return new FareCreateError(pricingErrorMessage(error), true)
    }
  }

  return new FareCreateError(
    'Chưa xác định được kết quả lưu. Hãy tải lại bản giá trước khi gửi tiếp.',
    true,
  )
}

export function usePricingFareCreate(
  context: MaybeRefOrGetter<EditorContext>,
  enabled: MaybeRefOrGetter<boolean>,
  canEdit: MaybeRefOrGetter<boolean>,
) {
  const query = useAdminPricingMatrixQuery(context, enabled)

  const save = useMutation({
    retry: false,
    mutationFn: async (input: SaveInput) => {
      const current = query.data.value
      const active = toValue(context)

      if (
        !toValue(enabled) ||
        !toValue(canEdit) ||
        !query.isSuccess.value ||
        query.isFetching.value ||
        !current ||
        current.policy.id !== input.policyId ||
        current.policy.cinemaId !== input.cinemaId ||
        current.policy.version !== input.version ||
        active.policyId !== input.policyId ||
        active.cinemaId !== input.cinemaId ||
        active.version !== input.version ||
        active.categoryCode !== input.categoryCode ||
        current.policy.status !== 'DRAFT' ||
        current.policy.currency !== 'VND'
      ) {
        throw new FareCreateError(
          'Không thể sửa bản giá hiện tại. Hãy tải lại trước khi tiếp tục.',
          true,
        )
      }

      const category = current.ticketCategories.find((item) => item.code === input.categoryCode)

      if (!category) {
        throw new FareCreateError(
          'Không tìm thấy nhóm vé trong bản giá hiện tại. Hãy tải lại bản giá.',
          true,
        )
      }

      if (category?.pricingRole !== 'REGULAR' || category.eligibilityMode !== 'UNRESTRICTED') {
        throw new FareCreateError(
          'Chọn vé thông thường dành cho tất cả khách để thêm mức giá.',
          false,
        )
      }

      const parsed = fareCreateSchema.safeParse(input)

      if (!parsed.success) {
        throw new FareCreateError(
          parsed.error.issues[0]?.message ?? 'Kiểm tra thông tin đã nhập.',
          false,
        )
      }

      const form = parsed.data
      const day = current.dayGroups.find((item) => item.code === form.dayGroupCode)
      const time = current.timeBands.find((item) => item.code === form.timeBandCode)
      const seat = current.seatTypes.find((item) => item.code === form.seatTypeCode)

      if (!day || !time || !seat || seat.mappingStatus !== 'CONFIRMED' || !seat.physicalSeatType) {
        throw new FareCreateError('Chọn nhóm ngày, khung giờ và loại ghế đã được xác định.', false)
      }

      const expectedUnit = seat.physicalSeatType === 'COUPLE' ? 'PER_PAIR' : 'PER_TICKET'

      if (form.fareUnit !== expectedUnit) {
        throw new FareCreateError(
          seat.physicalSeatType === 'COUPLE'
            ? 'Xác nhận số tiền áp dụng cho cả cặp ghế đôi.'
            : 'Xác nhận số tiền áp dụng cho mỗi vé.',
          false,
        )
      }

      if (current.fareRules.length >= 2000) {
        throw new FareCreateError('Bản giá đã đạt giới hạn 2.000 mức giá.', false)
      }

      // Round này chỉ thêm giá cơ bản, không tạo ngoại lệ ưu tiên.
      // Chặn vùng ngày/giờ đã có giá cho cùng loại vé và ghế.
      const overlaps = current.fareRules.some((rule) => {
        if (
          rule.ticketCategoryCode !== input.categoryCode ||
          rule.seatTypeCode !== form.seatTypeCode ||
          rule.experienceType !== 'STANDARD' ||
          rule.contentFormat !== form.contentFormat ||
          (rule.advanceScreeningCondition !== 'ANY' &&
            rule.advanceScreeningCondition !== form.advanceScreeningCondition)
        ) {
          return false
        }

        const otherDay = current.dayGroups.find((item) => item.code === rule.dayGroupCode)
        const otherTime = current.timeBands.find((item) => item.code === rule.timeBandCode)

        if (!otherDay || !otherTime) {
          throw new FareCreateError(
            'Cấu hình giá đang có tham chiếu không hợp lệ. Hãy tải lại và kiểm tra bản giá.',
            true,
          )
        }

        const sameDays =
          (day.includesHolidays && otherDay.includesHolidays) ||
          day.daysOfWeek.some((value) => otherDay.daysOfWeek.includes(value))

        const sameTimes =
          Math.max(time.fromMinute, otherTime.fromMinute) <
          Math.min(time.toMinute, otherTime.toMinute)

        return sameDays && sameTimes
      })

      if (overlaps) {
        throw new FareCreateError(
          'Đã có mức giá giao với ngày và giờ này cho cùng loại vé, loại ghế và hình thức chiếu. Hãy chọn phạm vi khác.',
          false,
        )
      }

      const codes = new Set(current.fareRules.map((item) => item.code))
      let index = 1
      while (codes.has(`FARE_${index}`)) index++

      const newRule = {
        code: `FARE_${index}`,
        experienceType: FareRuleInputExperienceType.STANDARD,
        contentFormat: form.contentFormat,
        dayGroupCode: day.code,
        timeBandCode: time.code,
        ticketCategoryCode: category.code,
        seatTypeCode: seat.code,
        advanceScreeningCondition: form.advanceScreeningCondition,
        amountVnd: form.amountVnd,
        fareUnit: form.fareUnit,
        priority: 0,
        effectiveFrom: current.policy.effectiveFrom,
        ...(current.policy.effectiveTo !== null ? { effectiveTo: current.policy.effectiveTo } : {}),
      } satisfies FareRuleInput

      const request = {
        expectedVersion: input.version,
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
        fareRules: [
          ...current.fareRules.map((item) => ({
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
            amountVnd: item.amountVnd,
            fareUnit: item.fareUnit,
            priority: item.priority,
            effectiveFrom: item.effectiveFrom,
            ...(item.effectiveTo !== null ? { effectiveTo: item.effectiveTo } : {}),
          })),
          newRule,
        ],
      } satisfies ReplaceCinemaFareMatrixRequest

      let response: unknown

      try {
        response = await replaceCinemaPricingPolicyFareMatrix(
          input.cinemaId,
          input.policyId,
          request,
        )
      } catch (error: unknown) {
        throw saveError(error)
      }

      const result = acknowledgementSchema.safeParse(response)

      if (
        !result.success ||
        result.data.id !== input.policyId ||
        result.data.cinemaId !== input.cinemaId ||
        result.data.version <= input.version
      ) {
        throw new FareCreateError(
          'Chưa xác nhận được kết quả lưu. Hãy tải lại bản giá để kiểm tra.',
          true,
        )
      }

      return result.data
    },
  })

  return { query, save }
}
