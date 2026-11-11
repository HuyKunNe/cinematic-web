import { computed, nextTick, ref, watch, type Ref } from 'vue'

/** Keep operation feedback visible for a fresh toast duration, including repeated messages. */
export function useShowtimeFeedback(error: Ref<string>, notice: Ref<string>) {
  const open = ref(false)
  const message = computed(() => error.value || notice.value)
  const variant = computed(() => (error.value ? ('error' as const) : ('success' as const)))
  watch([error, notice], async (_, __, onCleanup) => {
    let stale = false
    onCleanup(() => {
      stale = true
    })
    open.value = false
    if (!message.value) return
    await nextTick()
    if (!stale) open.value = true
  })
  return { open, message, variant }
}
