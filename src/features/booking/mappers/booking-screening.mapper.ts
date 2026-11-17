import type { ShowtimeScreeningVersionResponse } from '@/services/api/generated/inventory-service/model/showtimeScreeningVersionResponse'

const technologyLabels: Record<
  NonNullable<ShowtimeScreeningVersionResponse['projectionTechnology']>,
  string
> = {
  STANDARD: 'Tiêu chuẩn',
  IMAX: 'IMAX',
  FOUR_DX: '4DX',
  SCREEN_X: 'ScreenX',
}

export function formatBookingScreeningVersion(
  version: ShowtimeScreeningVersionResponse | null | undefined,
): string {
  if (!version) return ''
  const audio = version.audioLanguage?.trim()
  const subtitle = version.subtitleLanguage?.trim()
  return [
    version.contentFormat,
    version.projectionTechnology && version.projectionTechnology !== 'STANDARD'
      ? technologyLabels[version.projectionTechnology]
      : '',
    version.presentationType === 'DUBBED'
      ? ['Lồng tiếng', audio].filter(Boolean).join(' ')
      : audio
        ? `Âm thanh ${audio}`
        : '',
    version.presentationType === 'NO_SUBTITLES'
      ? 'Không phụ đề'
      : subtitle || version.presentationType === 'SUBTITLED'
        ? ['Phụ đề', subtitle].filter(Boolean).join(' ')
        : '',
  ]
    .filter(Boolean)
    .join(' · ')
}
