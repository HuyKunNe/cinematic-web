export function formatBookingReference(value: string | null | undefined): string {
  return value ? value.slice(-6).toUpperCase() : '—'
}
