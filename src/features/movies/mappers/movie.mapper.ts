import type { MovieResponse } from '@/services/api/generated/movie-service/model/movieResponse'
import type { CatalogMovie, MovieGenre } from '../models/movie.model'

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

export function toCatalogMovie(movie: MovieResponse): CatalogMovie | null {
  const id = movie.id?.trim()
  const title = movie.title?.trim()

  if (!id || !title || (movie.status !== 'NOW_SHOWING' && movie.status !== 'UPCOMING')) {
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
    status: movie.status,
  }
}
