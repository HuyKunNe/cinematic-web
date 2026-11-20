const weekdays = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

// A cinema-local calendar key is already UTC+7. Do not shift it through the device timezone.
export function formatBookingDate(dateKey: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return ''
  const date = new Date(`${dateKey}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) return ''
  const [year, month, day] = dateKey.split('-')
  return `${weekdays[date.getUTCDay()]}, ${day}/${month}/${year}`
}
