export interface HomeMovie {
  id: string
  title: string
  description: string
  durationMinutes: number | null
  releaseDate: string | null
  posterUrl: string | null
  trailerUrl: string | null
  genres: string[]
  status: 'NOW_SHOWING' | 'UPCOMING'
}
