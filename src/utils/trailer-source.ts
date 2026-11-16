export function resolveTrailerSource(value: string | null | undefined) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    const host = url.hostname.toLowerCase()
    let videoId: string | null = null
    if (host === 'youtu.be') videoId = url.pathname.split('/')[1] ?? null
    else if (
      ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(host)
    ) {
      videoId =
        url.pathname === '/watch'
          ? url.searchParams.get('v')
          : /^\/(embed|shorts)\/[^/]+\/?$/.test(url.pathname)
            ? (url.pathname.split('/')[2] ?? null)
            : null
    }
    // Official embed URL: https://developers.google.com/youtube/player_parameters
    if (videoId && /^[\w-]{11}$/.test(videoId)) {
      return {
        kind: 'youtube' as const,
        original: url.href,
        player: `https://www.youtube.com/embed/${videoId}?playsinline=1`,
      }
    }
    return {
      kind: /\.(mp4|webm|ogv|ogg)$/i.test(url.pathname)
        ? ('video' as const)
        : ('external' as const),
      original: url.href,
      player: url.href,
    }
  } catch {
    return null
  }
}
