const DEFAULT_API_URL = 'https://vibecafe.ai';

export function apiBase() {
  return process.env.VIBE_FRIENDS_API_URL || DEFAULT_API_URL;
}

export async function fetchPosts({ sort = 'top', limit = 10 } = {}) {
  const url = new URL('/api/news/public', apiBase());
  url.searchParams.set('sort', sort);
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return Array.isArray(data?.posts) ? data.posts : [];
}
