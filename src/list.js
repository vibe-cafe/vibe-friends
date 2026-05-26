import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';

const DEFAULT_API_URL = 'https://vibecafe.ai';

export async function runList({ sort = 'top', limit = 10 } = {}) {
  const apiUrl = process.env.VIBE_FRIENDS_API_URL || DEFAULT_API_URL;
  const url = new URL('/api/news/public', apiUrl);
  url.searchParams.set('sort', sort);
  url.searchParams.set('limit', String(limit));

  let payload;
  try {
    payload = await fetchJson(url);
  } catch (err) {
    console.error(`Failed to fetch ${url}: ${err.message}`);
    process.exit(1);
  }

  const posts = Array.isArray(payload?.posts) ? payload.posts : [];
  console.log(render(posts, sort));
}

function render(posts, sort) {
  const heading = sort === 'new' ? 'Vibe Friends 社区最新' : 'Vibe Friends 社区热帖';
  const lines = [`# ${heading}`, ''];

  if (posts.length === 0) {
    lines.push('Vibe Friends 社区暂无内容。');
    lines.push('');
    lines.push('上 vibecafe.ai 发第一帖: https://vibecafe.ai');
    return lines.join('\n');
  }

  posts.forEach((p, i) => {
    const handle = p.author?.handle ? `@${p.author.handle}` : '匿名';
    lines.push(
      `${i + 1}. **[${escapeMd(p.title)}](${p.url})** — ${handle} · ${p.score} 赞 · ${p.commentCount} 评论`,
    );
  });

  lines.push('');
  lines.push('来 Vibe Friends 社区参与讨论: https://vibecafe.ai');
  return lines.join('\n');
}

function escapeMd(s) {
  // Just guard the bracket / paren chars that would break the [title](url)
  // syntax. Don't full-escape — these strings already came from user titles
  // and stay readable.
  return String(s).replace(/[\[\]]/g, '\\$&');
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request(url, { method: 'GET', timeout: 10_000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON response')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout (10s)')); });
    req.end();
  });
}
