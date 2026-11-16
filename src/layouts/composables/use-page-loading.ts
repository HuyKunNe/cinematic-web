import { computed, nextTick, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'

interface PageLoadingOptions {
  layout: 'admin' | 'customer'
  navigationErrorMessage: string
  pathOnly?: boolean
  skipInitialData?: () => boolean
}

export function usePageLoading(options: PageLoadingOptions) {
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
    if (options.skipInitialData?.()) return false
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
  const removeBefore = router.beforeEach((to, from) => {
    if (to.meta.layout !== options.layout || (options.pathOnly && to.path === from.path)) return
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
    if (to.meta.layout !== options.layout || destination !== to.fullPath) return
    navigating.value = false
    navigationError.value = options.navigationErrorMessage
    update()
  })
  watch(
    () => (options.pathOnly ? route.path : route.fullPath),
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
