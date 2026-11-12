<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronDown, UserRound, Ticket, LogOut } from 'lucide-vue-next'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from 'reka-ui'
import { ROUTE_NAMES } from '@/router/route-constants'

defineProps<{ username: string | null; pending: boolean }>()
const emit = defineEmits<{ signOut: [] }>()
const open = ref(false)
const route = useRoute()
watch(
  () => route.fullPath,
  () => {
    open.value = false
  },
)
</script>

<template>
  <DropdownMenuRoot v-model:open="open" :modal="false">
    <DropdownMenuTrigger
      class="customer-header__account customer-account-menu__trigger"
      :disabled="pending"
      :aria-busy="pending"
    >
      <UserRound aria-hidden="true" class="customer-navigation__icon" />
      <span>{{ pending ? 'Đang đăng xuất…' : 'Tài khoản' }}</span>
      <ChevronDown aria-hidden="true" class="customer-account-menu__chevron" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent class="customer-account-menu" align="end">
        <DropdownMenuLabel class="customer-account-menu__label">
          <span>Xin chào,</span><strong :title="username || 'bạn'">{{ username || 'bạn' }}</strong>
        </DropdownMenuLabel>
        <DropdownMenuSeparator class="customer-account-menu__separator" />
        <DropdownMenuItem as-child>
          <RouterLink class="customer-account-menu__item" :to="{ name: ROUTE_NAMES.ACCOUNT }"
            ><UserRound aria-hidden="true" />Hồ sơ của tôi</RouterLink
          >
        </DropdownMenuItem>
        <DropdownMenuItem as-child>
          <RouterLink
            class="customer-account-menu__item"
            :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS }"
            ><Ticket aria-hidden="true" />Vé &amp; giao dịch</RouterLink
          >
        </DropdownMenuItem>
        <DropdownMenuSeparator class="customer-account-menu__separator" />
        <DropdownMenuItem
          class="customer-account-menu__item customer-account-menu__sign-out"
          :disabled="pending"
          @select="emit('signOut')"
          ><LogOut aria-hidden="true" />Đăng xuất</DropdownMenuItem
        >
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
