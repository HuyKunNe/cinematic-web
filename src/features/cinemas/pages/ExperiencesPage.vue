<script setup lang="ts">
import { computed } from 'vue'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppLoadingState from '@/components/ui/AppLoadingState.vue'
import AppErrorState from '@/components/ui/AppErrorState.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import { RoomResponseRoomType } from '@/services/api/generated/inventory-service/model/roomResponseRoomType'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useCinemaLocation } from '../composables/use-cinema-location'
import { useCinemaExperienceRooms } from '../api/cinema-experiences.queries'

const { query, cinemas } = useCinemaLocation()
const results = useCinemaExperienceRooms(() =>
  query.isSuccess.value ? cinemas.value.map((cinema) => cinema.id) : [],
)
const descriptions = [
  {
    type: RoomResponseRoomType.STANDARD,
    name: 'Tiêu chuẩn',
    description:
      'Lựa chọn quen thuộc cho một cuộc hẹn điện ảnh. Chọn rạp và suất chiếu phù hợp với bộ phim bạn muốn xem.',
  },
  {
    type: RoomResponseRoomType.IMAX,
    name: 'IMAX',
    description:
      'Khám phá các phòng IMAX trong hệ thống. Định dạng và phiên bản phim được công bố theo từng suất chiếu.',
  },
  {
    type: RoomResponseRoomType.FOUR_DX,
    name: '4DX',
    description:
      'Tìm các rạp có phòng 4DX đang hoạt động. Kiểm tra thông tin suất chiếu trước khi chọn ghế và đặt vé.',
  },
  {
    type: RoomResponseRoomType.SCREEN_X,
    name: 'ScreenX',
    description:
      'Chọn một cuộc hẹn tại phòng ScreenX. Xem lịch của rạp để biết các phim và phiên bản đang được mở bán.',
  },
  {
    type: RoomResponseRoomType.VIP,
    name: 'VIP',
    description:
      'Khám phá các phòng được rạp phân loại VIP. Vị trí, hạng ghế và giá áp dụng được hiển thị khi chọn suất và ghế.',
  },
]
const experiences = computed(() =>
  descriptions.flatMap((item) => {
    const rooms = results.rooms.value.filter(
      (room) => room.active === true && room.roomType === item.type,
    )
    const locations = cinemas.value.filter((cinema) =>
      rooms.some((room) => room.cinemaId === cinema.id),
    )
    return locations.length
      ? [
          {
            ...item,
            cinemas: locations,
            formats: [...new Set(rooms.flatMap((room) => room.contentFormats ?? []))],
          },
        ]
      : []
  }),
)
</script>

