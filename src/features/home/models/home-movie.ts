import type { MovieResponse } from '@/services/api/generated/movie-service/model/movieResponse'

export interface HomeMovie {
  id: string
  title: string
  description: string
  durationMinutes: number | null
  releaseDate: string | null
  posterUrl: string | null
  backdropUrl: string | null
  ageRating: NonNullable<MovieResponse['ageRating']> | null
  trailerUrl: string | null
  genres: string[]
  status: 'NOW_SHOWING' | 'UPCOMING'
}
