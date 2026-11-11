<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSessionStorage } from '@vueuse/core'
import { useQueryClient } from '@tanstack/vue-query'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from 'vue-router'
import { z } from 'zod'
import AppButton from '@/components/ui/AppButton.vue'
import AppLink from '@/components/ui/AppLink.vue'
import { useAuthStore } from '@/stores/auth.store'
import { ROUTE_NAMES } from '@/router/route-constants'
import { submitCustomerBooking, customerBookingError } from '../api/customer-bookings'
import BookingReviewDialog from './BookingReviewDialog.vue'
import type { BookingReview } from '../models/booking-review.model'

const props = defineProps<{
  review?: BookingReview
  showtimeId: string
  seatNumbers: string[]
  totalAmount?: number
  disabled: boolean
}>()
const emit = defineEmits<{ locked: [value: boolean]; rejected: [] }>()
const auth = useAuthStore()
const owner = auth.subject ?? ''
const router = useRouter()
const queries = useQueryClient()
const storageKey = `cinematic:booking-request:${owner}:${props.showtimeId}`
// Save only the idempotent request so refresh/network retries cannot create another order.
const requestSchema = z.object({
  clientRequestId: z.string().uuid(),
  showtimeId: z.literal(props.showtimeId),
  seatNumbers: z.array(z.string().min(1).max(20)).min(1).max(100),
  expectedTotalAmount: z.number().finite().nonnegative(),
})
const stored = useSessionStorage(storageKey, '')
const checkpoint = computed(() => {
  try {
    return requestSchema.parse(JSON.parse(stored.value))
  } catch {
    return null
  }
})
const sending = ref(false)
const resolved = ref(false)
const resolvedBookingId = ref('')
const error = ref('')
const reviewing = ref(false)
const reviewed = ref<BookingReview | null>(null)
const fingerprint = (value: BookingReview | null | undefined) => JSON.stringify(value)
function continueBooking() {
  if (checkpoint.value) {
    void submit()
    return
  }
  if (props.disabled || !props.review || sending.value || resolved.value) return
  error.value = ''
  reviewed.value = props.review
  reviewing.value = true
}
function invalidateReview() {
  if (!reviewing.value) return
  reviewing.value = false
  reviewed.value = null
  error.value = 'Ghế hoặc báo giá đã thay đổi. Vui lòng kiểm tra lại đơn trước khi xác nhận.'
}
watch(
  () => props.review,
  (current) => {
    if (current && fingerprint(current) !== fingerprint(reviewed.value)) invalidateReview()
  },
)
watch(() => props.seatNumbers.slice().sort().join('|'), invalidateReview)
const blocked = computed(() => sending.value || !!checkpoint.value || resolved.value)
onBeforeRouteLeave(() => !sending.value || resolved.value)
onBeforeRouteUpdate(() => !sending.value || resolved.value)
watch(blocked, (value) => emit('locked', value), { immediate: true, flush: 'sync' })
async function submit() {
  if (sending.value || resolved.value || !owner || !auth.isAuthenticated || auth.subject !== owner)
    return
  if (!checkpoint.value) {
    if (props.disabled || !props.seatNumbers.length || props.totalAmount === undefined) return
    if (
      !reviewing.value ||
      !props.review ||
      fingerprint(props.review) !== fingerprint(reviewed.value)
    )
      return
    const request = requestSchema.parse({
      clientRequestId: crypto.randomUUID(),
      showtimeId: props.showtimeId,
      seatNumbers: [...props.seatNumbers].sort(),
      expectedTotalAmount: props.totalAmount,
    })
    stored.value = JSON.stringify(request)
  }
  const request = checkpoint.value
  if (!request) return
  reviewing.value = false
  sending.value = true
  error.value = ''
  try {
    const booking = await submitCustomerBooking(request, owner)
    if (!auth.isAuthenticated || auth.subject !== owner) return
    resolved.value = true
    resolvedBookingId.value = booking.id
    stored.value = ''
    queries.setQueryData(['customer-bookings', owner, 'detail', booking.id], booking)
    await queries.invalidateQueries({ queryKey: ['customer-bookings', owner], refetchType: 'none' })
    const failure = await router.push({
      name: ROUTE_NAMES.ACCOUNT_BOOKINGS,
      query: { bookingId: booking.id },
    })
    if (failure) error.value = 'Đơn đã được tiếp nhận. Mở chi tiết đơn để theo dõi kết quả giữ ghế.'
  } catch (cause) {
    if (resolved.value) error.value = 'Đơn đã tạo. Mở Vé của tôi để xem kết quả.'
    else {
      const status = (cause as { status?: number })?.status
      // Only definite validation rejections release the request. Unknown outcomes keep the same key.
      if (status && [400, 403, 404, 422].includes(status)) {
        stored.value = ''
        emit('rejected')
      }
      error.value = checkpoint.value
        ? 'Chưa xác nhận được kết quả. Gửi lại cùng yêu cầu hoặc kiểm tra Vé của tôi; không đặt lại bằng yêu cầu mới.'
        : customerBookingError(cause)
    }
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="booking-checkout">
    <p v-if="error" class="booking-error" role="alert">{{ error }}</p>
    <p v-else-if="checkpoint" class="booking-notice" role="status">
      Có yêu cầu đặt vé cần xác nhận kết quả. Lựa chọn đã khóa để tránh tạo trùng đơn.
    </p>
    <AppButton
      v-if="!resolved"
      :loading="sending"
      :disabled="sending || (!checkpoint && disabled)"
      @click="continueBooking"
      >{{ checkpoint ? 'Gửi lại cùng yêu cầu' : 'Tiếp tục · Kiểm tra đơn' }}</AppButton
    >
    <AppLink :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS }">Vé của tôi</AppLink>
    <AppLink
      v-if="resolvedBookingId"
      :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS, query: { bookingId: resolvedBookingId } }"
    >
      Theo dõi đơn vừa tạo
    </AppLink>
    <BookingReviewDialog
      :open="reviewing"
      :review="reviewed"
      :disabled="disabled || sending"
      @close="reviewing = false"
      @confirm="submit"
    />
  </div>
</template>

<style scoped>
.booking-checkout {
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
</style>
