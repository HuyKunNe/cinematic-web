<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  ArrowUpRight,
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
} from 'lucide-vue-next'
import {
  DialogTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import { ROUTE_NAMES } from '../../router/route-constants'

const props = defineProps<{
  drawer: boolean
  sidebarCollapsed: boolean
  accountLabel: string
  username: string | null
  logoutPending: boolean
}>()

const emit = defineEmits<{
  toggleSidebar: []
  logoutRequested: []
}>()

const route = useRoute()
const accountMenuOpen = ref(false)

const currentTitle = computed(() =>
  typeof route.meta.title === 'string' ? route.meta.title : 'Quản trị',
)

watch(
  () => route.fullPath,
  () => {
    accountMenuOpen.value = false
  },
)

function requestLogout() {
  if (props.logoutPending) return

  accountMenuOpen.value = false
  emit('logoutRequested')
}
</script>

<template>
  <header class="admin-header">
    <DialogTrigger v-if="drawer" as-child>
      <button
        id="admin-navigation-toggle"
        class="admin-header__menu-button"
        type="button"
        aria-label="Mở điều hướng quản trị"
      >
        <Menu aria-hidden="true" />
      </button>
    </DialogTrigger>

    <button
      v-else
      id="admin-navigation-toggle"
      class="admin-header__menu-button"
      type="button"
      aria-controls="admin-desktop-navigation"
      :aria-expanded="!sidebarCollapsed"
      :aria-label="sidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'"
      @click="emit('toggleSidebar')"
    >
      <PanelLeftOpen v-if="sidebarCollapsed" aria-hidden="true" />
      <PanelLeftClose v-else aria-hidden="true" />
    </button>

    <div class="admin-header__title">
      <span class="admin-header__eyebrow">Không gian quản trị</span>
      <strong class="admin-header__section">{{ currentTitle }}</strong>
    </div>

    <RouterLink class="admin-header__customer-link" :to="{ name: ROUTE_NAMES.HOME }">
      <span>Trang khách hàng</span>
      <ArrowUpRight aria-hidden="true" />
    </RouterLink>

    <DropdownMenuRoot v-model:open="accountMenuOpen">
      <DropdownMenuTrigger as-child>
        <button
          class="admin-user-menu__trigger"
          type="button"
          aria-label="Mở menu tài khoản quản trị"
          :disabled="logoutPending"
        >
          <span class="admin-user-menu__avatar" aria-hidden="true">
            <UserRound />
          </span>

          <span class="admin-user-menu__label">
            {{ username || accountLabel }}
          </span>

          <ChevronDown class="admin-user-menu__chevron" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuPortal>
        <DropdownMenuContent class="admin-user-menu__panel" align="end">
          <DropdownMenuLabel class="admin-user-menu__identity">
            <strong>{{ username || accountLabel }}</strong>
            <span v-if="username" class="admin-user-menu__role">
              {{ accountLabel }}
            </span>
          </DropdownMenuLabel>

          <DropdownMenuSeparator class="admin-user-menu__separator" />

          <DropdownMenuItem
            class="admin-user-menu__item"
            :disabled="logoutPending"
            @select="requestLogout"
          >
            <LogOut aria-hidden="true" />
            <span>{{ logoutPending ? 'Đang đăng xuất…' : 'Đăng xuất' }}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  </header>
</template>
