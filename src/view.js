import { fetchPosts } from './api.js';
import { openUrl } from './open-url.js';

const ALT_ENTER = '\x1b[?1049h';
const ALT_EXIT = '\x1b[?1049l';
const CURSOR_HIDE = '\x1b[?25l';
const CURSOR_SHOW = '\x1b[?25h';
const CLEAR = '\x1b[2J\x1b[H';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';

const HOTKEY_HINTS = '↑↓ 移动   Enter 打开   r 刷新   q / ESC 退出';

function altScreenSupported() {
  // TTY required; CI / piped stdout → fall back. Most modern terminals
  // (iTerm2, Terminal.app, VSCode, Warp, Kitty, Alacritty, Windows Terminal)
  // honor 1049. Skip on dumb TERM.
  if (!process.stdout.isTTY || !process.stdin.isTTY) return false;
  if (process.env.TERM === 'dumb') return false;
  return true;
}

function truncate(s, maxLen) {
  // crude byte-ish truncation; CJK wide chars count as 2
  let width = 0;
  let out = '';
  for (const ch of String(s)) {
    const w = /[一-鿿　-〿＀-￯]/.test(ch) ? 2 : 1;
    if (width + w > maxLen) {
      out += '…';
      break;
    }
    width += w;
    out += ch;
  }
  return out;
}