<template>
  <div class="customer-experiences">
    <AppContainer>
      <header class="customer-experiences__heading">
        <p class="lumiere-eyebrow">ĐẮM CHÌM VÀO TỪNG KHOẢNH KHẮC</p>
        <h1>Trải nghiệm Lumière</h1>
        <p>Loại phòng khác với định dạng 2D/3D và hạng ghế. Mỗi suất ghi rõ các lựa chọn hỗ trợ.</p>
      </header>
      <AppLoadingState
        v-if="query.isPending.value || (results.loading.value && !experiences.length)"
        title="Đang tải các trải nghiệm"
        description="Đang đối chiếu loại phòng tại các rạp đang hoạt động."
      />
      <AppErrorState
        v-else-if="query.isError.value"
        title="Chưa tải được hệ thống rạp"
        show-retry
        :retrying="query.isFetching.value"
        @retry="query.refetch()"
      />
      <template v-else>
        <div v-if="results.failed.value" class="customer-experiences__feedback" role="alert">
          <p>Một số rạp chưa tải được thông tin phòng. Các trải nghiệm đã tải vẫn được hiển thị.</p>
          <AppButton variant="secondary" :loading="results.loading.value" @click="results.refresh()"
            >Tải lại thông tin phòng</AppButton
          >
        </div>
        <p v-else-if="results.loading.value" class="booking-note" role="status">
          Đang cập nhật thông tin phòng…
        </p>
        <div v-if="experiences.length" class="customer-experiences__grid">
          <article
            v-for="(item, index) in experiences"
            :key="item.type"
            class="customer-experiences__tile"
          >
            <span class="customer-experiences__number" aria-hidden="true">{{
              String(index + 1).padStart(2, '0')
            }}</span>
            <h2>{{ item.name }}</h2>
            <p>{{ item.description }}</p>
            <p v-if="item.formats.length" class="customer-experiences__formats">
              Định dạng tại hệ thống: {{ item.formats.join(' · ') }}
            </p>
            <ul class="customer-experiences__cinemas" :aria-label="`Rạp có phòng ${item.name}`">
              <li v-for="cinema in item.cinemas" :key="cinema.id">
                <RouterLink
                  :to="{ name: ROUTE_NAMES.CINEMA_DETAIL, params: { cinemaId: cinema.id } }"
                  >{{ cinema.name }}</RouterLink
                >
              </li>
            </ul>
          </article>
        </div>
        <AppEmptyState
          v-else-if="!results.failed.value"
          title="Trải nghiệm đang được cập nhật"
          description="Chưa có thông tin loại phòng đang hoạt động. Bạn có thể quay lại hệ thống rạp để xem thêm."
        />
        <RouterLink class="customer-experiences__back" :to="{ name: ROUTE_NAMES.CINEMAS }"
          >Khám phá hệ thống rạp →</RouterLink
        >
      </template>
    </AppContainer>
  </div>
</template>

<style scoped>
@reference '../../../styles/main.css';
.customer-experiences {
  --experience-columns: 3;
  --experience-gap: 1.4375rem;
  --experience-card-height: 16.875rem;
  --experience-card-background: #efeee6;
  --experience-number-color: #9ca18f;
  --experience-title-size: 2.625rem;
  --experience-tag-size: 0.6875rem;
  --experience-number-tracking: 0.18em;
  padding-block: var(--lumiere-page-space);
  min-width: 0;
}
.customer-experiences__heading {
  margin-bottom: var(--space-8);
}
.customer-experiences__heading h1 {
  margin: 0;
  font-size: var(--experience-title-size);
  line-height: var(--line-height-heading);
  letter-spacing: var(--letter-spacing-tight);
}
.customer-experiences__heading > p:last-child {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.customer-experiences__grid {
  display: grid;
  grid-template-columns: repeat(var(--experience-columns), minmax(0, 1fr));
  gap: var(--experience-gap);
}
.customer-experiences__tile {
  min-height: var(--experience-card-height);
  padding: var(--space-7);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--experience-card-background);
}
.customer-experiences__number {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--experience-number-color);
  letter-spacing: var(--experience-number-tracking);
  margin-bottom: var(--space-8);
}
.customer-experiences__tile h2 {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-2xl);
  line-height: var(--line-height-heading);
}
.customer-experiences__tile p {
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
}
.customer-experiences__tile .customer-experiences__formats {
  font-size: var(--font-size-xs);
}
.customer-experiences__cinemas {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: 0;
  margin: var(--space-4) 0 0;
  list-style: none;
}
.customer-experiences__cinemas a {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: var(--experience-tag-size);
  font-weight: var(--font-weight-semibold);
}
.customer-experiences__cinemas a:hover {
  color: var(--lumiere-orange-dark);
  border-color: var(--color-primary);
}
.customer-experiences__feedback {
  padding: var(--space-5);
  margin-bottom: var(--space-5);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: var(--font-size-sm);
}
.customer-experiences__back {
  display: inline-block;
  margin-top: var(--space-7);
  color: var(--lumiere-orange-dark);
  font-size: var(--font-size-sm);
}
@variant lumiere-tablet {
  .customer-experiences {
    --experience-columns: 2;
  }
}
@variant lumiere-mobile {
  .customer-experiences {
    --experience-columns: 1;
    --experience-card-height: 13.75rem;
    --experience-title-size: 2.0625rem;
  }
}
</style>
