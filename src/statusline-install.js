import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, copyFileSync, rmdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';

const CLAUDE_DIR = join(homedir(), '.claude');
const SETTINGS_FILE = join(CLAUDE_DIR, 'settings.json');
const SETTINGS_BACKUP = join(CLAUDE_DIR, 'settings.json.vbf-backup');

const VBF_DIR = join(homedir(), '.vibe-friends');
const LEGACY_WRAP_PREV = join(VBF_DIR, 'wrap-prev.sh');

function vbfStatuslineEntry() {
  const here = fileURLToPath(import.meta.url);
  const binPath = join(dirname(here), '..', 'bin', 'vibe-friends.js');
  return `${process.execPath} ${binPath} statusline-render`;
}

function tildePath(p) {
  const home = homedir();
  return p.startsWith(home) ? p.replace(home, '~') : p;
}

function readSettings() {
  if (!existsSync(SETTINGS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch (err) {
    throw new Error(`Cannot parse ${SETTINGS_FILE}: ${err.message}`);
  }
}

function writeSettings(obj) {
  if (!existsSync(CLAUDE_DIR)) mkdirSync(CLAUDE_DIR, { recursive: true });
  writeFileSync(SETTINGS_FILE, JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}

function isOurEntry(cmd) {
  return typeof cmd === 'string' && cmd.includes('bin/vibe-friends.js') && cmd.includes('statusline-render');
}

export function runStatuslineInstall({ remove = false } = {}) {
  console.log();
  console.log('  Vibe Friends statusline — Claude Code footer 一行热帖');
  console.log();

  let settings;
  try {
    settings = readSettings();
  } catch (err) {
    console.error(`  ${YELLOW}[错误]${RESET} ${err.message}`);
    process.exit(1);
  }

  // Legacy cleanup: older versions chained a previous statusLine via
  // ~/.vibe-friends/wrap-prev.sh. We no longer chain — Claude Code's
  // statusLine is single-slot, so we just replace it.
  try { unlinkSync(LEGACY_WRAP_PREV); } catch {}

  if (remove) return uninstall(settings);
  return install(settings);
}

function install(settings) {
  const ourEntry = vbfStatuslineEntry();
  const current = settings.statusLine?.command;

  if (isOurEntry(current)) {
    console.log(`  ${DIM}Vibe Friends statusline 已经装过了，无需重复。${RESET}`);
    console.log();
    return;
  }

  if (existsSync(SETTINGS_FILE) && !existsSync(SETTINGS_BACKUP)) {
    copyFileSync(SETTINGS_FILE, SETTINGS_BACKUP);
    console.log(`  ${DIM}已备份原 settings.json → ${tildePath(SETTINGS_BACKUP)}${RESET}`);
  }

  if (current && typeof current === 'string' && current.trim().length > 0) {
    console.log(`  ${YELLOW}[提示]${RESET} 检测到已有 statusLine.command，将被覆盖：`);
    console.log(`    ${DIM}${current}${RESET}`);
    console.log(`  ${DIM}如需恢复，见备份 ${tildePath(SETTINGS_BACKUP)}。${RESET}`);
  }

  settings.statusLine = {
    ...(settings.statusLine || {}),
    type: 'command',
    command: ourEntry,
  };
  writeSettings(settings);

  console.log();
  console.log(`  ${GREEN}[OK]${RESET} 已写入 statusLine.command`);
  console.log(`  ${DIM}下次 Claude Code 启动时即可在 footer 看到一行热帖。${RESET}`);
  console.log(`  ${DIM}卸载：npx @vibe-cafe/vibe-friends statusline --remove${RESET}`);
  console.log();
}

function uninstall(settings) {
  const current = settings.statusLine?.command;

  if (!isOurEntry(current)) {
    console.log(`  ${DIM}Vibe Friends statusline 没在 settings.json 里，无需卸载。${RESET}`);
    console.log();
    return;
  }

  delete settings.statusLine;
  writeSettings(settings);

  // Best-effort: remove the state dir if it's now empty. Cache stays
  // otherwise — the user may reinstall later.
  try { rmdirSync(VBF_DIR); } catch {}

  console.log();
  console.log(`  ${GREEN}[OK]${RESET} Vibe Friends statusline 已卸载`);
  if (existsSync(SETTINGS_BACKUP)) {
    console.log(`  ${DIM}备份文件保留在 ${tildePath(SETTINGS_BACKUP)}，如需恢复原 statusLine 可参考。${RESET}`);
  }
  console.log();
}
