import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { readCache, writeCache, cachePath } from './refresh-cache.js';

const VBF_DIR = join(homedir(), '.vibe-friends');
const WRAP_PREV = join(VBF_DIR, 'wrap-prev.sh');
const CACHE_TTL_MS = 5 * 60 * 1000;

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';

function osc8(url, label) {
  // OSC 8 hyperlink. Terminals that don't support it just see the label.
  return `\x1b]8;;${url}\x1b\\${label}\x1b]8;;\x1b\\`;
}

function readStdinSync() {
  // Claude Code pipes session JSON in. Drain so we can pass it through.
  try {
    if (process.stdin.isTTY) return '';
    return readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

function passThroughToPrevWrapper(stdinData) {
  if (!existsSync(WRAP_PREV)) return '';
  try {
    const result = spawnSync('sh', [WRAP_PREV], {
      input: stdinData,
      encoding: 'utf-8',
      timeout: 2000,
    });
    return result.stdout || '';
  } catch {
    return '';
  }
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
  const stdinData = readStdinSync();
  const prevOutput = passThroughToPrevWrapper(stdinData);

  if (prevOutput) {
    process.stdout.write(prevOutput.endsWith('\n') ? prevOutput : prevOutput + '\n');
  }

  const cache = readCache();
  const now = Date.now();
  const stale = !cache || now - (cache.fetchedAt || 0) > CACHE_TTL_MS;

  if (stale) triggerBackgroundRefresh();

  if (!cache || !Array.isArray(cache.posts) || cache.posts.length === 0) {
    process.stdout.write(`${DIM}▸ Vibe Friends · 加载中…${RESET}\n`);
    return;
  }

  const nextIndex = (Number(cache.lastIndex ?? -1) + 1) % cache.posts.length;
  writeCache({ ...cache, lastIndex: nextIndex });

  const post = cache.posts[nextIndex];
  const handle = post.author?.handle ? `@${post.author.handle}` : '匿名';
  const title = String(post.title || '').slice(0, 80);
  const label = `${CYAN}▸ Vibe Friends${RESET} · ${title} ${DIM}— ${handle}${RESET}`;
  const link = post.url ? osc8(post.url, label) : label;
  process.stdout.write(link + '\n');
}

export { cachePath };
