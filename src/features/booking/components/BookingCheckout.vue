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

const props = defineProps<{
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
const error = ref('')
const blocked = computed(() => sending.value || !!checkpoint.value || resolved.value)
onBeforeRouteLeave(() => !sending.value || resolved.value)
onBeforeRouteUpdate(() => !sending.value || resolved.value)
watch(blocked, (value) => emit('locked', value), { immediate: true, flush: 'sync' })
async function submit() {
  if (sending.value || resolved.value || !owner || !auth.isAuthenticated || auth.subject !== owner)
    return
  if (!checkpoint.value) {
    if (props.disabled || !props.seatNumbers.length || props.totalAmount === undefined) return
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
  sending.value = true
  error.value = ''
  try {
    const booking = await submitCustomerBooking(request, owner)
    if (!auth.isAuthenticated || auth.subject !== owner) return
    resolved.value = true
    stored.value = ''
    await queries.invalidateQueries({ queryKey: ['customer-bookings', owner], refetchType: 'none' })
    await router.push({ name: ROUTE_NAMES.ACCOUNT_BOOKINGS, query: { bookingId: booking.id } })
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
      @click="submit"
      >{{ checkpoint ? 'Gửi lại cùng yêu cầu' : 'Xác nhận đặt vé' }}</AppButton
    >
    <AppLink :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS }">Vé của tôi</AppLink>
  </div>
</template>

<style scoped>
.booking-checkout {
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
</style>
