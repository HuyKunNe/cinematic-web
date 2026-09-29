<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterView } from 'vue-router'
import AdminLayout from './layouts/AdminLayout.vue'
import AuthLayout from './layouts/AuthLayout.vue'
import CustomerLayout from './layouts/CustomerLayout.vue'

const route = useRoute()

const layouts = {
  customer: CustomerLayout,
  auth: AuthLayout,
  admin: AdminLayout,
}

const activeLayout = computed(() => layouts[route.meta.layout ?? 'customer'])
</script>

<template>
  <component :is="activeLayout">
    <RouterView v-slot="{ Component }">
      <component :is="Component" />
    </RouterView>
  </component>
</template>
