<script setup lang="ts">
import AdminPricingWorkflowCreate from './AdminPricingWorkflowCreate.vue'
import type { PricingCinema, PricingDetail } from '../api/admin-pricing-queries'

defineProps<{
  cinemas: PricingCinema[]
  anchorCinemaId: string
  canManage: boolean
  initial: PricingDetail
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <AdminPricingWorkflowCreate
    :cinemas="cinemas"
    :anchor-cinema-id="anchorCinemaId"
    :initial-cinema-ids="initial.policy.cinemaIds"
    :can-manage="canManage"
    :initial="initial"
    read-only
    lookup
    @close="emit('close')"
  />
</template>
