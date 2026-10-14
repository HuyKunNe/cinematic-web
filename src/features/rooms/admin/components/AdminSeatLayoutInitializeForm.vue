<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, useId, watch } from 'vue'
import { z } from 'zod'
import AppButton from '@/components/ui/AppButton.vue'
import type {
  ReplaceRoomLayoutContentRequest,
  RoomLayoutContentResponse,
} from '@/services/api/generated/inventory-service/model'
import { useAdminRoomSeatsQuery } from '../api/admin-seat-queries'
import { useReplaceAdminRoomLayoutContentMutation } from '../api/admin-room-layout-queries'
import { mapAdminSeatCatalog } from '../mappers/admin-seat-catalog.mapper'
import { toAdminRoomLayoutContentRequest } from '../mappers/admin-room-layout-content.mapper'
import {
  ADMIN_SEAT_LAYOUT_GEOMETRY,
  buildAdminSeatLayoutRequest,
  buildAdminSeatMatrix,
} from '../mappers/admin-seat-layout.mapper'
import { adminRoomErrorMessage } from '../schemas/admin-room.schema'

const props = defineProps<{
  content: RoomLayoutContentResponse
  enabled: boolean
}>()

const emit = defineEmits<{
  busy: [value: boolean]
  saved: [count: number]
  failed: []
  cancel: []
}>()

const coordinate = z
  .string()
  .trim()
  .regex(/^\d{1,9}(?:\.\d+)?$/, 'Nhập tọa độ không âm, tối đa 9 chữ số phần nguyên.')
  .transform(Number)
  .refine(Number.isFinite, 'Tọa độ không hợp lệ.')
  .transform(Math.round)
  .refine((value) => value <= 999999999, 'Tọa độ sau làm tròn vượt giới hạn.')

const schema = z.object({ x: coordinate, y: coordinate })
const fields = [
  { key: 'x', label: 'X bắt đầu vùng ghế' },
  { key: 'y', label: 'Y bắt đầu vùng ghế' },
] as const

type Field = (typeof fields)[number]['key']

const prefix = useId()
const form = ref<HTMLFormElement | null>(null)
const values = reactive({ x: '', y: '' })
const errors = ref<Partial<Record<Field, string>>>({})
const requestError = ref('')
const blocked = ref(false)

// Capture layout metadata and full request when opening the form.
const layout = { ...props.content.layout }
const baseline = toAdminRoomLayoutContentRequest(props.content)

const seatsQuery = useAdminRoomSeatsQuery(layout.roomId, () => props.enabled)
const mutation = useReplaceAdminRoomLayoutContentMutation()
const busy = computed(() => mutation.isPending.value)

const catalog = computed(() => {
  if (!seatsQuery.data.value) return { matrix: null, error: '' }

  try {
    return {
      matrix: mapAdminSeatCatalog(seatsQuery.data.value, layout.roomId),
      error: '',
    }
  } catch (error) {
    return {
      matrix: null,
      error: adminRoomErrorMessage(error, 'Danh mục ghế không hợp lệ.'),
    }
  }
})

const capacityMatrix = computed(() => {
  const seats = catalog.value.matrix?.seats
  if (!seats) return null

  return buildAdminSeatMatrix(
    seats.map((seat) => ({
      seatId: seat.id,
      seatNumber: seat.seatNumber,
      rowLabel: seat.rowLabel,
      type: seat.seatType!,
    })),
  )
})

const canSave = computed(
  () =>
    props.enabled &&
    !busy.value &&
    !blocked.value &&
    seatsQuery.isSuccess.value &&
    !seatsQuery.isFetching.value &&
    Boolean(catalog.value.matrix?.seats.length),
)

watch(busy, (value) => emit('busy', value), { flush: 'sync' })
onBeforeUnmount(() => emit('busy', false))

function update(field: Field, event: Event) {
  values[field] = (event.target as HTMLInputElement).value
  delete errors.value[field]
  requestError.value = ''
}

function normalize(field: Field) {
  const parsed = coordinate.safeParse(values[field])
  if (parsed.success) values[field] = parsed.data.toFixed(2)
}

async function focusError() {
  await nextTick()
  form.value?.querySelector<HTMLElement>('[aria-invalid="true"], [data-request-error]')?.focus()
}

