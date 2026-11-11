import { computed, nextTick, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useNow } from '@vueuse/core'
import { getCinemaDateKey, getCinemaDayRange } from '@/utils/cinema-time'
import type { CreateShowtimeBatchRequest, CreateShowtimeRequest } from '@/services/api/generated/inventory-service/model'
import { useShowtimeCreationOptions, isShowtimeCreationRejected, showtimeCreationErrorMessage } from '../api/admin-showtime-create'
import { BatchInputError, SHOWTIME_BATCH_LIMIT, useBatchRoomContexts, useCreateShowtimeBatch } from '../api/admin-showtime-batch'
import { getShowtimeStartError, localToInstant, instantToLocal, showtimeBreakMinutesSchema } from '../schemas/admin-showtime-create.schema'

// UI planning models. Transport requests always use the generated batch DTO.
type RoomPlan = { roomId: string; versionId: string; breakMinutes: string | number; times: { id: string; time: string }[] }
type DayPlan = { date: string; holiday: boolean }
export function useAdminShowtimeBatch(canManage: MaybeRefOrGetter<boolean>, canReadLayout: MaybeRefOrGetter<boolean>) {
  const cinemaId = ref('')
  const movieId = ref('')
  const holiday = ref(false)
  const dateInput = ref(getCinemaDateKey(new Date().toISOString()))
  const dates = computed<DayPlan[]>(() => getCinemaDayRange(dateInput.value) ? [{ date: dateInput.value, holiday: holiday.value }] : [])
  watch(dateInput, () => { holiday.value = false })
  const selectedRooms = ref<RoomPlan[]>([])
  const error = ref('')
  const checking = ref(false)
  const createdCount = ref(0)
  const uncertain = ref(false)
  const checkpoint = ref<{ cinemaId: string; request: CreateShowtimeBatchRequest } | null>(null)
  const serverErrors = ref<Record<number, string>>({})
  const now = useNow()
  const mutation = useCreateShowtimeBatch(canManage)
  const locked = computed(() => checking.value || mutation.isPending.value || uncertain.value || createdCount.value > 0)
  const options = useShowtimeCreationOptions(() => toValue(canManage) && !createdCount.value, cinemaId, movieId)
  const roomContexts = useBatchRoomContexts(() => selectedRooms.value.map((room) => room.roomId),
    () => toValue(canManage) && toValue(canReadLayout) && !createdCount.value)
  const movie = computed(() => options.movies.data.value?.find((item) => item.id === movieId.value))
  function compatible(roomId: string) {
    const room = options.rooms.data.value?.find((item) => item.id === roomId)
    if (!room) return []
    return (options.screeningVersions.data.value ?? []).filter((version) => version.active &&
      version.movieId === movieId.value && room.contentFormats.includes(version.contentFormat) &&
      (version.projectionTechnology === 'STANDARD' ? ['STANDARD', 'VIP'].includes(room.roomType) : version.projectionTechnology === room.roomType))
  }
  function dayGroup(day: DayPlan) {
    if (day.holiday) return 'HOLIDAY'
    const weekday = new Date(`${day.date}T12:00:00Z`).getUTCDay()
    return [0, 5, 6].includes(weekday) ? 'WEEKEND' : 'WEEKDAY'
  }
  function dayLabel(day: DayPlan) {
    return { HOLIDAY: 'Lễ/Tết', WEEKEND: 'Cuối tuần', WEEKDAY: 'Ngày thường' }[dayGroup(day)]
  }
  function pricingFor(day: DayPlan) {
    const latest = new Map<string, NonNullable<typeof options.pricingVersions.data.value>[number]>()
    for (const version of options.pricingVersions.data.value ?? []) {
      if (version.status !== 'PUBLISHED' || version.dayGroup !== dayGroup(day) || !version.cinemaIds.includes(cinemaId.value)) continue
      const previous = latest.get(version.policyId)
      if (!previous || version.revision > previous.revision) latest.set(version.policyId, version)
    }
    return latest.size === 1 ? [...latest.values()][0] : undefined
  }
  function slotTiming(plan: RoomPlan, time: string, date = dates.value[0]?.date ?? getCinemaDateKey(now.value.toISOString())) {
    const start = localToInstant(`${date}T${time}`)
    const duration = movie.value?.durationMinutes
    const rest = showtimeBreakMinutesSchema.safeParse(plan.breakMinutes)
    const end = start && duration ? new Date(Date.parse(start) + duration * 60_000) : null
    const endsAt = end && Number.isFinite(end.getTime()) ? end.toISOString() : ''
    const ready = endsAt && rest.success ? new Date(Date.parse(endsAt) + rest.data * 60_000) : null
    const readyAt = ready && Number.isFinite(ready.getTime()) ? ready.toISOString() : ''
    function label(instant: string) {
      if (!instant) return '—'
      const local = instantToLocal(instant)
      const offset = Math.round((Date.parse(`${local.slice(0, 10)}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000)
      return `${local.slice(11)}${offset > 0 ? ` (+${offset} ngày)` : ''}`
    }
    return { start, endsAt, readyAt, endLabel: label(endsAt), readyLabel: label(readyAt) }
  }
  const preview = computed(() => {
    const rows: { key: string; date: string; time: string; roomId: string; roomName: string; endsAt: string;
      readyAt: string; errors: string[]; request: CreateShowtimeRequest | null }[] = []
    for (const day of dates.value) for (const plan of selectedRooms.value) for (const slot of plan.times) {
      const errors: string[] = []
      const room = options.rooms.data.value?.find((item) => item.id === plan.roomId && item.cinemaId === cinemaId.value)
      const version = compatible(plan.roomId).find((item) => item.id === plan.versionId)
      const pricing = pricingFor(day)
      const context = roomContexts.contexts.value.get(plan.roomId)
      const rest = showtimeBreakMinutesSchema.safeParse(plan.breakMinutes)
      const { start, endsAt, readyAt } = slotTiming(plan, slot.time, day.date)
      if (!room) errors.push('Phòng không còn hoạt động hoặc không thuộc rạp.')
      if (!version) errors.push('Chọn phiên bản chiếu tương thích với phòng.')
      if (!slot.time || !start) errors.push('Chọn giờ bắt đầu hợp lệ.')
      const timing = getShowtimeStartError(day.date, slot.time, now.value.getTime())
      if (timing) errors.push(timing)
      if (movie.value?.releaseDate && day.date < movie.value.releaseDate) errors.push('Ngày chiếu trước ngày khởi chiếu phim.')
      if (!endsAt) errors.push('Phim thiếu thời lượng hợp lệ.')
      if (!rest.success) errors.push('Khoảng nghỉ phải từ 0 đến 120 phút.')
      if (endsAt && rest.success && !readyAt) errors.push('Thời gian phòng sẵn sàng không hợp lệ.')
      if (!pricing) errors.push('Chưa xác định duy nhất bảng giá đã công bố cho loại ngày này.')
      if (!context) errors.push('Chưa tải được lịch và sơ đồ phòng.')
      const request: CreateShowtimeRequest | null = start && endsAt && rest.success && version && pricing && room && movie.value && context
        ? { movieId: movie.value.id, roomId: room.id, movieScreeningVersionId: version.id,
          startsAt: start, endsAt, breakMinutes: rest.data, pricingPolicyVersionId: pricing.id,
          ...(context.layoutId ? { roomLayoutId: context.layoutId } : {}) } : null
      if (request && readyAt) for (const existing of context?.showtimes ?? []) {
        if (Date.parse(request.startsAt) < Date.parse(existing.scheduling!.readyAt) &&
          Date.parse(existing.startsAt) < Date.parse(readyAt)) {
          errors.push(`Trùng lịch phòng lúc ${instantToLocal(existing.startsAt).replace('T', ' ')} (gồm khoảng nghỉ).`)
        }
      }
      rows.push({ key: `${day.date}:${plan.roomId}:${slot.id}`, date: day.date, time: slot.time,
        roomId: plan.roomId, roomName: room?.name ?? 'Phòng không còn khả dụng', endsAt, readyAt, errors, request })
    }
    for (let a = 0; a < rows.length; a++) for (let b = a + 1; b < rows.length; b++) {
      const first = rows[a]!, second = rows[b]!
      if (first.roomId === second.roomId && first.request && second.request && first.readyAt && second.readyAt &&
        Date.parse(first.request.startsAt) < Date.parse(second.readyAt) && Date.parse(second.request.startsAt) < Date.parse(first.readyAt)) {
        first.errors.push(`Trùng suất trong đợt: ${second.date} ${second.time}.`)
        second.errors.push(`Trùng suất trong đợt: ${first.date} ${first.time}.`)
      }
    }
    rows.forEach((row, index) => { if (serverErrors.value[index]) row.errors.push(serverErrors.value[index]!) })
    return rows
  })
  const optionsReady = computed(() => Boolean(options.cinemas.data.value?.some((item) => item.id === cinemaId.value)) &&
    Boolean(movie.value) && Object.values(options).every((query) => query.isSuccess.value && !query.isFetching.value))
  const canSave = computed(() => toValue(canManage) && toValue(canReadLayout) && !locked.value && optionsReady.value &&
    roomContexts.ready.value && preview.value.length > 0 && preview.value.length <= SHOWTIME_BATCH_LIMIT &&
    preview.value.every((row) => row.request && !row.errors.length))
  const sourceKey = computed(() => JSON.stringify({ cinema: cinemaId.value, movie: movieId.value, dates: dates.value, rooms: selectedRooms.value }))
  watch(sourceKey, () => { serverErrors.value = {}; error.value = ''; if (!uncertain.value) checkpoint.value = null })
  watch(cinemaId, () => { selectedRooms.value = [] })
  watch(movieId, () => { for (const room of selectedRooms.value) room.versionId = '' })
  function toggleRoom(id: string) {
    if (locked.value) return
    const found = selectedRooms.value.find((item) => item.roomId === id)
    if (found) selectedRooms.value = selectedRooms.value.filter((item) => item !== found)
    else selectedRooms.value.push({ roomId: id, versionId: '', breakMinutes: '', times: [{ id: crypto.randomUUID(), time: '' }] })
  }
  async function refresh() {
    const requests: Promise<unknown>[] = [options.cinemas.refetch({ throwOnError: true }), options.movies.refetch({ throwOnError: true })]
    if (cinemaId.value) requests.push(options.rooms.refetch({ throwOnError: true }), options.pricingVersions.refetch({ throwOnError: true }))
    if (movieId.value) requests.push(options.screeningVersions.refetch({ throwOnError: true }))
    if (selectedRooms.value.length && toValue(canReadLayout)) requests.push(roomContexts.refresh())
    await Promise.all(requests)
    await nextTick()
  }
  async function sendCheckpoint() {
    const input = checkpoint.value
    if (!input || mutation.isPending.value) return
    error.value = ''
    try {
      const result = await mutation.mutateAsync(input)
      createdCount.value = result.length
      uncertain.value = false
    } catch (cause) {
      const rejected = cause instanceof BatchInputError || isShowtimeCreationRejected(cause)
      uncertain.value = !rejected
      error.value = rejected ? showtimeCreationErrorMessage(cause) :
        'Chưa xác nhận được kết quả. Đợt đã khóa; gửi lại cùng yêu cầu để nhận đúng kết quả, không tạo trùng.'
      if (rejected) {
        checkpoint.value = null
        if (typeof cause === 'object' && cause !== null && 'fieldErrors' in cause && Array.isArray(cause.fieldErrors)) {
          for (const detail of cause.fieldErrors) {
            if (typeof detail?.field !== 'string') continue
            const match = /^showtimes\[(\d+)\]/.exec(detail.field)
            if (match) serverErrors.value[Number(match[1])] = error.value
          }
        }
        try { await roomContexts.refresh() } catch { /* The query exposes its error and blocks saving. */ }
      }
    }
  }
  async function recheck() {
    if (locked.value) return
    checking.value = true
    error.value = ''
    try { await refresh(); serverErrors.value = {} }
    catch (cause) { error.value = showtimeCreationErrorMessage(cause) }
    finally { checking.value = false }
  }
  async function save() {
    if (!canSave.value) return
    checking.value = true
    error.value = ''
    try {
      await refresh()
      if (!optionsReady.value || !roomContexts.ready.value || preview.value.some((row) => row.errors.length || !row.request)) {
        error.value = 'Lịch hoặc cấu hình đã thay đổi. Sửa tất cả lỗi trong danh sách trước khi lưu đợt.'
        return
      }
      checkpoint.value = { cinemaId: cinemaId.value, request: { clientRequestId: crypto.randomUUID(),
        showtimes: preview.value.map((row) => ({ ...row.request! })) } }
      await sendCheckpoint()
    } catch (cause) { error.value = showtimeCreationErrorMessage(cause) }
    finally { checking.value = false }
  }
  return { cinemaId, movieId, movie, dateInput, holiday, selectedRooms, options, roomContexts, compatible,
    dayLabel, pricingFor, slotTiming, preview, canSave, locked, createdCount, uncertain, checking, error,
    toggleRoom, save, retry: sendCheckpoint, sending: mutation.isPending, sourceKey, recheck, limit: SHOWTIME_BATCH_LIMIT }
}
