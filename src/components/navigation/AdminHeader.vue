<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useEventListener } from '@vueuse/core'
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  UserRound,
  X,
} from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import { getVisibleAdminNavigation } from '../../config/admin-navigation'
import { useAuthStore } from '../../stores/auth.store'

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

const auth = useAuthStore()
const route = useRoute()
const accountMenuOpen = ref(false)
const searchOpen = ref(false)
const searchText = ref('')

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

const searchResults = computed(() => {
  const keyword = normalize(searchText.value)

  return getVisibleAdminNavigation(auth).filter((item) =>
    normalize(`${item.label} ${item.description}`).includes(keyword),
  )
})

watch(
  () => route.fullPath,
  () => {
    accountMenuOpen.value = false
    searchOpen.value = false
    searchText.value = ''
  },
)

useEventListener('keydown', (event: KeyboardEvent) => {
  if (event.repeat || event.key.toLowerCase() !== 'k' || (!event.ctrlKey && !event.metaKey)) {
    return
  }

  event.preventDefault()
  searchOpen.value = true
})

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

    <DialogRoot v-model:open="searchOpen">
      <DialogTrigger as-child>
        <button class="admin-header__search" type="button">
          <Search aria-hidden="true" />
          <span>Tìm kiếm chức năng…</span>
          <kbd>Ctrl / ⌘ K</kbd>
        </button>
      </DialogTrigger>

      <DialogPortal>
        <DialogOverlay class="admin-drawer__overlay" />

        <DialogContent class="admin-search-dialog">
          <header class="admin-search-dialog__heading">
            <DialogTitle>Tìm kiếm chức năng</DialogTitle>

            <DialogClose as-child>
              <button class="admin-sidebar__close" type="button" aria-label="Đóng tìm kiếm">
                <X aria-hidden="true" />
              </button>
            </DialogClose>
          </header>

          <DialogDescription class="admin-search-dialog__description">
            Tìm và mở các chức năng tài khoản được cấp quyền.
          </DialogDescription>

          <label class="admin-search-dialog__field">
            <Search aria-hidden="true" />
            <span class="admin-visually-hidden">Tên chức năng</span>
            <input
              v-model="searchText"
              type="search"
              placeholder="Phim, rạp, lịch chiếu…"
              autocomplete="off"
            />
          </label>

          <nav
            v-if="searchResults.length"
            class="admin-search-dialog__results"
            aria-label="Kết quả tìm kiếm"
          >
            <RouterLink
              v-for="item in searchResults"
              :key="item.routeName"
              :to="{ name: item.routeName }"
              @click="searchOpen = false"
            >
              <span>
                <strong>{{ item.label }}</strong>
                <small>{{ item.description }}</small>
              </span>
              <ChevronRight aria-hidden="true" />
            </RouterLink>
          </nav>

          <p v-else class="admin-search-dialog__description" role="status">
            Không tìm thấy chức năng phù hợp.
          </p>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

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
          <span class="admin-user-menu__label">{{ username || accountLabel }}</span>
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
