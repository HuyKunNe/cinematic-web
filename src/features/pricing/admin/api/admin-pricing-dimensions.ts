import { toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import { z } from 'zod'
import { replaceCinemaPricingPolicyFareMatrix } from '@/services/api/generated/inventory-service/cinema-pricing-policy-controller/cinema-pricing-policy-controller'
import { DayGroupInputDaysOfWeekItem } from '@/services/api/generated/inventory-service/model/dayGroupInputDaysOfWeekItem'
import type { ReplaceCinemaFareMatrixRequest } from '@/services/api/generated/inventory-service/model/replaceCinemaFareMatrixRequest'
import { useAdminPricingMatrixQuery } from './admin-pricing-matrix-query'
import { pricingErrorMessage } from './admin-pricing-queries'

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Nhập tên hiển thị.')
  .max(150, 'Tên hiển thị không được dài quá 150 ký tự.')

export const dayGroupFormSchema = z
  .object({
    kind: z.literal('day'),
    name: nameSchema,
    daysOfWeek: z
      .array(z.nativeEnum(DayGroupInputDaysOfWeekItem))
      .max(7),
    includesHolidays: z.boolean(),
  })
  .refine(
    (value) => value.daysOfWeek.length > 0 || value.includesHolidays,
    {
      message: 'Chọn ít nhất một thứ trong tuần hoặc chọn áp dụng vào ngày lễ.',
    },
  )

export function clockMinute(value: string): number {
  if (value === '24:00') return 1440
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) return -1

  const [hour, minute] = value.split(':').map(Number)
  return hour! * 60 + minute!
}

export const timeBandFormSchema = z
  .object({
    kind: z.literal('time'),
    name: nameSchema,
    from: z
      .string()
      .regex(
        /^([01][0-9]|2[0-3]):[0-5][0-9]$/,
        'Giờ bắt đầu phải từ 00:00 đến 23:59.',
      ),
    to: z
      .string()
      .regex(
        /^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$/,
        'Giờ kết thúc phải theo dạng HH:mm, tối đa 24:00.',
      ),
  })
  .refine(
    (value) => clockMinute(value.to) > clockMinute(value.from),
    {
      message: 'Giờ kết thúc phải sau giờ bắt đầu trong cùng một ngày.',
    },
  )

type DimensionForm =
  | z.output<typeof dayGroupFormSchema>
  | z.output<typeof timeBandFormSchema>

type EditorContext = {
  cinemaId: string
  policyId: string
  version: number
}

type SaveInput = EditorContext & DimensionForm

const acknowledgementSchema = z.object({
  id: z.string().uuid(),
  cinemaId: z.string().uuid(),
  version: z.number().int().nonnegative(),
  status: z.literal('DRAFT'),
  pricingModel: z.literal('FARE_MATRIX_V2'),
})

export class DimensionEditorError extends Error {
  constructor(
    message: string,
    public readonly requiresReload: boolean,
  ) {
    super(message)
    this.name = 'DimensionEditorError'
  }
}

export function dimensionErrorMessage(error: unknown): string {
  return error instanceof DimensionEditorError
    ? error.message
    : pricingErrorMessage(error)
}

export function dimensionRequiresReload(error: unknown): boolean {
  return error instanceof DimensionEditorError && error.requiresReload
}

function saveError(error: unknown): DimensionEditorError {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    if (error.status === 409) {
      return new DimensionEditorError(
        'Bản giá đã thay đổi hoặc không còn cho sửa. Hãy tải lại bản giá.',
        true,
      )
    }

    if (error.status === 400 || error.status === 422) {
      return new DimensionEditorError(
        'Không thể lưu cấu hình. Kiểm tra nhóm ngày và khung giờ. Nếu thông tin đã đúng, hãy tải lại bản giá để kiểm tra cấu hình đang có.',
        false,
      )
    }

    if (
      error.status === 401 ||
      error.status === 403 ||
      error.status === 404
    ) {
      return new DimensionEditorError(pricingErrorMessage(error), true)
    }
  }

  return new DimensionEditorError(
    'Chưa xác định được kết quả lưu. Hãy tải lại bản giá trước khi lưu tiếp.',
    true,
  )
}

function unusedCode(prefix: string, items: Array<{ code: string }>) {
  const codes = new Set(items.map((item) => item.code))
  let index = 1

  while (codes.has(`${prefix}_${index}`)) index++

  return `${prefix}_${index}`
}

export function usePricingDimensions(
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
        current.policy.status !== 'DRAFT' ||
        current.policy.currency !== 'VND'
      ) {
        throw new DimensionEditorError(
          'Không thể sửa bản giá hiện tại. Hãy tải lại trước khi tiếp tục.',
          true,
        )
      }

      const parsed =
        input.kind === 'day'
          ? dayGroupFormSchema.safeParse(input)
          : timeBandFormSchema.safeParse(input)

      if (!parsed.success) {
        throw new DimensionEditorError(
          parsed.error.issues[0]?.message ?? 'Kiểm tra thông tin đã nhập.',
          false,
        )
      }

      const form = parsed.data

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
          amountVnd: item.amountVnd,
          fareUnit: item.fareUnit,
          priority: item.priority,
          effectiveFrom: item.effectiveFrom,
          ...(item.effectiveTo !== null
            ? { effectiveTo: item.effectiveTo }
            : {}),
        })),
      } satisfies ReplaceCinemaFareMatrixRequest

      if (form.kind === 'day') {
        if (request.dayGroups.length >= 100) {
          throw new DimensionEditorError(
            'Bản giá đã đạt giới hạn 100 nhóm ngày.',
            false,
          )
        }

        request.dayGroups.push({
          code: unusedCode('DAY_GROUP', request.dayGroups),
          name: form.name,
          daysOfWeek: [...new Set(form.daysOfWeek)],
          includesHolidays: form.includesHolidays,
        })
      } else {
        if (request.timeBands.length >= 100) {
          throw new DimensionEditorError(
            'Bản giá đã đạt giới hạn 100 khung giờ.',
            false,
          )
        }

        request.timeBands.push({
          code: unusedCode('TIME_BAND', request.timeBands),
          name: form.name,
          fromMinute: clockMinute(form.from),
          toMinute: clockMinute(form.to),
        })
      }

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
        throw new DimensionEditorError(
          'Chưa xác nhận được kết quả lưu. Hãy tải lại bản giá để kiểm tra.',
          true,
        )
      }

      return result.data
    },
  })

  return { query, save }
}