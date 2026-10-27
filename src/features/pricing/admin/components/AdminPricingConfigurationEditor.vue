<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ReplacePricingConfigurationRequest } from '@/services/api/generated/inventory-service/model'
import {
  pricingContainsMinute,
  pricingMinuteLabel,
  type PricingMatrix,
} from '../api/admin-pricing-queries'

const props = defineProps<{
  matrix: PricingMatrix
  editable: boolean
}>()

const emit = defineEmits<{
  save: [request: ReplacePricingConfigurationRequest]
  dirty: [value: boolean]
}>()

type TimeRow = {
  key: string
  id?: string
  name: string
  start: string
  end: string
  order: string
}

type GroupRow = {
  key: string
  id?: string
  name: string
  description: string
  defaultGroup: boolean
  order: string
}

const times = ref<TimeRow[]>([])
const groups = ref<GroupRow[]>([])
const baseline = ref('')
const reviewed = ref(false)
const error = ref('')

const snapshot = computed(() =>
  JSON.stringify({
    times: times.value,
    groups: groups.value,
  }),
)
const dirty = computed(() => snapshot.value !== baseline.value)

function reset(): void {
  times.value = props.matrix.timeBands.map((item) => ({
    key: item.id,
    id: item.id,
    name: item.name,
    start: pricingMinuteLabel(item.startMinute),
    end: pricingMinuteLabel(item.endMinute),
    order: String(item.sortOrder),
  }))
  groups.value = props.matrix.ticketGroups.map((item) => ({
    key: item.id,
    id: item.id,
    name: item.name,
    description: item.eligibilityDescription,
    defaultGroup: item.defaultGroup,
    order: String(item.sortOrder),
  }))
  baseline.value = snapshot.value
  reviewed.value = false
  error.value = ''
}

watch(() => props.matrix, reset, { immediate: true })
watch(
  snapshot,
  () => {
    reviewed.value = false
    error.value = ''
  },
  { flush: 'sync' },
)
watch(dirty, (value) => emit('dirty', value), { immediate: true, flush: 'sync' })

const removedTimes = computed(() =>
  props.matrix.timeBands.filter((item) => !times.value.some((row) => row.id === item.id)),
)
const removedGroups = computed(() =>
  props.matrix.ticketGroups.filter((item) => !groups.value.some((row) => row.id === item.id)),
)
const affectedCells = computed(() =>
  props.matrix.cells.filter(
    (cell) =>
      removedTimes.value.some((item) => item.id === cell.timeBandId) ||
      removedGroups.value.some((item) => item.id === cell.ticketGroupId),
  ),
)
const pricedCount = computed(
  () => affectedCells.value.filter((cell) => cell.state === 'PRICED').length,
)
const notApplicableCount = computed(
  () => affectedCells.value.filter((cell) => cell.state === 'NOT_APPLICABLE').length,
)

function addTime(): void {
  times.value.push({
    key: crypto.randomUUID(),
    name: '',
    start: '',
    end: '',
    order: String(Math.max(-1, ...times.value.map((item) => Number(item.order) || 0)) + 1),
  })
}

function addGroup(): void {
  groups.value.push({
    key: crypto.randomUUID(),
    name: '',
    description: '',
    defaultGroup: false,
    order: String(Math.max(-1, ...groups.value.map((item) => Number(item.order) || 0)) + 1),
  })
}

function chooseDefault(key: string): void {
  for (const group of groups.value) group.defaultGroup = group.key === key
}

function minute(text: string, allow24: boolean): number {
  if (allow24 && text === '24:00') return 1440
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(text)) {
    throw new Error('Giờ phải có dạng HH:mm. Chỉ giờ kết thúc được dùng 24:00.')
  }
  const [hour, remainder] = text.split(':').map(Number)
  if (hour === undefined || remainder === undefined) throw new Error('Giờ chưa hợp lệ.')
  return hour * 60 + remainder
}

function order(text: string): number {
  const value = Number(text)
  if (!/^[0-9]+$/.test(text) || !Number.isSafeInteger(value)) {
    throw new Error('Thứ tự phải là số nguyên không âm.')
  }
  return value
}

