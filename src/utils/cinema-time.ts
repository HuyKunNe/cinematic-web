export const CINEMA_TIME_ZONE = 'Asia/Ho_Chi_Minh'

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CINEMA_TIME_ZONE,
  calendar: 'iso8601',
  numberingSystem: 'latn',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: CINEMA_TIME_ZONE,
  numberingSystem: 'latn',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// Date key đã là ngày của rạp.
// UTC chỉ dùng để định dạng ngày lịch này mà không phụ thuộc máy người dùng.
const calendarDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'UTC',
  calendar: 'iso8601',
  numberingSystem: 'latn',
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
})

function parseTimestamp(iso: string): Date | null {
  const date = new Date(iso)
  return Number.isFinite(date.getTime()) ? date : null
}

export function getCinemaDateKey(iso: string): string {
  const date = parseTimestamp(iso)
  if (!date) return ''

  const parts = dateKeyFormatter.formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return year && month && day ? `${year}-${month}-${day}` : ''
}

export function formatCinemaTime(iso: string): string {
  const date = parseTimestamp(iso)
  return date ? timeFormatter.format(date) : ''
}

export function formatCinemaDateKey(dateKey: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return ''

  const date = parseTimestamp(`${dateKey}T12:00:00Z`)

  if (!date || date.toISOString().slice(0, 10) !== dateKey) {
    return ''
  }

  return calendarDateFormatter.format(date)
}
