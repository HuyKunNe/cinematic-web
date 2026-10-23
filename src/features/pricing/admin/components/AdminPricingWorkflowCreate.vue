<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import {
  NEW_PRICE_FORMATS,
  NEW_PRICE_ROWS,
  NEW_PRICE_SEATS,
  pricingWorkflowCreateSchema,
  useCreatePricingWorkflow,
  workflowCreateErrorMessage,
  type CreatedWorkflowPolicy,
  type NewPriceFormat,
} from '../api/admin-pricing-workflow-create'
import { normalizeFareAmount } from '../api/admin-pricing-fare-edit'

const props = defineProps<{
  cinemas: ReadonlyArray<{ id: string; name: string; active: boolean }>
  canCreate: boolean
  initialCinemaId?: string
}>()

const emit = defineEmits<{
  busy: [value: boolean]
  created: [value: CreatedWorkflowPolicy]
  cancel: []
}>()

function blankPrices() {
  return NEW_PRICE_ROWS.map(() => NEW_PRICE_SEATS.map(() => ''))
}

const formElement = ref<HTMLFormElement | null>(null)
const cinemaId = ref(props.initialCinemaId ?? '')
const effectiveFrom = ref('')
const selectedFormat = ref<NewPriceFormat>('2D')
const validationMessage = ref('')
const tried = ref(false)
const finished = ref(false)
const submitting = ref(false)

const tables = reactive<Record<NewPriceFormat, string[][]>>({
  '2D': blankPrices(),
  '3D': blankPrices(),
})

const { save, checkpoint, requiresCheck, completed, stageLabel } = useCreatePricingWorkflow(
  () => props.canCreate,
)

const activeTables = computed(() =>
  NEW_PRICE_FORMATS.filter((format) =>
    tables[format].some((row) => row.some((value) => value.trim() !== '')),
  ).map((contentFormat) => ({
    contentFormat,
    prices: tables[contentFormat].map((row) => [...row]),
  })),
)

const selectedCinema = computed(() => props.cinemas.find((item) => item.id === cinemaId.value))

const dirty = computed(
  () =>
    cinemaId.value !== (props.initialCinemaId ?? '') ||
    effectiveFrom.value !== '' ||
    activeTables.value.length > 0,
)

const saving = computed(() => submitting.value || save.isPending.value)

const frozen = computed(() => saving.value || checkpoint.value !== null || requiresCheck.value)

const editable = computed(() => props.canCreate && !frozen.value && !completed.value)

function invalidAmount(value: string | undefined) {
  return tried.value && normalizeFareAmount(value ?? '') === null
}

function dateLabel(value: string) {
  return value ? value.split('-').reverse().join('/') : 'Chưa chọn'
}

async function submit() {
  if (!props.canCreate || saving.value || requiresCheck.value || completed.value) return

  tried.value = true
  validationMessage.value = ''

  if (!selectedCinema.value) {
    validationMessage.value = 'Chọn rạp áp dụng.'
    return
  }

  const input = {
    cinemaId: cinemaId.value,
    effectiveFrom: effectiveFrom.value,
    tables: activeTables.value,
  }

  const parsed = pricingWorkflowCreateSchema.safeParse(input)

  if (!parsed.success) {
    validationMessage.value = parsed.error.issues[0]?.message ?? 'Kiểm tra thông tin bảng giá.'

    const incomplete = activeTables.value.find((table) =>
      table.prices.some((row) => row.some((value) => normalizeFareAmount(value) === null)),
    )

    if (incomplete) {
      selectedFormat.value = incomplete.contentFormat
      validationMessage.value = `Kiểm tra và nhập đủ 12 mức giá của bảng ${incomplete.contentFormat}.`
    }

    await nextTick()
    formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }

  submitting.value = true

  try {
    const policy = await save.mutateAsync(input)
    finished.value = true
    emit('created', policy)
  } catch {
    // Giữ dữ liệu và bước đã lưu để người dùng kiểm tra.
  } finally {
    submitting.value = false
  }
}

function confirmLeave() {
  if (saving.value) return false
  if (finished.value || !dirty.value) return true

  return window.confirm(
    checkpoint.value
      ? 'Một phần dữ liệu đã được lưu trong bản nháp. Quay lại danh sách và bỏ phần nhập chưa lưu?'
      : 'Bỏ các thông tin bảng giá đang nhập?',
  )
}

