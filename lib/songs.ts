export interface SongPreview {
  provider: 'apple' | 'youtube';
  title: string;
  url: string;
}

/** Only provider URLs are converted into embeds; never accept arbitrary frames. */
export function songEmbed(preview: SongPreview): string | null {
  try {
    const url = new URL(preview.url);
    if (url.protocol !== 'https:') return null;
    if (preview.provider === 'apple' && url.hostname === 'music.apple.com' && /^\/[a-z]{2}\/(?:album\/.+\/\d+|song\/(?:.+\/)?\d+)$/.test(url.pathname)) {
      const embed = new URL(`https://embed.music.apple.com${url.pathname}`);
      const track = url.searchParams.get('i');
      if (track && /^\d+$/.test(track)) embed.searchParams.set('i', track);
      return embed.toString();
    }
    if (preview.provider === 'youtube') {
      const id = youtubeId(url);
      if (id) return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
    }
  } catch {}
  return null;
}

function youtubeId(url: URL): string | null {
  let id: string | null = null;
  if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
    id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1] || null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

export function linkedSong(value: string, title: string): SongPreview | null {
  for (const provider of ['youtube', 'apple'] as const) {
    const preview = { provider, title: title.trim(), url: value.trim() };
    if (songEmbed(preview)) return preview;
  }
  return null;
}
