import type { MovieResponse } from '@/services/api/generated/movie-service/model/movieResponse'
import type { HomeMovie } from '../models/home-movie'

function normalizeTrailerUrl(value: string | null | undefined): string | null {
  const candidate = value?.trim()

  if (!candidate) return null

  try {
    const url = new URL(candidate)

    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

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
    trailerUrl: normalizeTrailerUrl(movie.trailerUrl),
    genres:
      movie.genres?.map((genre) => genre.name).filter((name): name is string => Boolean(name)) ??
      [],
    status: movie.status,
  }
}
