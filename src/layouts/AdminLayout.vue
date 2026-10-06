<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useMediaQuery, useStorage } from '@vueuse/core'
import { useQueryClient } from '@tanstack/vue-query'
import { useRoute } from 'vue-router'
import { X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import AdminHeader from '../components/navigation/AdminHeader.vue'
import AdminSidebar from '../components/navigation/AdminSidebar.vue'
import Breadcrumbs from '../components/navigation/Breadcrumbs.vue'
import { APP_ROLES } from '../config/authorization'
import { ADMIN_MEDIA_QUERIES } from '../config/admin-responsive'
import { restoreAuthSession, signOut } from '../features/auth'
import { useAuthStore } from '../stores/auth.store'

const auth = useAuthStore()
const route = useRoute()
const queryClient = useQueryClient()

const isDrawer = useMediaQuery(ADMIN_MEDIA_QUERIES.drawer)
const sidebarCollapsed = useStorage('cinematic:admin:sidebar-collapsed', false)

const drawerOpen = ref(false)
const logoutPending = ref(false)
const logoutError = ref('')

const accountLabel = computed(() => {
  if (auth.hasRole(APP_ROLES.ADMIN)) return 'Quản trị viên'
  if (auth.hasRole(APP_ROLES.STAFF)) return 'Nhân viên'
  return 'Tài khoản'
})

watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
    logoutError.value = ''
  },
)

watch(
  isDrawer,
  () => {
    drawerOpen.value = false
  },
  { flush: 'sync' },
)

function restoreNavigationFocus(event: Event) {
  event.preventDefault()

  void nextTick(() => {
    const target =
      document.getElementById('admin-navigation-toggle') ??
      document.getElementById('admin-main-content')

    target?.focus()
  })
}

async function handleLogout() {
  if (logoutPending.value) return

  logoutPending.value = true
  logoutError.value = ''
  drawerOpen.value = false

  try {
    await signOut()
    queryClient.clear()
  } catch {
    await restoreAuthSession()
    logoutError.value = 'Không thể chuyển sang trang đăng xuất. Vui lòng thử lại.'
  } finally {
    logoutPending.value = false
  }
}
</script>

<template>
  <DialogRoot v-model:open="drawerOpen">
    <div
      class="admin-layout"
      :class="{
        'is-drawer': isDrawer,
        'is-sidebar-collapsed': !isDrawer && sidebarCollapsed,
      }"
    >
      <a class="admin-skip-link" href="#admin-main-content"> Chuyển đến nội dung </a>

      <aside
        v-if="!isDrawer"
        id="admin-desktop-navigation"
        class="admin-layout__sidebar"
        aria-label="Thanh điều hướng quản trị"
      >
        <AdminSidebar :collapsed="sidebarCollapsed" />
      </aside>

      <div class="admin-layout__content">
        <AdminHeader
          :drawer="isDrawer"
          :sidebar-collapsed="sidebarCollapsed"
          :account-label="accountLabel"
          :username="auth.username"
          :logout-pending="logoutPending"
          @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
          @logout-requested="handleLogout"
        />

        <main id="admin-main-content" class="admin-layout__main" tabindex="-1">
          <div class="admin-layout__container">
            <Breadcrumbs />

            <p v-if="logoutError" class="admin-layout__error" role="alert">
              {{ logoutError }}
            </p>

            <slot />
          </div>
        </main>
      </div>
    </div>

    <DialogPortal v-if="isDrawer">
      <DialogOverlay class="admin-drawer__overlay" />

      <DialogContent class="admin-drawer" @close-auto-focus="restoreNavigationFocus">
        <DialogTitle class="admin-visually-hidden"> Điều hướng quản trị </DialogTitle>

        <DialogDescription class="admin-visually-hidden">
          Chọn một chức năng quản trị hoặc quay về trang khách hàng.
        </DialogDescription>

        <AdminSidebar :collapsed="false" @navigate="drawerOpen = false">
          <template #header-action>
            <DialogClose as-child>
              <button
                class="admin-sidebar__close"
                type="button"
                aria-label="Đóng điều hướng quản trị"
              >
                <X aria-hidden="true" />
              </button>
            </DialogClose>
          </template>
        </AdminSidebar>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style src="../styles/admin-navigation.css"></style>
