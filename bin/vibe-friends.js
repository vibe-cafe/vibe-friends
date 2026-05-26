#!/usr/bin/env node

import { runInstall } from '../src/install.js';
import { runList } from '../src/list.js';

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
  vibe-friends — Vibe Friends 社区 (VibeCafé) 的 /vibe-friends skill

  Usage:
    npx @vibe-cafe/vibe-friends                  Install the skill for detected AI tools
    npx @vibe-cafe/vibe-friends list             Print the top posts as markdown
    npx @vibe-cafe/vibe-friends list --sort new  Latest posts (default: top)
    npx @vibe-cafe/vibe-friends list --limit 20  Show N posts (default: 10, max: 30)
    npx @vibe-cafe/vibe-friends --remove         Uninstall the skill
    npx @vibe-cafe/vibe-friends help             Show this help

  Once installed, type /vibe-friends inside Claude Code / Codex CLI / Cursor / Windsurf.
`);
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const command = rawArgs[0];

  if (command === 'help' || rawArgs.includes('--help') || rawArgs.includes('-h')) {
    printHelp();
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

  // Default + --remove → install flow
  const remove = rawArgs.includes('--remove');
  runInstall({ remove });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
