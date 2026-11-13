import { computed } from 'vue'
import { useSessionStorage } from '@vueuse/core'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth.store'

// Client selection only: this is neither a seat hold nor a saved booking.
export function useBookingSelection(showtimeId: string) {
  const auth = useAuthStore()
  const owner = auth.subject
  const stored = useSessionStorage(`cinematic:booking-selection:${owner ?? ''}:${showtimeId}`, '')
  const schema = z
    .array(z.string().trim().min(1).max(20))
    .max(100)
    .refine((items) => new Set(items.map((item) => item.toUpperCase())).size === items.length)
  const numbers = computed(() => {
    if (!auth.isAuthenticated || !owner || auth.subject !== owner) return []
    try {
      return schema.parse(JSON.parse(stored.value))
    } catch {
      return []
    }
  })
  function save(values: string[]) {
    if (auth.isAuthenticated && owner && auth.subject === owner)
      stored.value = JSON.stringify(schema.parse(values))
  }
  return { numbers, save }
}
