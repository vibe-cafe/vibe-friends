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

// Vibe Usage.app installs a wrapper at this path and reads a downstream
// command from `statusline-original`. When present, we install ourselves
// into that sidecar instead of fighting over settings.json.
const VIBE_USAGE_DIR = join(homedir(), '.vibe-usage');
const VIBE_USAGE_WRAPPER = join(VIBE_USAGE_DIR, 'vibe-usage-statusline.sh');
const VIBE_USAGE_SIDECAR = join(VIBE_USAGE_DIR, 'statusline-original');

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

function isVibeUsageEntry(cmd) {
  return typeof cmd === 'string' && cmd.includes('vibe-usage-statusline.sh');
}

function vibeUsageDetected() {
  // Trust the wrapper script's presence — Vibe Usage.app may currently be
  // installed even if settings.json was momentarily clobbered.
  return existsSync(VIBE_USAGE_WRAPPER);
}

function readSidecar() {
  try { return readFileSync(VIBE_USAGE_SIDECAR, 'utf-8').trim(); } catch { return ''; }
}

// Sidecar may contain multiple commands separated by `;` or newlines.
// Return the body with any vibe-friends invocations removed, normalized to
// a single `; `-joined line.
function stripOurLines(body) {
  if (!body) return '';
  return body
    .split(/\n|;/)
    .map(s => s.trim())
    .filter(s => s && !s.includes('vibe-friends.js'))
    .join(' ; ');
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
  // ~/.vibe-friends/wrap-prev.sh. The new design either takes the slot
  // outright or rides Vibe Usage's sidecar — no chain script needed.
  try { unlinkSync(LEGACY_WRAP_PREV); } catch {}

  if (remove) return uninstall(settings);
  return install(settings);
}

function install(settings) {
  if (vibeUsageDetected()) return installViaVibeUsageSidecar(settings);
  return installAsPrimary(settings);
}

function installAsPrimary(settings) {
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

// Vibe Usage.app owns `settings.json` statusLine and re-asserts itself on
// every launch via verifyAndRepair(). Fighting that slot causes a re-entry
// loop. Instead we ride its sidecar: Vibe Usage's wrapper captures stdin,
// writes rate_limits, then `exec`s whatever sits in statusline-original —
// so installing ourselves there gets us rendered downstream, with both
// features intact.
function installViaVibeUsageSidecar(settings) {
  const ourEntry = vbfStatuslineEntry();
  const currentSidecar = readSidecar();
  const settingsCmd = settings.statusLine?.command;

  console.log(`  ${DIM}检测到 Vibe Usage.app（${tildePath(VIBE_USAGE_WRAPPER)}）。${RESET}`);
  console.log(`  ${DIM}通过它的 sidecar 共存安装，避免与 App 抢占 statusLine。${RESET}`);
  console.log();

  // If settings.json was previously clobbered (e.g. by an older vibe-friends
  // install that grabbed the slot), hand it back to Vibe Usage so its
  // wrapper actually runs. The App's verifyAndRepair would do this on next
  // launch anyway — we just do it eagerly so things work right now.
  if (isOurEntry(settingsCmd)) {
    const wrapperCmd = `bash "${VIBE_USAGE_WRAPPER}"`;
    settings.statusLine = {
      ...(settings.statusLine || {}),
      type: 'command',
      command: wrapperCmd,
    };
    writeSettings(settings);
    console.log(`  ${DIM}已把 statusLine.command 交还给 Vibe Usage wrapper。${RESET}`);
  } else if (settingsCmd && !isVibeUsageEntry(settingsCmd)) {
    console.log(`  ${YELLOW}[提示]${RESET} 当前 statusLine.command 不是 Vibe Usage wrapper：`);
    console.log(`    ${DIM}${settingsCmd}${RESET}`);
    console.log(`  ${DIM}下次 Vibe Usage.app 启动时会自动改回它自己，本次只更新 sidecar。${RESET}`);
  }

  // Preserve any pre-existing downstream (e.g. claude-hud) the user had,
  // unless it's a stale pointer back to us. Vibe Usage's wrapper passes the
  // whole sidecar to `sh -c` and stdin is consumed only once, so we
  // sequence with `;` (the second command will see empty stdin — acceptable
  // for vibe-friends since it doesn't read stdin meaningfully).
  let sidecarBody = ourEntry;
  const existingClean = stripOurLines(currentSidecar);
  if (existingClean) {
    sidecarBody = `${existingClean} ; ${ourEntry}`;
    console.log(`  ${DIM}已在现有 sidecar 之后追加 Vibe Friends。${RESET}`);
  }
  if (!existsSync(VIBE_USAGE_DIR)) mkdirSync(VIBE_USAGE_DIR, { recursive: true });
  writeFileSync(VIBE_USAGE_SIDECAR, sidecarBody + '\n', 'utf-8');

  console.log();
  console.log(`  ${GREEN}[OK]${RESET} 已通过 Vibe Usage sidecar 安装 Vibe Friends`);
  console.log(`  ${DIM}下次 Claude Code 刷新 footer 时即可看到一行热帖。${RESET}`);
  console.log(`  ${DIM}卸载：npx @vibe-cafe/vibe-friends statusline --remove${RESET}`);
  console.log();
}

function uninstall(settings) {
  let didSomething = false;

  // Sidecar route: remove our line from Vibe Usage's sidecar, preserve any
  // other downstream the user had configured.
  if (existsSync(VIBE_USAGE_SIDECAR)) {
    const before = readSidecar();
    if (before.includes('vibe-friends.js')) {
      const after = stripOurLines(before);
      writeFileSync(VIBE_USAGE_SIDECAR, after ? after + '\n' : '', 'utf-8');
      console.log(after
        ? `  ${DIM}已从 Vibe Usage sidecar 移除 Vibe Friends，保留其他下游。${RESET}`
        : `  ${DIM}已清空 Vibe Usage sidecar 中的 Vibe Friends 行。${RESET}`);
      didSomething = true;
    }
  }

  // Primary-slot route: if settings.json points at us, clear it.
  const current = settings.statusLine?.command;
  if (isOurEntry(current)) {
    delete settings.statusLine;
    writeSettings(settings);
    console.log(`  ${DIM}已清除 settings.json 中的 Vibe Friends statusLine。${RESET}`);
    didSomething = true;
  }

  if (!didSomething) {
    console.log(`  ${DIM}Vibe Friends statusline 未安装，无需卸载。${RESET}`);
    console.log();
    return;
  }

  // Best-effort: remove the state dir if it's now empty.
  try { rmdirSync(VBF_DIR); } catch {}

  console.log();
  console.log(`  ${GREEN}[OK]${RESET} Vibe Friends statusline 已卸载`);
  if (existsSync(SETTINGS_BACKUP)) {
    console.log(`  ${DIM}备份文件保留在 ${tildePath(SETTINGS_BACKUP)}，如需恢复原 statusLine 可参考。${RESET}`);
  }
  console.log();
}
