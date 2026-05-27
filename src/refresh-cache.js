import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { fetchPosts } from './api.js';

const CACHE_DIR = join(homedir(), '.vibe-friends');
const CACHE_FILE = join(CACHE_DIR, 'cache.json');

export function cachePath() {
  return CACHE_FILE;
}

export function readCache() {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export function writeCache(payload) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(payload), 'utf-8');
}

export async function runRefreshCache() {
  try {
    const posts = await fetchPosts({ limit: 10, sort: 'top' });
    const prev = readCache();
    writeCache({
      ...(prev || {}),
      posts,
      fetchedAt: Date.now(),
      lastIndex: prev?.lastIndex ?? -1,
    });
  } catch {
    // silent — statusline must never bubble errors to Claude Code's footer
    process.exit(0);
  }
}
