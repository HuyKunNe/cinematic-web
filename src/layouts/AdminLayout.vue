<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { useRouter } from 'vue-router'
import AdminHeader from '../components/navigation/AdminHeader.vue'
import AdminSidebar from '../components/navigation/AdminSidebar.vue'
import Breadcrumbs from '../components/navigation/Breadcrumbs.vue'
import { useAuthStore } from '../stores/auth.store'
import { ROUTE_NAMES } from '../router/route-constants'
import { computed, ref, watch } from 'vue'

const isMobileWidth = useMediaQuery('(max-width: 47.999rem)')
const isCompactLandscape = useMediaQuery(
  '(orientation: landscape) and (max-height: 32rem) and (max-width: 63.999rem)',
)
const isTabletWidth = useMediaQuery('(min-width: 48rem) and (max-width: 63.999rem)')

const isMobile = computed(() => isMobileWidth.value || isCompactLandscape.value)
const isTablet = computed(() => isTabletWidth.value && !isCompactLandscape.value)

watch(isMobile, (mobile) => {
  if (!mobile) mobileDrawerOpen.value = false
})
const router = useRouter()
const auth = useAuthStore()

const sidebarCollapsed = ref(true)
const mobileDrawerOpen = ref(false)

function toggleNavigation() {
  if (isMobile.value) {
    mobileDrawerOpen.value = !mobileDrawerOpen.value
    return
  }

  if (isTablet.value) {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
}

function closeMobileDrawer() {
  mobileDrawerOpen.value = false
}

function handleLogout() {
  // OIDC end-session chưa được triển khai trong auth feature.
  // Xóa authorization context phía client và đưa người dùng về auth placeholder.
  auth.clearAuthorizationContext()
  mobileDrawerOpen.value = false
  void router.replace({ name: ROUTE_NAMES.AUTH_REQUIRED })
}
</script>

<template>
  <div
    class="admin-layout"
    :class="{
      'is-tablet': isTablet,
      'is-mobile': isMobile,
      'is-sidebar-collapsed': isTablet && sidebarCollapsed,
    }"
  >
    <AdminSidebar
      :collapsed="isTablet && sidebarCollapsed"
      :mobile="isMobile"
      :mobile-open="mobileDrawerOpen"
      @close-mobile="closeMobileDrawer"
    />

    <div class="admin-layout__content">
      <AdminHeader
        :mobile="isMobile"
        :tablet="isTablet"
        :mobile-drawer-open="mobileDrawerOpen"
        :sidebar-collapsed="sidebarCollapsed"
        @toggle-navigation="toggleNavigation"
        @logout-requested="handleLogout"
      />

      <main class="admin-layout__main">
        <div class="admin-layout__container">
          <Breadcrumbs />
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<style src="../styles/admin-navigation.css"></style>
