import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { SKILL_CONTENT } from './skill-content.js';

const SKILL_TARGETS = [
  {
    name: 'Claude Code',
    detectDir: join(homedir(), '.claude'),
    skillDir: join(homedir(), '.claude', 'skills', 'vibe-friends'),
  },
  {
    name: 'Codex CLI',
    detectDir: join(homedir(), '.codex'),
    skillDir: join(homedir(), '.codex', 'skills', 'vibe-friends'),
  },
  {
    name: 'Cursor',
    detectDir: join(homedir(), '.cursor'),
    skillDir: join(homedir(), '.cursor', 'skills', 'vibe-friends'),
  },
  {
    name: 'Windsurf',
    detectDir: join(homedir(), '.codeium', 'windsurf'),
    skillDir: join(homedir(), '.codeium', 'windsurf', 'skills', 'vibe-friends'),
  },
];

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';

function tildePath(absPath) {
  const home = homedir();
  return absPath.startsWith(home) ? absPath.replace(home, '~') : absPath;
}

export function runInstall({ remove = false } = {}) {
  console.log();
  console.log('  Vibe Friends — VibeCafé 社区 /vibe-friends skill 安装器');
  console.log();
  console.log('  检测到的工具:');
  for (const t of SKILL_TARGETS) {
    const found = existsSync(t.detectDir);
    const mark = found ? `${GREEN}[OK]${RESET}` : `${DIM}[未装]${RESET}`;
    console.log(`    ${mark} ${t.name}`);
  }
  console.log();

  const detected = SKILL_TARGETS.filter(t => existsSync(t.detectDir));
  if (detected.length === 0) {
    console.log(`  ${DIM}未检测到支持的工具，无需安装。${RESET}`);
    console.log();
    return;
  }

  if (remove) {
    let removed = 0;
    for (const t of detected) {
      const skillFile = join(t.skillDir, 'SKILL.md');
      if (existsSync(skillFile)) {
        unlinkSync(skillFile);
        try { rmdirSync(t.skillDir); } catch {}
        console.log(`  ${DIM}已移除: ${tildePath(skillFile)}${RESET}`);
        removed++;
      }
    }
    console.log();
    if (removed === 0) {
      console.log(`  ${DIM}没有已安装的 Skill。${RESET}`);
    } else {
      console.log(`  ${GREEN}已从 ${removed} 个工具移除 Skill。${RESET}`);
    }
    console.log();
    return;
  }

  let installed = 0;
  for (const t of detected) {
    const skillFile = join(t.skillDir, 'SKILL.md');
    mkdirSync(t.skillDir, { recursive: true });
    writeFileSync(skillFile, SKILL_CONTENT, 'utf-8');
    console.log(`  ${DIM}已安装: ${tildePath(skillFile)}${RESET}`);
    installed++;
  }
  console.log();
  console.log(`  ${GREEN}已为 ${installed} 个工具安装 /vibe-friends skill。${RESET}`);
  console.log(`  ${DIM}在 Claude Code / Codex 中输入 /vibe-friends 试试。${RESET}`);
  console.log();
}
