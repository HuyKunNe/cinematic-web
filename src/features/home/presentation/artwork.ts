import type { HomeMovie } from '../models/home-movie'

// Project-owned visual fallbacks, selected deterministically by movie ID.
const fallbackImages = [
  '/home/space.jpg',
  '/home/cinema.jpg',
  '/home/city.jpg',
  '/home/night.jpg',
  '/home/island.jpg',
] as const

export function fallbackArtwork(movieId: string): string {
  let hash = 0

  for (const character of movieId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }

  return fallbackImages[hash % fallbackImages.length] ?? fallbackImages[0]
}

export function movieArtwork(movie: HomeMovie): string {
  return movie.posterUrl?.trim() || fallbackArtwork(movie.id)
}

export function heroArtworkCandidates(movie: HomeMovie): string[] {
  const candidates = [movie.backdropUrl, movie.posterUrl, fallbackArtwork(movie.id)].flatMap(
    (value) => {
      const candidate = value?.trim()
      return candidate ? [candidate] : []
    },
  )

  return [...new Set(candidates)]
}

export function formatReleaseDate(value: string | null): string {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}.${month}.${year}` : value
}
