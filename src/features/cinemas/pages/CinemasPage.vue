<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppContainer from '@/components/ui/AppContainer.vue'
import AppEmptyState from '@/components/ui/AppEmptyState.vue'
import AppErrorState from '@/components/ui/AppErrorState.vue'
import AppLink from '@/components/ui/AppLink.vue'
import { ROUTE_NAMES } from '@/router/route-constants'
import { useCinemaLocation } from '../composables/use-cinema-location'
import type { CinemaLocation } from '../models/cinema-location.model'

const { query, cities, cinemas, selectedCinema, selectCinemaById } = useCinemaLocation()

const searchText = ref('')
const cityFilter = ref('')
const selectionError = ref('')

const hasData = computed(() => query.data.value !== undefined)
const canSelect = computed(() => query.isSuccess.value && !query.isFetching.value)

function normalizeSearch(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
}

const searchTerm = computed(() => normalizeSearch(searchText.value))

const hasFilters = computed(() => Boolean(searchTerm.value || cityFilter.value))

const filteredCinemas = computed(() =>
  cinemas.value.filter(
    (cinema) =>
      (!cityFilter.value || cinema.cityKey === cityFilter.value) &&
      (!searchTerm.value ||
        normalizeSearch(`${cinema.name} ${cinema.address}`).includes(searchTerm.value)),
  ),
)

const emptyTitle = computed(() =>
  hasFilters.value ? 'Không có rạp phù hợp' : 'Chưa có danh sách rạp',
)

const emptyDescription = computed(() =>
  hasFilters.value
    ? 'Thử tên rạp, địa chỉ khác hoặc chọn tất cả tỉnh, thành phố.'
    : 'Thông tin rạp sẽ được cập nhật trong thời gian tới.',
)

watch(cities, (options) => {
  if (cityFilter.value && !options.some((city) => city.key === cityFilter.value)) {
    cityFilter.value = ''
  }
})

function clearFilters() {
  searchText.value = ''
  cityFilter.value = ''
}

function chooseCinema(cinema: CinemaLocation) {
  selectionError.value = ''

  if (!selectCinemaById(cinema.id, cinema.cityKey)) {
    selectionError.value = 'Chưa thể chọn rạp. Vui lòng làm mới danh sách rồi thử lại.'
  }
}

function retry() {
  selectionError.value = ''
  void query.refetch()
}
</script>

<template>
  <div class="customer-cinemas">
    <AppContainer>
      <header class="customer-cinemas__intro">
        <nav class="customer-cinemas__breadcrumb" aria-label="Đường dẫn trang">
          <AppLink :to="{ name: ROUTE_NAMES.HOME }" variant="muted"> Trang chủ </AppLink>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Hệ thống rạp</span>
        </nav>

        <p class="customer-cinemas__eyebrow">Trải nghiệm điện ảnh</p>
        <h1>Một không gian, ngàn câu chuyện</h1>
        <p class="customer-cinemas__description">
          Tìm rạp phù hợp và chọn địa điểm cho buổi xem phim của bạn.
        </p>
      </header>

      <section
        class="customer-cinemas__browser"
        aria-label="Tìm và chọn rạp"
        :aria-busy="query.isFetching.value"
      >
        <form class="customer-cinemas__filters" role="search" aria-label="Tìm rạp" @submit.prevent>
          <label class="customer-cinemas__field">
            <span>Tìm theo tên rạp hoặc địa chỉ</span>
            <input
              v-model="searchText"
              name="cinema-search"
              type="search"
              autocomplete="off"
              placeholder="Nhập tên rạp hoặc địa chỉ"
              :disabled="query.isPending.value"
            />
          </label>

          <label class="customer-cinemas__field">
            <span>Tỉnh / thành phố</span>
            <select v-model="cityFilter" name="cinema-city" :disabled="query.isPending.value">
              <option value="">Tất cả tỉnh, thành phố</option>
              <option v-for="city in cities" :key="city.key" :value="city.key">
                {{ city.name }}
              </option>
            </select>
          </label>
        </form>

        <p class="customer-cinemas__selection" role="status" aria-live="polite" aria-atomic="true">
          <template v-if="selectedCinema">
            Rạp đang chọn:
            <strong>{{ selectedCinema.name }}</strong>
            · {{ selectedCinema.city }}
          </template>
          <template v-else> Chọn rạp để tiếp tục đặt vé. </template>
        </p>

        <p v-if="selectionError" class="customer-cinemas__error" role="alert">
          {{ selectionError }}
        </p>

        <p
          v-if="query.isPending.value && !hasData"
          class="customer-cinemas__description"
          role="status"
        >
          Đang tải danh sách rạp…
        </p>

        <AppErrorState
          v-else-if="query.isError.value && !hasData"
          title="Không thể tải danh sách rạp"
          description="Vui lòng kiểm tra kết nối và thử lại."
          show-retry
          :retrying="query.isFetching.value"
          @retry="retry"
        />

        <template v-else-if="hasData">
          <div v-if="query.isError.value" class="customer-cinemas__refresh-error" role="alert">
            <p>
              Chưa thể cập nhật danh sách. Đang hiển thị dữ liệu đã tải; vui lòng thử lại trước khi
              chọn rạp.
            </p>
            <AppButton variant="ghost" size="sm" :loading="query.isFetching.value" @click="retry">
              Thử lại
            </AppButton>
          </div>

          <div class="customer-cinemas__results-heading">
            <p role="status" aria-live="polite" aria-atomic="true">
              <strong>{{ filteredCinemas.length }} rạp</strong>
              phù hợp
            </p>

            <AppButton v-if="hasFilters" variant="ghost" size="sm" @click="clearFilters">
              Xóa bộ lọc
            </AppButton>
          </div>

          <AppEmptyState
            v-if="!filteredCinemas.length"
            :title="emptyTitle"
            :description="emptyDescription"
          />

          <ul v-else class="customer-cinemas__grid">
            <li v-for="cinema in filteredCinemas" :key="cinema.id" class="customer-cinemas__item">
              <article
                class="customer-cinemas__card"
                :class="{
                  'is-selected': selectedCinema?.id === cinema.id,
                }"
              >
                <div class="customer-cinemas__visual"><img src="/customer/cinema-placeholder.svg" alt="Không gian điện ảnh minh họa" loading="lazy" /></div>
                <div class="customer-cinemas__card-heading">
                  <p class="customer-cinemas__city">
                    {{ cinema.city }}
                  </p>
                  <span v-if="selectedCinema?.id === cinema.id" class="customer-cinemas__badge">
                    Đang chọn
                  </span>
                </div>

                <h2>{{ cinema.name }}</h2>

                <p class="customer-cinemas__address">
                  {{ cinema.address || 'Địa chỉ đang được cập nhật.' }}
                </p>

                <div class="customer-cinemas__actions">
                  <AppButton
                    variant="ghost"
                    :disabled="!canSelect"
                    :aria-label="`Chọn rạp ${cinema.name}`"
                    @click="chooseCinema(cinema)"
                  >
                    Chọn rạp
                  </AppButton>

                  <AppLink
                    v-if="selectedCinema?.id === cinema.id"
                    :to="{ name: ROUTE_NAMES.BOOKING_START }"
                    :disabled="!canSelect"
                  >
                    Đặt vé tại rạp này
                  </AppLink>
                </div>
              </article>
            </li>
          </ul>
        </template>
      </section>
    </AppContainer>
  </div>