function request(): ReplacePricingConfigurationRequest {
  if (!times.value.length || !groups.value.length) {
    throw new Error('Cần giữ ít nhất một khung giờ và một nhóm vé.')
  }

  const timeBands = times.value.map((row) => {
    const name = row.name.trim()
    const startMinute = minute(row.start, false)
    const endMinute = minute(row.end, true)

    if (!name || name.length > 120) throw new Error('Tên khung giờ cần từ 1 đến 120 ký tự.')
    if (startMinute === endMinute) {
      throw new Error(`Khung “${name}” có giờ bắt đầu và kết thúc trùng nhau.`)
    }

    return {
      ...(row.id ? { id: row.id } : {}),
      name,
      startMinute,
      endMinute,
      sortOrder: order(row.order),
    }
  })

  const occupied = new Set<number>()

  for (const band of timeBands) {
    const normalized = {
      ...band,
      endMinute: band.endMinute === 0 ? 1440 : band.endMinute,
    }
    for (let value = 0; value < 1440; value++) {
      if (!pricingContainsMinute(normalized, value)) continue
      if (occupied.has(value)) throw new Error('Các khung giờ đang chồng lấn.')
      occupied.add(value)
    }
  }

  const ticketGroups = groups.value.map((row) => {
    const name = row.name.trim()
    const description = row.description.trim()

    if (!name || name.length > 120) throw new Error('Tên nhóm vé cần từ 1 đến 120 ký tự.')
    if (description.length > 1000) throw new Error('Mô tả điều kiện tối đa 1.000 ký tự.')
    if (row.defaultGroup && description) {
      throw new Error(`Nhóm mặc định “${name}” phải để trống mô tả điều kiện.`)
    }

    return {
      ...(row.id ? { id: row.id } : {}),
      name,
      ...(description ? { eligibilityDescription: description } : {}),
      defaultGroup: row.defaultGroup,
      sortOrder: order(row.order),
    }
  })

  if (ticketGroups.filter((item) => item.defaultGroup).length !== 1) {
    throw new Error('Chọn đúng một nhóm vé mặc định và để trống điều kiện của nhóm đó.')
  }

  return { expectedVersion: props.matrix.version, timeBands, ticketGroups }
}

function review(): void {
  try {
    request()
    error.value = ''
    reviewed.value = true
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : 'Kiểm tra lại cấu hình.'
  }
}

function save(): void {
  if (!props.editable || !reviewed.value) return
  try {
    emit('save', request())
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : 'Kiểm tra lại cấu hình.'
  }
}
</script>

