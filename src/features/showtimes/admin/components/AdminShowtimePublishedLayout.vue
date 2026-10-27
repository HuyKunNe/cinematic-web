<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { useAdminShowtimePublishedLayoutQuery } from '../api/admin-showtime-layout-query'
import { showtimeErrorMessage } from '../schemas/admin-showtime.schema'

const props = defineProps<{
  roomId: string
  roomName: string
  canRead: boolean
  query: ReturnType<typeof useAdminShowtimePublishedLayoutQuery>
  selectedLayoutId: string
  disabled: boolean
}>()

const emit = defineEmits<{ reload: [] }>()

const layout = computed(() => {
  if (
    !props.canRead ||
    !props.roomId ||
    props.query.isFetching.value ||
    !props.query.isSuccess.value
  ) {
    return null
  }

  const value = props.query.data.value
  return value?.roomId === props.roomId ? value : null
})
</script>

<template>
  <section
    class="admin-reference__panel showtime-create__panel"
    aria-labelledby="showtime-layout-title"
  >
    <header class="showtime-create__panel-heading">
      <div>
        <h2 id="showtime-layout-title">Sơ đồ ghế của phòng</h2>
      </div>
      <span v-if="layout" class="showtime-create__badge showtime-create__badge--success">
        Đã xuất bản
      </span>
    </header>

    <div class="showtime-create__panel-body">
      <p v-if="!roomId" class="showtime-create__hint">
        Chọn rạp và phòng để xác nhận sơ đồ.
      </p>
      <p v-else-if="!canRead" class="showtime-create__hint">
        Bạn chưa có quyền đọc cấu hình sơ đồ phòng.
      </p>

      <template v-else>
        <p v-if="query.isFetching.value || query.isPending.value" class="showtime-create__hint" role="status">
          Đang tải sơ đồ đã xuất bản…
        </p>

        <p v-else-if="query.isError.value" class="showtime-create__error" role="alert">
          {{ showtimeErrorMessage(query.error.value, 'Không thể xác nhận sơ đồ. Hãy tải lại.') }}
        </p>

        <template v-else-if="layout">
          <div class="showtime-create__layout-summary">
            <span class="showtime-create__layout-icon" aria-hidden="true">▦</span>
            <div>
              <strong>{{ roomName }} · v{{ layout.layoutVersion }}</strong>
              <p class="showtime-create__hint">
                {{ layout.seats }} ghế · {{ layout.capacity }} chỗ · {{ layout.seatTypes }} loại ghế
              </p>
            </div>
          </div>

          <p class="showtime-create__hint">
            {{
              selectedLayoutId === layout.id
                ? 'Phiên bản sơ đồ này được chọn để gắn vào suất chiếu.'
                : 'Phiên bản đang hiển thị chưa khớp sơ đồ được chọn cho suất chiếu.'
            }}
          </p>

          <RouterLink
            class="admin-reference__link-button"
            :to="{
              name: ROUTE_NAMES.ADMIN_ROOM_SEATS,
              params: { roomId: layout.roomId },
              query: { layoutId: layout.id },
            }"
          >
            Xem phiên bản sơ đồ này
          </RouterLink>
        </template>

        <p v-else class="showtime-create__hint" role="status">
          Phòng chưa có sơ đồ công bố. Hệ thống sẽ kiểm tra các ghế đang hoạt động của phòng khi lập lịch.
        </p>

        <AppButton
          type="button"
          variant="secondary"
          :disabled="disabled || query.isFetching.value"
          @click="emit('reload')"
        >
          Tải lại sơ đồ
        </AppButton>
      </template>
    </div>
  </section>
</template>