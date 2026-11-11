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
  const dayGroup = computed<ShowtimePricingVersionOption['dayGroup'] | null>(() => {
    const date = toValue(input.date)
    if (!getCinemaDayRange(date)) return null
    if (holiday.value) return 'HOLIDAY'
    // The input is the cinema's calendar date; do not use the computer's time zone.
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
    return weekday === 0 || weekday === 5 || weekday === 6 ? 'WEEKEND' : 'WEEKDAY'
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
  const assignedVersion = computed(() =>
    latestPolicies.value.length === 1 ? latestPolicies.value[0] : undefined,
  )

  watch([() => toValue(input.date), () => toValue(input.cinemaId), holiday],
    ([date], previous) => {
      if (toValue(input.locked)) return
      if (date !== previous[0]) holiday.value = false
      input.selectedId.value = ''
    }, { flush: 'sync' })

  watch([choices, () => toValue(input.ready), () => toValue(input.date), () => toValue(input.locked)], () => {
    if (toValue(input.locked) || !toValue(input.ready)) return
    input.selectedId.value = assignedVersion.value?.id ?? ''
  }, { immediate: true, flush: 'post' })

  const hint = computed(() => {
    if (!toValue(input.cinemaId) || !dayGroup.value) return 'Chọn rạp và ngày chiếu để tự chọn bảng giá.'
    if (!toValue(input.ready)) return 'Đang kiểm tra bảng giá theo loại ngày.'
    if (!choices.value.length) return `Chưa có bảng giá ${dayLabel.value.toLocaleLowerCase('vi-VN')} đã công bố. Cần công bố bảng giá phù hợp trước khi tạo suất.`
    if (latestPolicies.value.length > 1) return `Có ${latestPolicies.value.length} chính sách cùng phù hợp, chưa thể tự gán duy nhất một bảng giá. Cần rà soát cấu hình chính sách giá của cụm rạp.`
    return 'Tự gán phiên bản đã công bố mới nhất theo cụm rạp và loại ngày.'
  })

  return { holiday, dayGroup, dayLabel, assignedVersion, hint }
}
