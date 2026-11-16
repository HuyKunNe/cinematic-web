import { computed, nextTick, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'

export function useAdminPageLoading() {
  const route = useRoute()
  const router = useRouter()
  const cache = useQueryClient().getQueryCache()
  const navigating = ref(false)
  const openingPage = ref(true)
  const pendingData = ref(false)
  const navigationError = ref('')
  let destination = ''
  let mounted = false
  let disposed = false
  let scheduled = false

  function hasPendingData() {
    return cache
      .getAll()
      .some(
        (query) =>
          query.isActive() &&
          query.state.status === 'pending' &&
          query.state.fetchStatus === 'fetching',
      )
  }

  // Wait for the new view and dependent query watchers to mount before deciding
  // that a page has no data left to load. Hidden content must remain mounted.
  function update() {
    pendingData.value = hasPendingData()
    if (!mounted || scheduled || disposed) return
    scheduled = true
    void nextTick().then(() => {
      scheduled = false
      if (disposed) return
      pendingData.value = hasPendingData()
      if (!navigating.value && !pendingData.value) openingPage.value = false
    })
  }

  const unsubscribe = cache.subscribe(update)
  const removeBefore = router.beforeEach((to) => {
    if (to.meta.layout !== 'admin') return
    destination = to.fullPath
    navigationError.value = ''
    navigating.value = true
  })
  const removeAfter = router.afterEach((to) => {
    if (destination !== to.fullPath) return
    navigating.value = false
    update()
  })
  const removeError = router.onError((_error, to) => {
    if (to.meta.layout !== 'admin' || destination !== to.fullPath) return
    navigating.value = false
    navigationError.value = 'Chưa tải được trang quản trị. Vui lòng thử lại.'
    update()
  })
  watch(
    () => route.fullPath,
    () => {
      openingPage.value = true
      navigationError.value = ''
      update()
    },
    { flush: 'pre' },
  )
  onMounted(() => {
    mounted = true
    update()
  })
  onScopeDispose(() => {
    disposed = true
    unsubscribe()
    removeBefore()
    removeAfter()
    removeError()
  })

  function retryNavigation() {
    if (destination && !navigating.value)
      void router.push(destination).catch(() => {
        // router.onError owns the visible error state.
      })
  }
  return {
    loading: computed(() => navigating.value || (openingPage.value && pendingData.value)),
    navigating,
    navigationError,
    retryNavigation,
  }
}
