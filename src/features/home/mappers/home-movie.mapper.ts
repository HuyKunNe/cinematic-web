import type { MovieResponse } from '@/services/api/generated/movie-service/model/movieResponse'
import type { HomeMovie } from '../models/home-movie'

export function toHomeMovie(movie: MovieResponse): HomeMovie | null {
  if (
    !movie.id ||
    !movie.title ||
    (movie.status !== 'NOW_SHOWING' && movie.status !== 'UPCOMING')
  ) {
    return null
  }

  return {
    id: movie.id,
    title: movie.title,
    description: movie.description ?? '',
    durationMinutes: movie.durationMinutes ?? null,
    releaseDate: movie.releaseDate ?? null,
    posterUrl: movie.posterUrl ?? null,
    trailerUrl:
      movie.trailerUrl && /^https?:\/\//i.test(movie.trailerUrl) ? movie.trailerUrl : null,
    genres:
      movie.genres?.map((genre) => genre.name).filter((name): name is string => Boolean(name)) ??
      [],
    status: movie.status,
  }
}