</template>

<style scoped>
.customer-cinemas {
  --cinema-list-card-min-width: 28rem;
  --cinema-list-filter-min-width: 18rem;

  min-width: 0;
  padding-block: var(--space-8);
}

.customer-cinemas__intro {
  margin-bottom: var(--space-6);
}

.customer-cinemas__breadcrumb,
.customer-cinemas__card-heading,
.customer-cinemas__actions,
.customer-cinemas__results-heading,
.customer-cinemas__refresh-error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.customer-cinemas__breadcrumb {
  margin-bottom: var(--space-6);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.customer-cinemas__eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.customer-cinemas h1 {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: var(--font-size-3xl);
  line-height: var(--line-height-heading);
  overflow-wrap: anywhere;
}

.customer-cinemas__description,
.customer-cinemas__address {
  color: var(--color-text-secondary);
  line-height: var(--line-height-base);
}

.customer-cinemas__description {
  margin: var(--space-3) 0 0;
}

.customer-cinemas__browser {
  display: grid;
  gap: var(--space-5);
  min-width: 0;
}

.customer-cinemas__filters {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, var(--cinema-list-filter-min-width)), 1fr)
  );
  gap: var(--space-4);
  padding: var(--space-5);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.customer-cinemas__field {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.customer-cinemas__field input,
.customer-cinemas__field select {
  width: 100%;
  min-width: 0;
  min-height: var(--control-height-md);
  padding: var(--space-2) var(--space-3);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  background: var(--color-background);
  font: inherit;
  font-size: var(--font-size-md);
}

.customer-cinemas__field input:focus-visible,
.customer-cinemas__field select:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--space-1);
}

.customer-cinemas__field input:disabled,
.customer-cinemas__field select:disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}

.customer-cinemas__selection {
  margin: 0;
  color: var(--color-text-secondary);
  overflow-wrap: anywhere;
}

.customer-cinemas__selection strong {
  color: var(--color-text-primary);
}

.customer-cinemas__error,
.customer-cinemas__refresh-error {
  color: var(--color-error);
}

.customer-cinemas__error,
.customer-cinemas__refresh-error p,
.customer-cinemas__results-heading p {
  margin: 0;
}

.customer-cinemas__results-heading,
.customer-cinemas__card-heading {
  justify-content: space-between;
}

.customer-cinemas__grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, var(--cinema-list-card-min-width)), 1fr)
  );
  gap: var(--space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.customer-cinemas__item {
  display: flex;
  min-width: 0;
}

.customer-cinemas__card {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-6);
  border: var(--border-width-thin) solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--surface-gradient-panel);
}

.customer-cinemas__card.is-selected {
  border-color: var(--color-primary);
}

.customer-cinemas__city {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.customer-cinemas__badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-on-primary);
  background: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.customer-cinemas__card h2 {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: var(--font-size-xl);
  line-height: var(--line-height-heading);
  overflow-wrap: anywhere;
}

.customer-cinemas__address {
  margin: 0;
  overflow-wrap: anywhere;
}

.customer-cinemas__actions {
  margin-top: auto;
  padding-top: var(--space-2);
}
</style>
