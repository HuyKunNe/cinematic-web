import { computed, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { getCinemaDayRange } from '@/utils/cinema-time'
import type { ShowtimePricingVersionOption } from '../api/admin-showtime-create'

export function useAdminShowtimePricing(input: {
  date: MaybeRefOrGetter<string>
  cinemaId: MaybeRefOrGetter<string>
  versions: MaybeRefOrGetter<readonly ShowtimePricingVersionOption[]>
  ready: MaybeRefOrGetter<boolean>
  locked: MaybeRefOrGetter<boolean>
  selectedId: Ref<string>
}) {
  const holiday = ref(false)
  const manual = ref(false)
  const dayGroup = computed<ShowtimePricingVersionOption['dayGroup'] | null>(() => {
    const date = toValue(input.date)
    if (!getCinemaDayRange(date)) return null
    if (holiday.value) return 'HOLIDAY'
    // The input is the cinema's calendar date; do not use the computer's time zone.
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
    return weekday === 0 || weekday === 6 ? 'WEEKEND' : 'WEEKDAY'
  })
  const dayLabel = computed(() => {
    if (dayGroup.value === 'HOLIDAY') return 'Ngày lễ/Tết'
    if (dayGroup.value === 'WEEKEND') return 'Cuối tuần'
    if (dayGroup.value === 'WEEKDAY') return 'Ngày thường'
    return 'Chưa chọn ngày'
  })
  const choices = computed(() => toValue(input.versions).filter((version) =>
    version.status === 'PUBLISHED' && version.dayGroup === dayGroup.value &&
    version.cinemaIds.includes(toValue(input.cinemaId)),
  ))
  const latestPolicies = computed(() => {
    const policies = new Map<string, ShowtimePricingVersionOption>()
    for (const version of choices.value) {
      const previous = policies.get(version.policyId)
      if (!previous || version.revision > previous.revision) policies.set(version.policyId, version)
    }
    return [...policies.values()]
  })

  watch([() => toValue(input.date), () => toValue(input.cinemaId), holiday],
    ([date], previous) => {
      if (toValue(input.locked)) return
      if (date !== previous[0]) holiday.value = false
      manual.value = false
      input.selectedId.value = ''
    }, { flush: 'sync' })

  watch([choices, () => toValue(input.ready), () => toValue(input.date), () => toValue(input.locked)], () => {
    if (toValue(input.locked) || !toValue(input.ready)) return
    if (manual.value) {
      // Preserve an explicit "no pricing" choice during refreshes as well.
      if (!input.selectedId.value || choices.value.some((item) => item.id === input.selectedId.value)) return
      manual.value = false
    }
    input.selectedId.value = latestPolicies.value.length === 1 ? latestPolicies.value[0]!.id : ''
  }, { immediate: true, flush: 'post' })

  function selectManually() {
    if (!toValue(input.locked)) manual.value = true
  }

  const hint = computed(() => {
    if (!toValue(input.cinemaId) || !dayGroup.value) return 'Chọn rạp và ngày chiếu để tự chọn bảng giá.'
    if (!toValue(input.ready)) return 'Đang kiểm tra bảng giá theo loại ngày.'
    if (!choices.value.length) return `Chưa có bảng giá ${dayLabel.value.toLocaleLowerCase('vi-VN')} đã công bố. Có thể lập lịch trước và gán bảng giá sau.`
    if (manual.value) return input.selectedId.value
      ? 'Đang dùng phiên bản bạn chọn. Đổi ngày hoặc loại ngày để tự chọn lại.'
      : 'Bạn đã chọn không gán bảng giá khi tạo suất.'
    if (latestPolicies.value.length > 1) return `Có ${latestPolicies.value.length} chính sách phù hợp. Hãy chọn bảng giá cần áp dụng.`
    return 'Tự chọn phiên bản đã công bố mới nhất cho loại ngày này. Bạn có thể chọn phiên bản khác.'
  })

  return { holiday, dayGroup, dayLabel, choices, hint, selectManually }
}
