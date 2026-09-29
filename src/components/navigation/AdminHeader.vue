<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'

defineProps<{
  mobile: boolean
  tablet: boolean
  mobileDrawerOpen: boolean
  sidebarCollapsed: boolean
}>()

const emit = defineEmits<{
  toggleNavigation: []
  logoutRequested: []
}>()

const userMenu = ref<HTMLDetailsElement | null>(null)

function requestLogout() {
  if (userMenu.value) userMenu.value.open = false
  emit('logoutRequested')
}
</script>

<template>
  <header class="admin-header">
    <button
      v-if="mobile || tablet"
      class="admin-header__menu-button"
      type="button"
      :aria-label="
        mobile
          ? mobileDrawerOpen
            ? 'Đóng menu quản trị'
            : 'Mở menu quản trị'
          : tablet
            ? sidebarCollapsed
              ? 'Mở rộng thanh điều hướng'
              : 'Thu gọn thanh điều hướng'
            : 'Điều hướng quản trị'
      "
      :aria-expanded="mobile ? mobileDrawerOpen : tablet ? !sidebarCollapsed : undefined"
      @click="emit('toggleNavigation')"
    >
      <Menu v-if="mobile" aria-hidden="true" />
      <PanelLeftOpen v-else-if="tablet && sidebarCollapsed" aria-hidden="true" />
      <PanelLeftClose v-else aria-hidden="true" />
    </button>

    <div class="admin-header__title">
      <span class="admin-header__eyebrow">CINEMATIC</span>
      <span class="admin-header__section">Quản trị</span>
    </div>

    <details ref="userMenu" class="admin-user-menu">
      <summary class="admin-user-menu__trigger" aria-label="Mở menu tài khoản">
        <span class="admin-user-menu__avatar" aria-hidden="true">A</span>
        <span class="admin-user-menu__label">Tài khoản</span>
        <ChevronDown class="admin-user-menu__chevron" aria-hidden="true" />
      </summary>

      <div class="admin-user-menu__panel">
        <span class="admin-user-menu__identity">Phiên quản trị</span>
        <button class="admin-user-menu__logout" type="button" @click="requestLogout">
          <LogOut aria-hidden="true" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </details>
  </header>
</template>
