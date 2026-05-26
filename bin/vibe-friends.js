#!/usr/bin/env node

import { runInstall } from '../src/install.js';
import { runList } from '../src/list.js';
import { runView } from '../src/view.js';
import { runStatuslineInstall } from '../src/statusline-install.js';
import { runStatusline } from '../src/statusline.js';
import { runRefreshCache } from '../src/refresh-cache.js';

function extractOption(args, name) {
  const flag = `--${name}`;
  const idx = args.findIndex(a => a === flag);
  if (idx === -1) return { args, value: undefined };
  const value = args[idx + 1];
  if (value === undefined || value.startsWith('--')) {
    console.error(`Option ${flag} requires a value.`);
    process.exit(1);
  }
  return { args: [...args.slice(0, idx), ...args.slice(idx + 2)], value };
}

function printHelp() {
  console.log(`
  vibe-friends — Vibe Friends 社区 (VibeCafé) 的 /vibe-friends skill + statusline

  Skill (主动 TUI):
    npx @vibe-cafe/vibe-friends                  Install /vibe-friends skill
    npx @vibe-cafe/vibe-friends view             Open the TUI (used by the skill)
    npx @vibe-cafe/vibe-friends list             Print posts as markdown (CI / fallback)
    npx @vibe-cafe/vibe-friends --remove         Uninstall the skill

  Statusline (被动 footer 一行):
    npx @vibe-cafe/vibe-friends statusline           Wire vbf-statusline into ~/.claude/settings.json
    npx @vibe-cafe/vibe-friends statusline --remove  Remove and restore the original

  Once installed, type /vibe-friends inside Claude Code (Codex CLI / Cursor / Windsurf
  still get the markdown-list fallback).

  Misc:
    --sort new   Sort by newest instead of top
    --limit N    Show N posts (default 10, max 30)
`);
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const command = rawArgs[0];

  if (command === 'help' || rawArgs.includes('--help') || rawArgs.includes('-h')) {
    printHelp();
    return;
  }

  if (command === 'view') {
    let stripped = rawArgs.slice(1);
    let sort;
    let limit;
    ({ args: stripped, value: sort } = extractOption(stripped, 'sort'));
    ({ args: stripped, value: limit } = extractOption(stripped, 'limit'));
    await runView({
      sort: sort === 'new' ? 'new' : 'top',
      limit: limit ? Math.min(parseInt(limit, 10) || 10, 30) : 10,
    });
    return;
  }

  if (command === 'list') {
    let stripped = rawArgs.slice(1);
    let sort;
    let limit;
    ({ args: stripped, value: sort } = extractOption(stripped, 'sort'));
    ({ args: stripped, value: limit } = extractOption(stripped, 'limit'));
    await runList({
      sort: sort === 'new' ? 'new' : 'top',
      limit: limit ? Math.min(parseInt(limit, 10) || 10, 30) : 10,
    });
    return;
  }

  if (command === 'statusline') {
    const remove = rawArgs.includes('--remove');
    runStatuslineInstall({ remove });
    return;
  }

  // Internal — invoked by Claude Code's statusLine.command and by background refresh
  if (command === 'statusline-render') {
    await runStatusline();
    return;
  }

  if (command === 'refresh-cache') {
    await runRefreshCache();
    return;
  }

  // Default + --remove → install skill flow
  const remove = rawArgs.includes('--remove');
  runInstall({ remove });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