async function submit() {
  if (!canSave.value || !seatsQuery.data.value) return

  errors.value = {}
  requestError.value = ''

  const parsed = schema.safeParse(values)

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === 'x' || field === 'y') {
        errors.value[field] ??= issue.message
      }
    }

    await focusError()
    return
  }

  values.x = parsed.data.x.toFixed(2)
  values.y = parsed.data.y.toFixed(2)

  let input: ReplaceRoomLayoutContentRequest

  try {
    input = buildAdminSeatLayoutRequest(
      layout,
      baseline,
      seatsQuery.data.value,
      parsed.data.x,
      parsed.data.y,
    )
  } catch (error) {
    requestError.value = adminRoomErrorMessage(error)
    await focusError()
    return
  }

  try {
    await mutation.mutateAsync({
      roomId: layout.roomId,
      layoutId: layout.id,
      input,
    })

    emit('saved', input.seats.length)
  } catch (error) {
    blocked.value = true
    requestError.value = adminRoomErrorMessage(error, 'Không thể khởi tạo geometry ghế.')
    emit('failed')
    await focusError()
  }
}

defineExpose({ submit, canSave })
</script>

<template>
  <form
    ref="form"
    class="layout-draft-form"
    aria-label="Khởi tạo geometry ghế"
    novalidate
    @submit.prevent="submit"
  >
    <header class="layout-canvas-heading">
      <div>
        <p class="layout-inspector__eyebrow">KHỞI TẠO VỊ TRÍ GHẾ</p>
        <h2>Xếp ghế theo hàng</h2>
      </div>
    </header>

    <p class="layout-muted">Tạo vị trí cho toàn bộ ghế của phòng theo thứ tự hàng hiện có.</p>

    <p v-if="seatsQuery.isFetching.value" class="layout-muted" role="status">
      Đang tải danh mục ghế…
    </p>

    <p v-if="seatsQuery.isError.value" class="layout-error" role="alert">
      {{ adminRoomErrorMessage(seatsQuery.error.value, 'Không thể tải ghế của phòng.') }}
    </p>

    <p v-if="catalog.error" class="layout-error" role="alert">
      {{ catalog.error }}
    </p>

    <p v-if="catalog.matrix" class="layout-muted">
      {{ catalog.matrix.seats.length }} ghế · {{ catalog.matrix.rows.length }} hàng ·
      {{ capacityMatrix?.columnCount ?? 0 }} ô ngang. Ghế {{ ADMIN_SEAT_LAYOUT_GEOMETRY.width }} ×
      {{ ADMIN_SEAT_LAYOUT_GEOMETRY.height }}, khoảng cách ngang/dọc
      {{ ADMIN_SEAT_LAYOUT_GEOMETRY.gapX }} đơn vị layout. Ghế đôi chiếm hai ô, rộng 120. X/Y bắt
      đầu là tọa độ ghế A1.
    </p>

    <fieldset class="layout-draft-fields" :disabled="busy || blocked || !enabled">
      <label v-for="field in fields" :key="field.key" class="layout-field">
        <span>{{ field.label }} *</span>
        <input
          :id="`${prefix}-${field.key}`"
          type="text"
          inputmode="decimal"
          required
          :value="values[field.key]"
          :aria-invalid="Boolean(errors[field.key])"
          :aria-describedby="errors[field.key] ? `${prefix}-${field.key}-error` : undefined"
          @input="update(field.key, $event)"
          @blur="normalize(field.key)"
        />
        <span
          v-if="errors[field.key]"
          :id="`${prefix}-${field.key}-error`"
          class="layout-error"
          role="alert"
        >
          {{ errors[field.key] }}
        </span>
      </label>
    </fieldset>

    <p v-if="requestError" class="layout-error" role="alert" tabindex="-1" data-request-error>
      {{ requestError }}
      <template v-if="blocked"> Đóng form và tải lại nội dung trước khi thử lại. </template>
    </p>

    <AppButton
      variant="secondary"
      :disabled="busy || blocked"
      :loading="seatsQuery.isFetching.value"
      @click="seatsQuery.refetch()"
    >
      Tải lại ghế catalog
    </AppButton>

    <AppButton type="submit" :disabled="!canSave" :loading="busy">
      Khởi tạo và lưu vị trí ghế
    </AppButton>

    <AppButton variant="secondary" :disabled="busy" @click="emit('cancel')"> Đóng form </AppButton>
  </form>
</template>
