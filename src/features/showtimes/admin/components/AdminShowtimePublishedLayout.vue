<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useAdminShowtimePublishedLayoutQuery } from '../api/admin-showtime-layout-query'
import { showtimeErrorMessage } from '../schemas/admin-showtime.schema'

const props = defineProps<{
  roomId: string
  roomName: string
  canRead: boolean
}>()

const query = useAdminShowtimePublishedLayoutQuery(
  () => props.roomId,
  () => props.canRead,
)

const layout = computed(() => {
  if (!props.canRead || !props.roomId || query.isFetching.value || !query.isSuccess.value) {
    return null
  }

  const value = query.data.value

  return value?.roomId === props.roomId ? value : null
})

function reload() {
  if (!props.canRead || !props.roomId || query.isFetching.value) return
  void query.refetch()
}
</script>

<template>
  <section
    class="admin-reference__panel showtime-published-layout"
    aria-labelledby="showtime-layout-title"
  >
    <h2 id="showtime-layout-title">Sơ đồ PUBLISHED hiện tại</h2>

    <p v-if="!roomId" class="admin-reference__description">Chọn rạp và phòng để xem sơ đồ.</p>

    <p v-else-if="!canRead" class="admin-reference__description">
      Bạn chưa có quyền xem sơ đồ phòng. Việc xác nhận sơ đồ cho suất chiếu chưa sẵn sàng.
    </p>

    <template v-else>
      <p
        v-if="query.isPending.value || query.isFetching.value"
        class="admin-reference__description"
        role="status"
      >
        Đang tải sơ đồ đã xuất bản…
      </p>

      <p v-else-if="query.isError.value" class="showtime-published-layout__error" role="alert">
        {{ showtimeErrorMessage(query.error.value, 'Không thể đọc sơ đồ của phòng. Hãy tải lại.') }}
      </p>

      <template v-else-if="layout">
        <p class="admin-reference__description">{{ roomName }} · Đã xuất bản</p>

        <dl>
          <div>
            <dt>Phiên bản</dt>
            <dd>{{ layout.layoutVersion }}</dd>
          </div>
          <div>
            <dt>Ma trận</dt>
            <dd>{{ layout.rows }} hàng × {{ layout.columns }} cột</dd>
          </div>
          <div>
            <dt>Tổng số ghế</dt>
            <dd>{{ layout.seats }}</dd>
          </div>
          <div>
            <dt>Sức chứa theo sơ đồ</dt>
            <dd>{{ layout.capacity }} chỗ</dd>
          </div>
          <div>
            <dt>Số loại ghế</dt>
            <dd>{{ layout.seatTypes }}</dd>
          </div>
        </dl>

        <p class="admin-reference__description">
          Đây là sơ đồ đã xuất bản mới nhất của phòng tại lần tải này. Chưa xác nhận phiên bản sẽ
          được gắn khi tạo suất chiếu.
        </p>

        <RouterLink
          class="admin-reference__link-button showtime-published-layout__link"
          :to="{
            name: ROUTE_NAMES.ADMIN_ROOM_SEATS,
            params: { roomId: layout.roomId },
            query: { layoutId: layout.id },
          }"
        >
          Xem phiên bản sơ đồ này
        </RouterLink>
      </template>

      <p v-else class="admin-reference__description" role="status">
        Phòng chưa có sơ đồ PUBLISHED để hiển thị.
      </p>

      <footer class="admin-reference__form-actions">
        <AppButton
          type="button"
          variant="secondary"
          :disabled="query.isFetching.value"
          :loading="query.isFetching.value"
          @click="reload"
        >
          Tải lại sơ đồ
        </AppButton>
      </footer>
    </template>
  </section>
</template>

<style scoped>
[data-reference='admin-showtime-form'] .showtime-published-layout {
  min-width: 0;
  padding: var(--space-5);
}

[data-reference='admin-showtime-form'] .showtime-published-layout h2 {
  margin: 0;
  font-size: var(--font-size-lg);
}

[data-reference='admin-showtime-form'] .showtime-published-layout dl {
  display: grid;
  gap: var(--space-3);
  margin: var(--space-4) 0;
}

[data-reference='admin-showtime-form'] .showtime-published-layout dl > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

[data-reference='admin-showtime-form'] .showtime-published-layout dd {
  margin: 0;
  color: var(--color-text-primary);
}

[data-reference='admin-showtime-form'] .showtime-published-layout__error {
  color: var(--color-error);
}

[data-reference='admin-showtime-form'] .showtime-published-layout__link {
  margin-top: var(--space-4);
}

[data-reference='admin-showtime-form'] .showtime-published-layout :is(button, a):focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}
</style>
