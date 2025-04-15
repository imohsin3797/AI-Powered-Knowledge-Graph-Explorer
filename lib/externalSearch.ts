export interface VideoLink {
  url: string;
  title: string;
  thumbnail: string;
}

export interface WebLink {
  url: string;
  title: string;
  thumbnail: string | null;
  description: string | null;
}

const YT_KEY = process.env.YOUTUBE_API_KEY!;
export async function fetchYouTubeLinks(query: string, max = 3): Promise<VideoLink[]> {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(max));
  url.searchParams.set('key', YT_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) return [];                             
  const json = await res.json();

  return (json.items ?? []).map((it: any) => ({
    url: `https://www.youtube.com/watch?v=${it.id.videoId}`,
    title: it.snippet.title,
    thumbnail: it.snippet.thumbnails.medium.url,
  }));
}

const BRAVE_KEY = process.env.BRAVE_API_KEY!;
export async function fetchWebLinks(query: string, max = 3): Promise<WebLink[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(Math.min(max, 20)));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': BRAVE_KEY,
    },
  });

  if (res.status === 429 || res.status === 402) {
    console.warn(`Brave Search quota exceeded (${res.status}); returning empty list`);
    return [];
  }
  if (!res.ok) throw new Error(`Brave Search error ${res.status}`);

  const json = await res.json();
  const results = json.web?.results ?? [];

  return results.slice(0, max).map((r: any) => ({
    url: r.url,
    title: r.title,
    thumbnail: r.thumbnail?.url ?? null,
    description: r.description ?? null,
  }));
}
