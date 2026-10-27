import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import { quote } from '@/services/api/generated/inventory-service/pricing-fare-quote-controller/pricing-fare-quote-controller'
import {
  CellResponseUnit,
  PricingFareQuoteResponseDayGroup,
  QuotePricingFareRequestContentFormat,
  QuotePricingFareRequestExperienceType,
  QuotePricingFareRequestSeatType,
  type QuotePricingFareRequest,
} from '@/services/api/generated/inventory-service/model'
import {
  pricingCellSchema,
  pricingContainsMinute,
  pricingErrorMessage,
  type PricingContext,
  type PricingMatrix,
  type PricingPolicy,
} from './admin-pricing-queries'

const uuid = z.string().uuid()

export const publishedQuoteFormSchema = z.object({
  cinemaId: uuid,
  date: z.string().date(),
  time: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/),
  experienceType: z.nativeEnum(QuotePricingFareRequestExperienceType),
  contentFormat: z.nativeEnum(QuotePricingFareRequestContentFormat),
  seatType: z.nativeEnum(QuotePricingFareRequestSeatType),
  ticketGroupId: z.union([uuid, z.literal('')]),
})

const requestSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  experienceType: z.nativeEnum(QuotePricingFareRequestExperienceType),
  contentFormat: z.nativeEnum(QuotePricingFareRequestContentFormat),
  seatType: z.nativeEnum(QuotePricingFareRequestSeatType),
  ticketGroupId: uuid.optional(),
})

const responseSchema = z.object({
  policyId: uuid,
  policyVersionId: uuid,
  revision: z.number().int().positive(),
  cinemaId: uuid,
  cinemaTimeZone: z.string().min(1),
  localStartsAt: z.string().datetime({ offset: true }),
  dayGroup: z.nativeEnum(PricingFareQuoteResponseDayGroup),
  capacityPerUnit: z.number().int().positive(),
  fare: pricingCellSchema.extend({
    state: z.literal('PRICED'),
    amount: z.number().finite().nonnegative(),
  }),
})

export type PublishedPricingQuoteInput = {
  context: PricingContext
  request: QuotePricingFareRequest
  revision: number
  dayGroup: PricingPolicy['dayGroup']
  unit: CellResponseUnit
  capacityPerUnit: number
  timeBands: PricingMatrix['timeBands']
  defaultTicketGroupId: string
}

export function pricingQuoteErrorCode(error: unknown): string | null {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
    ? error.code
    : null
}

export function pricingQuoteErrorMessage(error: unknown): string {
  const code = pricingQuoteErrorCode(error)

  if (code === 'INVENTORY_PRICING_FARE_NOT_APPLICABLE') {
    return 'Bảng giá không áp dụng cho giờ chiếu hoặc tổ hợp đã chọn.'
  }
  if (code === 'INVENTORY_PRICING_POLICY_VERSION_NOT_PUBLISHED') {
    return 'Phiên bản này chưa được công bố. Hãy tải lại danh sách.'
  }
  if (code === 'INVENTORY_PRICING_POLICY_DATA_INCONSISTENT') {
    return 'Dữ liệu bảng giá chưa nhất quán. Hãy tải lại và kiểm tra phiên bản.'
  }
  if (code === 'INVENTORY_CINEMA_TIME_ZONE_INVALID') {
    return 'Múi giờ của cụm rạp không hợp lệ. Cần cập nhật cấu hình cụm rạp.'
  }
  if (code === 'INVENTORY_INVALID_PRICING_FARE_QUOTE') {
    return 'Thông tin tra giá chưa hợp lệ. Kiểm tra ngày, giờ và tổ hợp đã chọn.'
  }

  return pricingErrorMessage(error)
}

function localMinute(startsAt: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(startsAt))

  const hour = Number(parts.find((item) => item.type === 'hour')?.value)
  const minute = Number(parts.find((item) => item.type === 'minute')?.value)

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error('Không xác nhận được giờ địa phương của kết quả tra giá.')
  }

  return hour * 60 + minute
}

export function useAdminPublishedPricingQuote(
  input: MaybeRefOrGetter<PublishedPricingQuoteInput | null>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  return useQuery({
    queryKey: computed(() => ['pricing', 'admin', 'published-quote', toValue(input)] as const),
    enabled: computed(() => toValue(enabled) && toValue(input) !== null),
    queryFn: async ({ queryKey }) => {
      if (!toValue(enabled)) throw new Error('Bạn không có quyền tra giá.')

      const selected = queryKey[3]
      if (!selected) throw new Error('Chưa chọn đủ thông tin tra giá.')

      const context: PricingContext = {
        cinemaId: uuid.parse(selected.context.cinemaId),
        policyId: uuid.parse(selected.context.policyId),
        versionId: uuid.parse(selected.context.versionId),
      }
      const request = requestSchema.parse(selected.request) satisfies QuotePricingFareRequest
      const response = responseSchema.parse(
        await quote(context.cinemaId, context.policyId, context.versionId, request),
      )

      const bands = selected.timeBands.filter((band) =>
        pricingContainsMinute(band, localMinute(request.startsAt, response.cinemaTimeZone)),
      )
      const expectedGroup = request.ticketGroupId ?? selected.defaultTicketGroupId

      if (
        response.cinemaId !== context.cinemaId ||
        response.policyId !== context.policyId ||
        response.policyVersionId !== context.versionId ||
        response.revision !== selected.revision ||
        response.dayGroup !== selected.dayGroup ||
        response.fare.experienceType !== request.experienceType ||
        response.fare.contentFormat !== request.contentFormat ||
        response.fare.ticketGroupId !== expectedGroup ||
        response.fare.seatType !== request.seatType ||
        response.fare.unit !== selected.unit ||
        response.capacityPerUnit !== selected.capacityPerUnit ||
        Date.parse(response.localStartsAt) !== Date.parse(request.startsAt) ||
        bands.length !== 1 ||
        bands[0]?.id !== response.fare.timeBandId
      ) {
        throw new Error('Kết quả tra giá không khớp phiên bản, giờ chiếu hoặc tổ hợp đã chọn.')
      }

      return response
    },
    placeholderData: () => undefined,
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
