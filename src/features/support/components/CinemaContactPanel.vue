<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { MapPin, Phone, Mail, Clock3 } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppLink from '@/components/ui/AppLink.vue'
import { useCinemaLocation, useCinemaDetailQuery } from '@/features/cinemas'
import { ROUTE_NAMES } from '@/router/route-constants'

const { query, cinemas, selectedCinema } = useCinemaLocation()
const cinemaId = ref(selectedCinema.value?.id ?? '')
watch(
  cinemas,
  (items) => {
    if (!items.some((cinema) => cinema.id === cinemaId.value))
      cinemaId.value =
        items.find((cinema) => cinema.id === selectedCinema.value?.id)?.id ?? items[0]?.id ?? ''
  },
  { immediate: true },
)
const contact = useCinemaDetailQuery(cinemaId)
const cinema = computed(() => (contact.isSuccess.value ? contact.data.value : null))
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
  <section class="booking-panel customer-support__panel">
    <h2>Liên hệ hỗ trợ</h2>
    <p>
      Chọn rạp để xem kênh liên hệ đã được công bố. Khi cần kiểm tra giao dịch, hãy chuẩn bị mã đơn
      và thời điểm thanh toán.
    </p>
    <p v-if="query.isPending.value" role="status">Đang tải danh sách rạp…</p>
    <div v-else-if="query.isError.value">
      <p class="booking-error" role="alert">Chưa tải được danh sách rạp.</p>
      <AppButton variant="secondary" :loading="query.isFetching.value" @click="query.refetch()"
        >Thử lại</AppButton
      >
    </div>
    <p v-else-if="!cinemas.length">Chưa có rạp đang hoạt động để hiển thị thông tin liên hệ.</p>
    <template v-else>
      <label class="customer-support__field"
        ><span>Rạp cần liên hệ</span
        ><select v-model="cinemaId">
          <option v-for="item in cinemas" :key="item.id" :value="item.id">
            {{ item.name }} · {{ item.city }}
          </option>
        </select></label
      >
      <p v-if="contact.isPending.value" role="status">Đang tải thông tin liên hệ…</p>
      <div v-else-if="contact.isError.value">
        <p class="booking-error" role="alert">Chưa tải được thông tin liên hệ.</p>
        <AppButton
          variant="secondary"
          :loading="contact.isFetching.value"
          @click="contact.refetch()"
          >Thử lại</AppButton
        >
      </div>
      <template v-else-if="cinema">
        <h3>{{ cinema.name }}</h3>
        <dl class="customer-support__contacts">
          <div v-if="cinema.address">
            <dt><MapPin aria-hidden="true" /> Địa chỉ</dt>
            <dd>{{ cinema.address }}</dd>
          </div>
          <div v-if="cinema.openingHours">
            <dt><Clock3 aria-hidden="true" /> Giờ mở cửa</dt>
            <dd>{{ cinema.openingHours }}</dd>
          </div>
          <div v-if="cinema.phone">
            <dt><Phone aria-hidden="true" /> Điện thoại</dt>
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
        <p v-if="!cinema.phone && !cinema.email">
          Rạp chưa công bố số điện thoại hoặc email. Vui lòng kiểm tra lại thông tin rạp sau.
        </p>
        <AppLink :to="{ name: ROUTE_NAMES.CINEMA_DETAIL, params: { cinemaId } }"
          >Xem thông tin rạp →</AppLink
        >
      </template>
      <p v-else>Rạp hiện không hoạt động. Vui lòng chọn rạp khác.</p>
    </template>
    <p class="customer-support__note">
      Không chia sẻ mật khẩu, mã OTP, token hoặc thông tin thẻ đầy đủ khi trao đổi về đơn đặt vé.
    </p>
  </section>
</template>
