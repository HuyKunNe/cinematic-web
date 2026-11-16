<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { MapPin, Clock3, Phone, Mail } from 'lucide-vue-next'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppLink from '@/components/ui/AppLink.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppErrorState from '@/components/ui/AppErrorState.vue'
import AppLoadingState from '@/components/ui/AppLoadingState.vue'
import { CinemaSchedule } from '@/features/home'
import { ROUTE_NAMES } from '@/router/route-constants'
import type { RoomResponseRoomType } from '@/services/api/generated/inventory-service/model/roomResponseRoomType'
import { useCinemaDetailQuery, useCinemaAmenitiesQuery } from '../api/cinema-detail.queries'
import { useCinemaRoomsQuery } from '../api/cinema-room.queries'

const route = useRoute()
const cinemaId = computed(() => {
  const value = route.params.cinemaId
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase()
    : ''
})
const query = useCinemaDetailQuery(cinemaId)
const cinema = computed(() => (query.isSuccess.value ? query.data.value : null))
const activeId = computed(() => cinema.value?.id ?? '')
const amenities = useCinemaAmenitiesQuery(activeId)
const rooms = useCinemaRoomsQuery(activeId)
const roomTypeNames: Record<RoomResponseRoomType, string> = {
  STANDARD: 'Tiêu chuẩn',
  VIP: 'VIP',
  IMAX: 'IMAX',
  FOUR_DX: '4DX',
  SCREEN_X: 'ScreenX',
}
const experiences = computed(() => {
  const groups = new Map<RoomResponseRoomType, Set<string>>()
  for (const room of rooms.data.value ?? []) {
    if (!room.active || room.cinemaId !== activeId.value || !room.roomType) continue
    const formats = groups.get(room.roomType) ?? new Set<string>()
    for (const format of room.contentFormats ?? []) formats.add(format)
    groups.set(room.roomType, formats)
  }
  return [...groups].map(([type, formats]) => ({
    type,
    name: roomTypeNames[type],
    formats: [...formats].join(' · '),
  }))
})
const mapUrl = computed(() =>
  cinema.value?.address?.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cinema.value.address)}`
    : '',
)
const phoneUrl = computed(() => {
  const phone = cinema.value?.phone?.replace(/[^\d+]/g, '')
  return phone && /^\+?\d+$/.test(phone) ? `tel:${phone}` : ''
})
const emailUrl = computed(() =>
  cinema.value?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cinema.value.email)
    ? `mailto:${encodeURIComponent(cinema.value.email)}`
    : '',
)
</script>

<template>
  <div class="customer-cinema-detail">
    <div v-if="cinema" class="customer-cinema-detail__cover">
      <img src="/customer/cinema-placeholder.svg" alt="Không gian rạp chiếu minh họa" />
    </div>
    <AppContainer class="customer-cinema-detail__content">
      <nav class="booking-start__breadcrumb" aria-label="Đường dẫn trang">
        <AppLink :to="{ name: ROUTE_NAMES.CINEMAS }" variant="muted">Hệ thống rạp</AppLink>
        <span aria-hidden="true">/</span
        ><span aria-current="page">{{ cinema?.name || 'Chi tiết rạp' }}</span>
      </nav>
      <AppErrorState
        v-if="!cinemaId"
        title="Đường dẫn rạp không hợp lệ"
        description="Vui lòng chọn rạp từ danh sách hệ thống rạp."
      />
      <AppLoadingState v-else-if="query.isPending.value" title="Đang tải thông tin rạp" />
      <AppErrorState
        v-else-if="query.isError.value"
        title="Chưa tải được thông tin rạp"
        description="Rạp có thể không còn khả dụng hoặc kết nối bị gián đoạn. Vui lòng thử lại."
        show-retry
        :retrying="query.isFetching.value"
        @retry="query.refetch()"
      />
      <AppErrorState
        v-else-if="!cinema"
        title="Rạp hiện không hoạt động"
        description="Vui lòng chọn rạp khác để xem lịch và đặt vé."
      />
      <template v-else>
        <header class="customer-cinema-detail__heading">
          <div>
            <p class="lumiere-eyebrow">{{ cinema.city || 'HỆ THỐNG RẠP' }}</p>
            <h1>{{ cinema.name }}</h1>
            <p>{{ cinema.address || 'Địa chỉ đang được cập nhật.' }}</p>
          </div>
          <a
            v-if="mapUrl"
            :href="mapUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="home-button customer-cinema-detail__map"
            ><MapPin aria-hidden="true" /> Mở bản đồ</a
          >
        </header>
        <div class="customer-cinema-detail__info">
          <section class="booking-panel">
            <h2>Đến rạp thật dễ</h2>
            <p>{{ cinema.directions || 'Hướng dẫn đến rạp đang được cập nhật.' }}</p>
            <dl class="customer-cinema-detail__contacts">
              <div v-if="cinema.openingHours">
                <dt><Clock3 aria-hidden="true" /> Mở cửa</dt>
                <dd>
                  {{ cinema.openingHours
                  }}<template v-if="cinema.timeZone"> · {{ cinema.timeZone }}</template>
                </dd>
              </div>
              <div v-if="cinema.phone">
                <dt><Phone aria-hidden="true" /> Liên hệ</dt>
                <dd>
                  <a v-if="phoneUrl" :href="phoneUrl">{{ cinema.phone }}</a
                  ><template v-else>{{ cinema.phone }}</template>
                </dd>
              </div>
              <div v-if="cinema.email">
                <dt><Mail aria-hidden="true" /> Email</dt>
                <dd>
                  <a v-if="emailUrl" :href="emailUrl">{{ cinema.email }}</a
                  ><template v-else>{{ cinema.email }}</template>
                </dd>
              </div>
            </dl>
            <p v-if="amenities.isPending.value" role="status">Đang tải tiện ích…</p>
            <div v-else-if="amenities.isError.value">
              <p role="alert">Chưa tải được tiện ích của rạp.</p>
              <AppButton
                size="sm"
                variant="ghost"
                :loading="amenities.isFetching.value"
                @click="amenities.refetch()"
                >Thử lại</AppButton
              >
            </div>
            <ul
              v-else-if="amenities.data.value?.length"
              class="customer-cinema-detail__tags"
              aria-label="Tiện ích"
            >
              <li v-for="item in amenities.data.value" :key="item">{{ item }}</li>
            </ul>
          </section>
          <section class="booking-panel">
            <h2>Trải nghiệm tại đây</h2>
            <p v-if="rooms.isPending.value" role="status">Đang tải thông tin phòng…</p>
            <div v-else-if="rooms.isError.value">
              <p role="alert">Chưa tải được các loại phòng.</p>
              <AppButton
                size="sm"
                variant="ghost"
                :loading="rooms.isFetching.value"
                @click="rooms.refetch()"
                >Thử lại</AppButton
              >
            </div>
            <ul v-else-if="experiences.length" class="customer-cinema-detail__experiences">
              <li v-for="item in experiences" :key="item.type">
                <strong>{{ item.name }}</strong
                ><span v-if="item.formats">{{ item.formats }}</span>
              </li>
            </ul>
            <p v-else>Thông tin phòng đang được cập nhật.</p>
            <AppLink :to="{ name: ROUTE_NAMES.EXPERIENCES }">Khám phá các trải nghiệm →</AppLink>
          </section>
        </div>
        <CinemaSchedule :key="cinemaId" :cinema-id="cinemaId" embedded />
      </template>
    </AppContainer>
  </div>
</template>

<style scoped>
@reference '../../../styles/main.css';
.customer-cinema-detail {
  --cinema-detail-cover-height: 18.75rem;
  --cinema-detail-panel-padding: 1.4375rem;
  --cinema-detail-title-size: 2.625rem;
  --cinema-detail-info-gap: 1.5625rem;
  --cinema-detail-tag-size: 0.6875rem;
  --cinema-detail-tag-background: #efeee8;
  min-width: 0;
}
.customer-cinema-detail__cover {
  height: var(--cinema-detail-cover-height);
  overflow: hidden;
  background: var(--lumiere-dark);
}
.customer-cinema-detail__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.customer-cinema-detail__content {
  padding-block: var(--space-10) var(--lumiere-section-space);
}
.customer-cinema-detail__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  margin-block: var(--space-6) var(--space-8);
}
.customer-cinema-detail__heading h1 {
  margin: 0;
  font-size: var(--cinema-detail-title-size);
  line-height: var(--line-height-heading);
  overflow-wrap: anywhere;
}
.customer-cinema-detail__heading p:last-child {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: 0;
}
.customer-cinema-detail__heading a svg {
  width: var(--icon-size-sm);
  height: var(--icon-size-sm);
}
.customer-cinema-detail__info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--cinema-detail-info-gap);
  margin-bottom: var(--lumiere-section-space);
}
.customer-cinema-detail__info .booking-panel {
  min-width: 0;
  padding: var(--cinema-detail-panel-padding);
  margin: 0;
}
.customer-cinema-detail__info h2 {
  font-size: var(--font-size-lg);
  margin: 0 0 var(--space-4);
}
.customer-cinema-detail__info p,
.customer-cinema-detail__contacts {
  font-size: var(--font-size-xs);
  line-height: var(--line-height-base);
  color: var(--color-text-secondary);
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.customer-cinema-detail__contacts {
  display: grid;
  gap: var(--space-3);
}
.customer-cinema-detail__contacts dt {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-semibold);
}
.customer-cinema-detail__contacts svg {
  width: var(--icon-size-sm);
  height: var(--icon-size-sm);
}
.customer-cinema-detail__contacts dd {
  margin: var(--space-1) 0 0;
}
.customer-cinema-detail__contacts a {
  color: var(--color-primary-hover);
}
.customer-cinema-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  list-style: none;
  padding: 0;
  margin: var(--space-4) 0 0;
}
.customer-cinema-detail__tags li {
  padding: var(--space-1) var(--space-2);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--cinema-detail-tag-background);
  font-size: var(--cinema-detail-tag-size);
  font-weight: var(--font-weight-semibold);
}
.customer-cinema-detail__experiences {
  display: grid;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--font-size-sm);
}
.customer-cinema-detail__experiences li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-3);
}
.customer-cinema-detail__experiences span {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
.customer-cinema-detail__map {
  background: var(--lumiere-dark);
  border-color: var(--lumiere-dark);
  color: var(--lumiere-white);
}
.customer-cinema-detail__map:hover {
  background: var(--lumiere-ink);
}
@variant lumiere-mobile {
  .customer-cinema-detail {
    --cinema-detail-cover-height: 13.75rem;
    --cinema-detail-title-size: 2rem;
    --cinema-detail-info-gap: 1.125rem;
  }
  .customer-cinema-detail__info {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
