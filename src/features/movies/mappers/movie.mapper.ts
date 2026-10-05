import type { MovieResponse } from '@/services/api/generated/movie-service/model/movieResponse'
import type { CatalogMovie, MovieDetail, MovieGenre } from '../models/movie.model'

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

export function toMovieDetail(movie: MovieResponse): MovieDetail | null {
  const id = movie.id?.trim()
  const title = movie.title?.trim()
  const status = movie.status

  if (
    !id ||
    !title ||
    (status !== 'NOW_SHOWING' &&
      status !== 'UPCOMING' &&
      status !== 'ENDED' &&
      status !== 'INACTIVE')
  ) {
    return null
  }

  const genres: MovieGenre[] = []
  const seenGenreIds = new Set<string>()

  for (const genre of movie.genres ?? []) {
    const genreId = genre.id?.trim()
    const name = genre.name?.trim()

    if (!genreId || !name || seenGenreIds.has(genreId)) continue

    seenGenreIds.add(genreId)
    genres.push({ id: genreId, name })
  }

  return {
    id,
    title,
    description: movie.description ?? '',
    durationMinutes: movie.durationMinutes ?? null,
    releaseDate: movie.releaseDate ?? null,
    posterUrl: movie.posterUrl?.trim() || null,
    ageRating: movie.ageRating ?? null,
    trailerUrl: normalizeTrailerUrl(movie.trailerUrl),
    genres,
    status,
  }
}

export function toCatalogMovie(movie: MovieResponse): CatalogMovie | null {
  const detail = toMovieDetail(movie)

  if (!detail || (detail.status !== 'NOW_SHOWING' && detail.status !== 'UPCOMING')) {
    return null
  }

  return {
    ...detail,
    status: detail.status,
  }
}
