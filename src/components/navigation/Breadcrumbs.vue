<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ROUTE_NAMES } from '../../router/route-constants'

const route = useRoute()

const currentTitle = computed(() =>
  typeof route.meta.title === 'string' ? route.meta.title : 'Quản trị',
)

const isAdminHome = computed(() => route.name === ROUTE_NAMES.ADMIN)
</script>

<template>
  <nav class="admin-breadcrumbs" aria-label="Breadcrumb">
    <ol class="admin-breadcrumbs__list">
      <li v-if="!isAdminHome" class="admin-breadcrumbs__item">
        <RouterLink :to="{ name: ROUTE_NAMES.ADMIN }">Tổng quan</RouterLink>
      </li>
      <li class="admin-breadcrumbs__item admin-breadcrumbs__item--current">
        <span aria-current="page">{{ isAdminHome ? 'Tổng quan' : currentTitle }}</span>
      </li>
    </ol>
  </nav>
</template>