function cancel() {
  if (confirmLeave()) emit('cancel')
}

function preventUnload(event: BeforeUnloadEvent) {
  if ((!dirty.value && !saving.value) || finished.value) return
  event.preventDefault()
  event.returnValue = ''
}

watch(saving, (value) => emit('busy', value), {
  immediate: true,
  flush: 'sync',
})

onBeforeRouteLeave(confirmLeave)
onBeforeRouteUpdate(confirmLeave)
onMounted(() => window.addEventListener('beforeunload', preventUnload))
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', preventUnload)
  emit('busy', false)
})
</script>

<template>
  <form
    ref="formElement"
    class="pricing-workflow-create"
    :aria-busy="saving"
    novalidate
    @submit.prevent="submit"
  >
    <section class="pricing-workflow__card" aria-labelledby="create-info-title">
      <header class="pricing-workflow__card-heading">
        <span class="pricing-workflow__number" aria-hidden="true">1</span>
        <div>
          <h2 id="create-info-title">Thông tin bảng giá mới</h2>
          <p>Chọn rạp và ngày bắt đầu áp dụng.</p>
        </div>
      </header>

      <div class="pricing-workflow__fields">
        <label class="admin-reference__field">
          <span>Rạp áp dụng</span>
          <select
            v-model="cinemaId"
            class="admin-reference__input"
            :disabled="!editable"
            :aria-invalid="tried && !selectedCinema"
          >
            <option value="">Chọn rạp</option>
            <option v-for="cinema in cinemas" :key="cinema.id" :value="cinema.id">
              {{ cinema.name }}{{ cinema.active ? '' : ' · Ngừng hoạt động' }}
            </option>
          </select>
        </label>

        <label class="admin-reference__field">
          <span>Bắt đầu áp dụng từ ngày</span>
          <input
            v-model="effectiveFrom"
            class="admin-reference__input"
            type="date"
            :disabled="!editable"
            :aria-invalid="tried && !effectiveFrom"
          />
        </label>
      </div>
    </section>

    <section class="pricing-workflow__card" aria-labelledby="create-format-title">
      <header class="pricing-workflow__card-heading">
        <span class="pricing-workflow__number" aria-hidden="true">2</span>
        <div>
          <h2 id="create-format-title">Loại vé và hình thức chiếu</h2>
          <p>Nhập riêng giá 2D và 3D nếu rạp sử dụng cả hai.</p>
        </div>
      </header>

      <div class="pricing-workflow__fields">
        <div class="admin-reference__field">
          <span>Loại vé</span>
          <strong>Vé thông thường</strong>
          <small>Dành cho tất cả khách.</small>
        </div>

        <label class="admin-reference__field">
          <span>Hình thức chiếu đang nhập</span>
          <select v-model="selectedFormat" class="admin-reference__input" :disabled="!editable">
            <option v-for="format in NEW_PRICE_FORMATS" :key="format" :value="format">
              {{ format }}
            </option>
          </select>
        </label>
      </div>

      <p class="pricing-workflow__help">
        Chiếu thường · Suất chiếu thông thường. Chuyển giữa 2D và 3D vẫn giữ số tiền đã nhập cho
        từng bảng. Bảng chưa nhập giá sẽ không được tạo.
      </p>
    </section>

    <section class="pricing-workflow__card" aria-labelledby="create-prices-title">
      <header class="pricing-workflow__card-heading">
        <span class="pricing-workflow__number" aria-hidden="true">3</span>
        <div>
          <h2 id="create-prices-title">Nhập giá vé {{ selectedFormat }}</h2>
          <p>Nhập đủ 12 ô cho mỗi bảng muốn tạo. Đơn vị: đồng.</p>
        </div>
      </header>

      <div
        class="pricing-workflow-table__scroll"
        role="region"
        aria-label="Nhập giá theo ngày, giờ và loại ghế"
        tabindex="0"
      >
        <table class="pricing-workflow-table__table" role="table">
          <caption class="admin-visually-hidden">
            Giá vé thông thường
            {{
              selectedFormat
            }}
          </caption>
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">Ngày áp dụng</th>
              <th scope="col" role="columnheader">Giờ bắt đầu suất chiếu</th>
              <th v-for="seat in NEW_PRICE_SEATS" :key="seat.code" scope="col" role="columnheader">
                {{ seat.name }}
                <small class="pricing-workflow-table__unit">{{ seat.unit }}</small>
              </th>
            </tr>
          </thead>

          <tbody role="rowgroup">
            <tr
              v-for="(row, rowIndex) in NEW_PRICE_ROWS"
              :key="row.code"
              :class="{ 'pricing-workflow-table__holiday': row.code === 'HOLIDAYS' }"
              role="row"
            >
              <th scope="row" role="rowheader">{{ row.day }}</th>
              <td data-label="Giờ bắt đầu suất chiếu" role="cell">
                {{ row.time }}
              </td>

              <td
                v-for="(seat, seatIndex) in NEW_PRICE_SEATS"
                :key="seat.code"
                :data-label="`${seat.name} · ${seat.unit}`"
                role="cell"
              >
                <input
                  v-model="tables[selectedFormat][rowIndex]![seatIndex]"
                  class="admin-reference__input pricing-workflow-table__input"
                  type="text"
                  inputmode="numeric"
                  maxlength="25"
                  autocomplete="off"
                  placeholder="Chưa nhập"
                  :disabled="!editable"
                  :aria-label="`${seat.name}, ${row.day}, ${row.time}, ${selectedFormat}, ${seat.unit}`"
                  :aria-invalid="invalidAmount(tables[selectedFormat][rowIndex]?.[seatIndex])"
                />
                <small
                  v-if="invalidAmount(tables[selectedFormat][rowIndex]?.[seatIndex])"
                  class="pricing-error"
                >
                  Nhập số tiền nguyên hợp lệ.
                </small>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="pricing-workflow__help">
        Đúng 17:00 thuộc mức “Từ 17:00”. Giá ghế đôi tính một lần cho cả cặp. Giá lễ được nhập riêng
        ở dòng cuối.
      </p>
    </section>

    <section class="pricing-workflow__card" aria-labelledby="create-review-title">
      <header class="pricing-workflow__card-heading">
        <span class="pricing-workflow__number" aria-hidden="true">4</span>
        <div>
          <h2 id="create-review-title">Xem lại trước khi tạo</h2>
          <p>Bản nháp chưa được đưa vào sử dụng sau khi lưu.</p>
        </div>
      </header>

      <dl class="pricing-workflow__summary">
        <div>
          <dt>Rạp áp dụng</dt>
          <dd>{{ selectedCinema?.name ?? 'Chưa chọn' }}</dd>
        </div>
        <div>
          <dt>Bắt đầu áp dụng</dt>
          <dd>{{ dateLabel(effectiveFrom) }}</dd>
        </div>
        <div>
          <dt>Loại vé</dt>
          <dd>Vé thông thường</dd>
        </div>
        <div>
          <dt>Các bảng sẽ tạo</dt>
          <dd>
            {{
              activeTables.length
                ? activeTables.map((item) => item.contentFormat).join(', ')
                : 'Chưa nhập giá'
            }}
          </dd>
        </div>
      </dl>

      <p v-if="validationMessage" class="pricing-error" role="alert">
        {{ validationMessage }}
      </p>

      <p v-if="save.isError.value" class="pricing-error" role="alert">
        {{ workflowCreateErrorMessage(save.error.value) }}
      </p>

      <p v-if="checkpoint && !completed" class="pricing-workflow__help" role="status">
        Đã tạo bản nháp số {{ checkpoint.policy.policyVersion }}.
        {{
          requiresCheck
            ? 'Cần kiểm tra lại kết quả lưu.'
            : 'Các bước còn lại sẽ tiếp tục trên bản nháp này.'
        }}
      </p>

      <p v-if="saving" role="status">{{ stageLabel }}…</p>

      <footer class="pricing-workflow__actions">
        <AppButton type="button" variant="secondary" :disabled="saving" @click="cancel">
          {{ checkpoint || requiresCheck ? 'Quay lại danh sách' : 'Hủy' }}
        </AppButton>

        <AppButton
          v-if="!requiresCheck && !completed"
          type="submit"
          :loading="saving"
          :disabled="!canCreate || saving"
        >
          {{ checkpoint ? 'Tiếp tục lưu' : 'Tạo bản nháp' }}
        </AppButton>
      </footer>
    </section>
  </form>
</template>
