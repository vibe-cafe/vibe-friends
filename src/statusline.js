import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { readCache, writeCache, cachePath } from './refresh-cache.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const ROTATE_INTERVAL_MS = 30 * 1000;

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';

function osc8(url, label) {
  return `\x1b]8;;${url}\x1b\\${label}\x1b]8;;\x1b\\`;
}

function drainStdin() {
  // Claude Code pipes session JSON in. We don't need it, but drain so the
  // upstream writer doesn't see a broken pipe.
  try {
    if (!process.stdin.isTTY) readFileSync(0, 'utf-8');
  } catch {}
}

function triggerBackgroundRefresh() {
  try {
    const url = new URL('../bin/vibe-friends.js', import.meta.url);
    const binPath = decodeURIComponent(url.pathname);
    const child = spawn(process.execPath, [binPath, 'refresh-cache'], {
      stdio: 'ignore',
      detached: true,
    });
    child.unref();
  } catch {
    // ignore — next turn will try again
  }
}

export async function runStatusline() {
  drainStdin();

  const cache = readCache();
  const now = Date.now();
  const stale = !cache || now - (cache.fetchedAt || 0) > CACHE_TTL_MS;

  if (stale) triggerBackgroundRefresh();

  if (!cache || !Array.isArray(cache.posts) || cache.posts.length === 0) {
    process.stdout.write(`${DIM}▸ Vibe Friends · 加载中…${RESET}\n`);
    return;
  }

  const lastIndex = Number(cache.lastIndex ?? -1);
  const lastRotatedAt = Number(cache.lastRotatedAt ?? 0);
  const shouldRotate = lastIndex < 0 || now - lastRotatedAt >= ROTATE_INTERVAL_MS;

  const currentIndex = shouldRotate
    ? (lastIndex + 1) % cache.posts.length
    : lastIndex % cache.posts.length;

  if (shouldRotate) {
    writeCache({ ...cache, lastIndex: currentIndex, lastRotatedAt: now });
  }

  const post = cache.posts[currentIndex];
  const handle = post.author?.handle ? `@${post.author.handle}` : '匿名';
  const title = String(post.title || '').slice(0, 80);
  const label = `${CYAN}▸ Vibe Friends${RESET} · ${title} ${DIM}— ${handle}${RESET}`;
  const link = post.url ? osc8(post.url, label) : label;
  process.stdout.write(link + '\n');
}

export { cachePath };
