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

interface YouTubeSnippetThumbnail {
  url: string;
}
interface YouTubeSnippetThumbnails {
  medium: YouTubeSnippetThumbnail;
}
interface YouTubeSnippet {
  title: string;
  thumbnails: YouTubeSnippetThumbnails;
}
interface YouTubeId {
  videoId: string;
}
interface YouTubeItem {
  id: YouTubeId;
  snippet: YouTubeSnippet;
}
interface YouTubeApiResponse {
  items?: YouTubeItem[];
}

const YT_KEY = process.env.YOUTUBE_API_KEY ?? '';

export async function fetchYouTubeLinks(query: string, max = 3): Promise<VideoLink[]> {
  if (!YT_KEY) return [];

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(max));
  url.searchParams.set('key', YT_KEY);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const json = (await res.json()) as YouTubeApiResponse;

    return (json.items ?? []).slice(0, max).map<VideoLink>((item) => ({
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
    }));
  } catch {
    return [];
  }
}

interface BraveWebResult {
  url: string;
  title: string;
  thumbnail?: { url?: string };
  description?: string;
}
interface BraveWebResponse {
  web?: { results?: BraveWebResult[] };
}

const BRAVE_KEY = process.env.BRAVE_API_KEY ?? '';

export async function fetchWebLinks(query: string, max = 3): Promise<WebLink[]> {
  if (!BRAVE_KEY) return [];

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(Math.min(max, 20)));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': BRAVE_KEY,
      },
    });

    if (res.status === 429 || res.status === 402) {
      return [];
    }
    if (!res.ok) throw new Error();

    const json = (await res.json()) as BraveWebResponse;
    const results = json.web?.results ?? [];

    return results.slice(0, max).map<WebLink>((r) => ({
      url: r.url,
      title: r.title,
      thumbnail: r.thumbnail?.url ?? null,
      description: r.description ?? null,
    }));
  } catch {
    return [];
  }
}
