import type { MovieResponse } from '@/services/api/generated/movie-service/model/movieResponse'

type AgeRating = NonNullable<MovieResponse['ageRating']>

const labels: Record<AgeRating, string> = {
  P: 'P',
  K: 'K',
  T13: '13+',
  T16: '16+',
  T18: '18+',
}

export function formatAgeRating(value: AgeRating | null | undefined) {
  const label = value ? labels[value] : undefined

  if (!label) {
    return {
      label: '—',
      description: 'Chưa có thông tin phân loại độ tuổi',
    }
  }

  return {
    label,
    description: `Phân loại độ tuổi ${value}`,
  }
}