<template>
  <section class="price-space-top" aria-labelledby="pricing-definition-title">
    <h3 id="pricing-definition-title" class="price-section-title">Khung giờ và nhóm vé</h3>
    <p class="price-notice price-notice--info">
      Điểm bắt đầu được tính bao gồm, điểm kết thúc được tính loại trừ. 24:00 tương ứng phút 1440.
      Khung có giờ kết thúc nhỏ hơn giờ bắt đầu đi qua nửa đêm. Các khung không được chồng lấn; giờ
      nằm ngoài mọi khung sẽ không có giá áp dụng.
    </p>

    <h3 class="price-section-title">Khung giờ</h3>
    <div class="price-form-grid">
      <section v-for="(row, index) in times" :key="row.key" class="price-time-card">
        <div class="price-form-grid">
          <label class="price-field price-full">
            <span>Tên khung {{ index + 1 }}</span>
            <input v-model="row.name" class="price-control" maxlength="120" :disabled="!editable" />
          </label>
          <label class="price-field">
            <span>Bắt đầu, bao gồm</span>
            <input
              v-model="row.start"
              class="price-control"
              type="time"
              step="60"
              :disabled="!editable"
            />
          </label>
          <label class="price-field">
            <span>Kết thúc, loại trừ</span>
            <input
              v-model="row.end"
              class="price-control"
              type="text"
              inputmode="text"
              placeholder="HH:mm hoặc 24:00"
              maxlength="5"
              :disabled="!editable"
            />
          </label>
          <label class="price-field">
            <span>Thứ tự</span>
            <input
              v-model="row.order"
              class="price-control"
              inputmode="numeric"
              :disabled="!editable"
            />
          </label>
          <div class="price-actions">
            <button
              class="price-button price-button--small"
              type="button"
              :disabled="!editable"
              :aria-label="`Xóa khung ${row.name || index + 1}`"
              @click="times = times.filter((item) => item.key !== row.key)"
            >
              Xóa khung
            </button>
          </div>
        </div>
      </section>
    </div>

    <button
      class="price-button price-space-top"
      type="button"
      :disabled="!editable"
      @click="addTime"
    >
      Thêm khung giờ
    </button>

    <h3 class="price-section-title">Nhóm vé</h3>
    <p class="price-note">
      Tên chỉ dùng để hiển thị. Hệ thống không suy luận tuổi hoặc điều kiện từ tên. Cần đúng một
      nhóm mặc định không có điều kiện.
    </p>

    <div class="price-form-grid price-space-top">
      <section v-for="(row, index) in groups" :key="row.key" class="price-time-card">
        <div class="price-form-grid">
          <label class="price-field price-full">
            <span>Tên nhóm {{ index + 1 }}</span>
            <input v-model="row.name" class="price-control" maxlength="120" :disabled="!editable" />
          </label>
          <label class="price-field price-full">
            <span>Mô tả điều kiện</span>
            <textarea
              v-model="row.description"
              class="price-control"
              maxlength="1000"
              :disabled="!editable"
            />
          </label>
          <label class="price-field">
            <span>Thứ tự</span>
            <input
              v-model="row.order"
              class="price-control"
              inputmode="numeric"
              :disabled="!editable"
            />
          </label>
          <fieldset class="price-checks" :disabled="!editable">
            <legend>Nhóm mặc định</legend>
            <label>
              <input
                type="radio"
                name="pricing-default-ticket-group"
                :checked="row.defaultGroup"
                @change="chooseDefault(row.key)"
              />
              Dùng khi tra giá không chọn nhóm
            </label>
          </fieldset>
          <div class="price-actions price-full">
            <button
              class="price-button price-button--small"
              type="button"
              :disabled="!editable"
              :aria-label="`Xóa nhóm ${row.name || index + 1}`"
              @click="groups = groups.filter((item) => item.key !== row.key)"
            >
              Xóa nhóm
            </button>
          </div>
        </div>
      </section>
    </div>

    <button
      class="price-button price-space-top"
      type="button"
      :disabled="!editable"
      @click="addGroup"
    >
      Thêm nhóm vé
    </button>

    <p v-if="error" class="price-notice price-notice--error price-space-top" role="alert">
      {{ error }}
    </p>

    <div v-if="dirty" class="price-explain">
      <h3 class="price-section-title">Ảnh hưởng khi lưu toàn bộ cấu hình</h3>
      <p class="price-note">
        Xóa khung: {{ removedTimes.map((item) => item.name).join(', ') || 'Không có' }}.
      </p>
      <p class="price-note">
        Xóa nhóm vé: {{ removedGroups.map((item) => item.name).join(', ') || 'Không có' }}.
      </p>
      <p class="price-note">
        {{ affectedCells.length }} ô hiện có bị loại bỏ, gồm {{ pricedCount }} ô có giá bán và
        {{ notApplicableCount }} ô không áp dụng. Ô tham chiếu cả khung và nhóm bị xóa chỉ tính một
        lần.
      </p>
      <p class="price-note">
        Mục được giữ cùng ID sẽ giữ giá khi đổi tên, giờ, mô tả hoặc thứ tự. Mục mới được cấp ID sau
        khi lưu; các tổ hợp mới ở trạng thái chưa nhập.
      </p>

      <div class="price-actions price-space-top">
        <button
          v-if="!reviewed"
          class="price-button price-button--primary"
          type="button"
          :disabled="!editable"
          @click="review"
        >
          Kiểm tra cấu hình
        </button>
        <button
          v-else
          class="price-button price-button--primary"
          type="button"
          :disabled="!editable"
          @click="save"
        >
          Xác nhận lưu toàn bộ cấu hình
        </button>
        <button class="price-button" type="button" :disabled="!editable" @click="reset">
          Bỏ thay đổi cấu hình
        </button>
      </div>
    </div>
  </section>
</template>
