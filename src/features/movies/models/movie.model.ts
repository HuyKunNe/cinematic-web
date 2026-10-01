export type CatalogMovieStatus = 'NOW_SHOWING' | 'UPCOMING'

export interface MovieGenre {
  id: string
  name: string
}

export interface CatalogMovie {
  id: string
  title: string
  description: string
  durationMinutes: number | null
  releaseDate: string | null
  posterUrl: string | null
  trailerUrl: string | null
  genres: MovieGenre[]
  status: CatalogMovieStatus
}
