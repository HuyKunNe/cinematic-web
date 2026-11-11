<script setup lang="ts">
import { ROUTE_NAMES } from '@/router/route-constants'
import { UserRound, Ticket } from 'lucide-vue-next'
</script>
<template>
  <nav class="lumiere-account-nav" aria-label="Tài khoản của bạn">
    <RouterLink :to="{ name: ROUTE_NAMES.ACCOUNT }"
      ><UserRound aria-hidden="true" /> Hồ sơ của tôi</RouterLink
    >
    <RouterLink :to="{ name: ROUTE_NAMES.ACCOUNT_BOOKINGS }"
      ><Ticket aria-hidden="true" /> Vé &amp; giao dịch</RouterLink
    >
  </nav>
</template>
