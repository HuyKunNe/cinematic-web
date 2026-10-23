<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useAdminRoomSeatsQuery } from '../api/admin-seat-queries'

const props = defineProps<{
  roomId: string
}>()

const roomId = computed(() => props.roomId)
const seatMap = useAdminRoomSeatsQuery(roomId, true)
</script>

<template>
  <span v-if="seatMap.isFetching.value && !seatMap.data.value"> Đang tải… </span>

  <div v-else-if="seatMap.isError.value">
    <span>Không tải được sức chứa.</span>
    <AppButton
      variant="secondary"
      size="sm"
      :loading="seatMap.isFetching.value"
      @click="seatMap.refetch()"
    >
      Thử lại
    </AppButton>
  </div>

  <div v-else-if="seatMap.data.value">
    <strong>{{ seatMap.data.value.capacity }} chỗ</strong>
    <br />
    <span>{{ seatMap.data.value.seats.length }} đơn vị ghế</span>
  </div>

  <span v-else aria-label="Phòng chưa có sơ đồ ghế đã xuất bản"> Chưa có sơ đồ </span>
</template>
