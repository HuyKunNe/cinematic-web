import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { z } from 'zod'
import { quoteShowtimeSeats } from '@/services/api/generated/inventory-service/showtime-grouped-seat-quote-controller/showtime-grouped-seat-quote-controller'
import { SeatQuoteSeatType } from '@/services/api/generated/inventory-service/model/seatQuoteSeatType'
import { SeatQuoteUnit } from '@/services/api/generated/inventory-service/model/seatQuoteUnit'
import type { ShowtimeGroupedSeatQuoteResponse } from '@/services/api/generated/inventory-service/model/showtimeGroupedSeatQuoteResponse'
import { isBookingUuid } from './booking-queries'

export const MAX_QUOTED_SEATS = 100

const uuid = z.string().uuid()
const positiveInteger = z.number().int().positive()
const money = z
  .number()
  .finite()
  .nonnegative()
  .refine((value) => Number.isSafeInteger(Math.round(value * 100)))

const requestedSeatsSchema = z
  .array(z.string().min(1).max(20))
  .min(1)
  .max(MAX_QUOTED_SEATS)
  .refine((items) => new Set(items).size === items.length)

const quoteSchema = z.object({
  showtimeId: uuid,
  pricingPolicyVersionId: uuid,
  timeBandId: uuid,
  currency: z.literal('VND'),
  serverTime: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  seatCount: positiveInteger.max(MAX_QUOTED_SEATS),
  capacity: positiveInteger,
  totalAmount: money,
  seats: z
    .array(
      z.object({
        showSeatId: uuid,
        seatNumber: z.string().trim().min(1).max(20),
        seatType: z.nativeEnum(SeatQuoteSeatType),
        capacity: positiveInteger,
        ticketGroupId: uuid,
        ticketGroupName: z.string().trim().min(1),
        eligibilityDescription: z
          .string()
          .nullish()
          .transform((value) => value ?? ''),
        unit: z.nativeEnum(SeatQuoteUnit),
        price: money,
      }),
    )
    .min(1)
    .max(MAX_QUOTED_SEATS),
})

export function bookingQuoteSeatKey(value: string): string {
  return value.trim().toUpperCase()
}

function minorAmount(value: number): number {
  return Math.round(value * 100)
}

async function readQuote(showtimeId: string, numbers: string[]) {
  const response = await quoteShowtimeSeats(showtimeId, {
    seats: numbers.map((seatNumber) => ({ seatNumber })),
  })

  const parsed = quoteSchema.parse(response) satisfies ShowtimeGroupedSeatQuoteResponse
  const requested = new Set(numbers)
  const seats = parsed.seats.map((seat) => ({
    ...seat,
    priceMinor: minorAmount(seat.price),
  }))
  const returnedNumbers = seats.map((seat) => bookingQuoteSeatKey(seat.seatNumber))
  const totalMinor = minorAmount(parsed.totalAmount)
  const lineTotal = seats.reduce((sum, seat) => sum + seat.priceMinor, 0)

  if (
    parsed.showtimeId !== showtimeId ||
    parsed.seatCount !== numbers.length ||
    seats.length !== numbers.length ||
    new Set(returnedNumbers).size !== seats.length ||
    new Set(seats.map((seat) => seat.showSeatId)).size !== seats.length ||
    returnedNumbers.some((number) => !requested.has(number)) ||
    seats.some((seat) => seat.unit !== (seat.seatType === 'COUPLE' ? 'PAIR' : 'SEAT')) ||
    parsed.capacity !== seats.reduce((sum, seat) => sum + seat.capacity, 0) ||
    !Number.isSafeInteger(lineTotal) ||
    totalMinor !== lineTotal
  ) {
    throw new Error('Báo giá không khớp các ghế đang chọn. Vui lòng làm mới danh sách ghế.')
  }

  return { ...parsed, seats, totalMinor }
}

export function bookingSeatQuoteErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return 'Dữ liệu báo giá chưa hợp lệ. Vui lòng làm mới danh sách ghế.'
  }

  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
      ? error.status
      : null

  if (status === 409) {
    return 'Ghế hoặc điều kiện đặt vé đã thay đổi. Vui lòng làm mới danh sách ghế rồi chọn lại.'
  }
  if (status === 404) return 'Không tìm thấy suất chiếu hoặc ghế đang chọn.'
  if (error instanceof Error && !(error instanceof TypeError)) return error.message

  return 'Chưa xác nhận được giá vé. Vui lòng làm mới danh sách ghế để thử lại.'
}

export function useBookingSeatQuote(
  showtimeId: MaybeRefOrGetter<string>,
  seatNumbers: MaybeRefOrGetter<string[]>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const requestedSeats = computed(() => toValue(seatNumbers).map(bookingQuoteSeatKey).sort())

  return useQuery({
    queryKey: computed(
      () => ['booking', 'seat-quote', toValue(showtimeId), requestedSeats.value] as const,
    ),
    enabled: computed(
      () =>
        toValue(enabled) && isBookingUuid(toValue(showtimeId)) && requestedSeats.value.length > 0,
    ),
    queryFn: ({ queryKey }) =>
      readQuote(uuid.parse(queryKey[2]), requestedSeatsSchema.parse(queryKey[3])),
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}