function timeAgo(iso) {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function render(state) {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;
  const lines = [];

  // Header
  const header = ` Vibe Friends — Top ${state.posts.length} `;
  const headerPad = '─'.repeat(Math.max(0, cols - header.length - 2));
  lines.push(`${CYAN}┌${header}${headerPad}┐${RESET}`);
  lines.push(`${CYAN}│${RESET}${' '.repeat(cols - 2)}${CYAN}│${RESET}`);

  if (state.loading) {
    const msg = '  正在加载 Vibe Friends 社区热帖…';
    lines.push(`${CYAN}│${RESET}${msg.padEnd(cols - 2)}${CYAN}│${RESET}`);
  } else if (state.error) {
    const msg = `  加载失败：${state.error}`;
    lines.push(`${CYAN}│${RESET} ${YELLOW}${truncate(msg, cols - 4)}${RESET}`.padEnd(cols + 9) + `${CYAN}│${RESET}`);
    lines.push(`${CYAN}│${RESET} ${DIM}按 r 重试，q / ESC 退出${RESET}`.padEnd(cols + 9) + `${CYAN}│${RESET}`);
  } else if (state.posts.length === 0) {
    const msg = '  Vibe Friends 社区暂无内容。';
    lines.push(`${CYAN}│${RESET}${msg.padEnd(cols - 2)}${CYAN}│${RESET}`);
  } else {
    // Each post takes 2 lines (title + meta) + 1 blank between → 3 lines
    state.posts.forEach((p, i) => {
      const selected = i === state.index;
      const marker = selected ? `${GREEN}▸${RESET} ` : '  ';
      const numStr = `${String(i + 1).padStart(2)}. `;
      const handle = p.author?.handle ? `@${p.author.handle}` : '匿名';

      const titleBudget = cols - 4 - marker.length - numStr.length - handle.length - 4;
      const title = truncate(p.title, Math.max(20, titleBudget));
      const titleStyled = selected ? `${BOLD}${title}${RESET}` : title;
      const handleStyled = `${DIM}${handle}${RESET}`;

      const line1 = ` ${marker}${numStr}${titleStyled}  ${handleStyled}`;
      lines.push(padLine(line1, cols));

      const meta = `      ${DIM}↑ ${p.score} · 💬 ${p.commentCount} · ${timeAgo(p.createdAt)}${RESET}`;
      lines.push(padLine(meta, cols));
      lines.push(`${CYAN}│${RESET}${' '.repeat(cols - 2)}${CYAN}│${RESET}`);
    });
  }

  // Pad up to row count - 3 (footer + 2 separators)
  while (lines.length < rows - 3) {
    lines.push(`${CYAN}│${RESET}${' '.repeat(cols - 2)}${CYAN}│${RESET}`);
  }

  // Footer
  lines.push(`${CYAN}├${'─'.repeat(cols - 2)}┤${RESET}`);
  lines.push(padLine(` ${DIM}${HOTKEY_HINTS}${RESET}`, cols));
  lines.push(`${CYAN}└${'─'.repeat(cols - 2)}┘${RESET}`);

  return CLEAR + lines.join('\n');
}

function padLine(line, cols) {
  // Count visual width by stripping ANSI then measuring (CJK = 2)
  const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
  let w = 0;
  for (const ch of stripped) {
    w += /[一-鿿　-〿＀-￯]/.test(ch) ? 2 : 1;
  }
  const padding = Math.max(0, cols - 2 - w);
  return `${CYAN}│${RESET}${line.slice(1)}${' '.repeat(padding)}${CYAN}│${RESET}`;
}

export async function runView({ limit = 10, sort = 'top' } = {}) {
  if (!altScreenSupported()) {
    // Fallback: print plain list (delegates to list.js semantics inline)
    const { runList } = await import('./list.js');
    return runList({ sort, limit });
  }

  const state = {
    posts: [],
    index: 0,
    loading: true,
    error: null,
  };

  let exited = false;
  let originalRawMode = process.stdin.isRaw;

  function cleanup() {
    if (exited) return;
    exited = true;
    try { process.stdin.setRawMode(originalRawMode === true); } catch {}
    try { process.stdin.pause(); } catch {}
    process.stdout.write(CURSOR_SHOW);
    process.stdout.write(ALT_EXIT);
    process.stdout.write(RESET);
  }

  function paint() {
    if (!exited) process.stdout.write(render(state));
  }

  function exitWith(msg) {
    cleanup();
    if (msg) console.log(msg);
  }

  async function reload() {
    state.loading = true;
    state.error = null;
    paint();
    try {
      state.posts = await fetchPosts({ limit, sort });
      state.index = Math.min(state.index, Math.max(0, state.posts.length - 1));
    } catch (err) {
      state.error = err.message || String(err);
    } finally {
      state.loading = false;
      paint();
    }
  }

  // Enter alt-screen
  process.stdout.write(ALT_ENTER);
  process.stdout.write(CURSOR_HIDE);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  // Defensive cleanup
  process.on('SIGINT', () => exitWith(`[vibe-friends] 已退出`));
  process.on('SIGTERM', () => exitWith(`[vibe-friends] 已退出`));
  process.on('uncaughtException', (err) => {
    cleanup();
    console.error('[vibe-friends] 异常退出:', err.message);
    process.exit(1);
  });
  process.on('exit', cleanup);
  process.stdout.on('resize', paint);

  await reload();

  return new Promise((resolve) => {
    process.stdin.on('data', (key) => {
      if (exited) return;

      // ESC / q
      if (key === '\x1b' || key === 'q' || key === 'Q') {
        const n = state.posts.length;
        exitWith(`[vibe-friends] 浏览了 ${n} 条帖子，已退出`);
        resolve();
        return;
      }
      // Ctrl+C
      if (key === '\x03') {
        exitWith('[vibe-friends] 已退出');
        resolve();
        return;
      }
      // Up arrow
      if (key === '\x1b[A' || key === 'k') {
        if (state.posts.length > 0) {
          state.index = (state.index - 1 + state.posts.length) % state.posts.length;
          paint();
        }
        return;
      }
      // Down arrow
      if (key === '\x1b[B' || key === 'j') {
        if (state.posts.length > 0) {
          state.index = (state.index + 1) % state.posts.length;
          paint();
        }
        return;
      }
      // Enter
      if (key === '\r' || key === '\n') {
        const p = state.posts[state.index];
        if (p?.url) {
          openUrl(p.url);
          // brief feedback flash in footer (re-render with a transient message)
          process.stdout.write(`\x1b[${process.stdout.rows};1H`);
          process.stdout.write(`${CYAN}│${RESET} ${GREEN}已在浏览器打开 →${RESET} ${DIM}${p.url}${RESET}`);
        }
        return;
      }
      // r / R: reload
      if (key === 'r' || key === 'R') {
        reload();
        return;
      }
    });
  });
}
