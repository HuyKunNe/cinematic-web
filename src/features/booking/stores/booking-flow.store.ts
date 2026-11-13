import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'

export const useBookingFlowStore = defineStore('booking-flow', () => {
  // Explicit payment consent survives the route change, never a reload or a URL flag.
  const paymentIntent = ref<{ owner: string; bookingId: string } | null>(null)
  const auth = useAuthStore()
  watch(
    () => auth.subject,
    () => {
      paymentIntent.value = null
    },
  )

  function requestPayment(owner: string, bookingId: string) {
    paymentIntent.value = { owner, bookingId }
  }

  function consumePayment(owner: string, bookingId: string) {
    if (paymentIntent.value?.owner !== owner || paymentIntent.value.bookingId !== bookingId)
      return false
    paymentIntent.value = null
    return true
  }
  return { paymentIntent, requestPayment, consumePayment }
})
