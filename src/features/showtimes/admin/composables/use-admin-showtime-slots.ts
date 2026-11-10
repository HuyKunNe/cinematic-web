import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { getShowtimeStartError, instantToLocal, localToInstant } from '../schemas/admin-showtime-create.schema'

// Client-side planning rows. This is not a batch API request or transport DTO.
type ShowtimeSlot = { id: string; startTime: string }

export function useAdminShowtimeSlots(input: {
  date: MaybeRefOrGetter<string>
  durationMinutes: MaybeRefOrGetter<number | null | undefined>
  breakMinutes: MaybeRefOrGetter<number | null>
  nowMilliseconds: MaybeRefOrGetter<number>
}) {
  const slots = ref<ShowtimeSlot[]>([{ id: crypto.randomUUID(), startTime: '' }])
  const multiple = computed(() => slots.value.length > 1)

  const rows = computed(() => {
    const date = toValue(input.date)
    const duration = toValue(input.durationMinutes)
    const breakMinutes = toValue(input.breakMinutes)
    const instant = (milliseconds: number) => {
      const value = new Date(milliseconds)
      return Number.isFinite(value.getTime()) ? value.toISOString() : ''
    }
    const label = (instant: string) => {
      const local = instantToLocal(instant)
      return local.startsWith(`${date}T`) ? local.slice(11) : local.replace('T', ' ')
    }
    const result = slots.value.map((slot) => {
      const startsAt = slot.startTime ? localToInstant(`${date}T${slot.startTime}`) : null
      const endsAt = startsAt && duration
        ? instant(Date.parse(startsAt) + duration * 60_000)
        : ''
      const readyAt = endsAt && breakMinutes !== null
        ? instant(Date.parse(endsAt) + breakMinutes * 60_000)
        : ''

      return {
        ...slot,
        startsAt,
        endsAt,
        readyAt,
        endLabel: endsAt ? label(endsAt) : '—',
        readyLabel: readyAt ? label(readyAt) : '—',
        error: getShowtimeStartError(date, slot.startTime, toValue(input.nowMilliseconds)),
      }
    })
    const scheduled = result.filter((row) => row.startsAt).sort((a, b) =>
      Date.parse(a.startsAt ?? '') - Date.parse(b.startsAt ?? ''),
    )
    for (let index = 1; index < scheduled.length; index += 1) {
      const previous = scheduled[index - 1]!
      const current = scheduled[index]!
      if (previous.startsAt === current.startsAt) {
        previous.error ||= 'Giờ bắt đầu bị trùng với khung giờ khác.'
        current.error ||= 'Giờ bắt đầu bị trùng với khung giờ khác.'
      } else if (previous.readyAt && Date.parse(previous.readyAt) > Date.parse(current.startsAt ?? '')) {
        previous.error ||= `Trùng khung ${current.startTime}, đã tính cả khoảng nghỉ.`
        current.error ||= `Trùng khung ${previous.startTime}, đã tính cả khoảng nghỉ.`
      }
    }
    return result
  })

  const complete = computed(() => rows.value.every((row) =>
    row.startsAt && row.endsAt && row.readyAt && !row.error,
  ))

  function add() {
    const slot = { id: crypto.randomUUID(), startTime: '' }
    slots.value.push(slot)
    return slot.id
  }

  function remove(id: string) {
    if (slots.value.length > 1) slots.value = slots.value.filter((slot) => slot.id !== id)
  }

  return { slots, rows, multiple, complete, add, remove }
}
