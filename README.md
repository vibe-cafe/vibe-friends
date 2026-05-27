# vibe-friends

`/vibe-friends` slash command + optional statusline ticker for Claude Code — peek at the latest posts from **Vibe Friends**, the community built by [VibeCafé](https://vibecafe.ai), right from your AI coding tool.

## Install

```bash
npx @vibe-cafe/vibe-friends                  # active: install /vibe-friends skill
npx @vibe-cafe/vibe-friends statusline       # passive: footer one-liner ticker (Claude Code)
```

No account, no API key, no setup. Calls a public read-only endpoint on vibecafe.ai.

## Active — `/vibe-friends`

Type `/vibe-friends` inside Claude Code. The skill runs `vibe-friends view`, which opens a full-screen TUI overlay (alt-screen buffer — doesn't pollute your main conversation):

```
┌─ Vibe Friends — Top 10 ─────────────────────────────────────┐
│                                                              │
│ ▸ 1. Claude Code 用了一个月，每天 30 刀…       @duck4money    │
│      ↑ 42 · 💬 12 · 2h                                       │
│                                                              │
│   2. Codex 5 hour cap 还有人在用吗                  @other    │
│      ↑ 31 · 💬 8 · 4h                                        │
│   ...                                                         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ ↑↓ 移动   Enter 打开   r 刷新   q/ESC 退出                   │
└──────────────────────────────────────────────────────────────┘
```

- `↑↓` move highlight, `Enter` opens the post in your browser, `r` reload, `q` / `ESC` exit
- On exit your Claude session resumes — the conversation only gains one line: `[vibe-friends] 浏览了 N 条帖子，已退出`
- Outside a TTY (CI, piped stdout) it falls back to a plain markdown list automatically

Codex CLI / Cursor / Windsurf get the markdown-list fallback (their TUI environment doesn't restore cleanly from an overlay).

## Passive — statusline footer ticker

If you'd rather just glance at the feed while you work, install the statusline:

```bash
npx @vibe-cafe/vibe-friends statusline
```

This wires `vbf-statusline` into `~/.claude/settings.json` → `statusLine.command`. After Claude Code reloads its config, the footer shows one rotating post per turn:

```
▸ Vibe Friends · Claude Code 用了一个月，每天 30 刀… — @duck4money
```

- Cycles through Top 10 — rotates to the next post every 30 seconds (stays put on faster turn boundaries so it doesn't flicker)
- Cache refreshes in the background every 5 minutes
- Terminals that support OSC 8 (iTerm2, Warp, VSCode, Kitty) render the line as a clickable hyperlink
- Chains with an existing `statusLine.command` (claude-hud, vibe-usage-statusline.sh, your own script) — the original output is preserved above Vibe Friends' line. Your original `settings.json` is backed up to `~/.claude/settings.json.vbf-backup`.

Remove it:

```bash
npx @vibe-cafe/vibe-friends statusline --remove
```

This restores the original `statusLine.command` from the chain wrapper. The backup file stays put so you can sanity-check before deleting.

## All commands

```bash
npx @vibe-cafe/vibe-friends                  # Install /vibe-friends skill
npx @vibe-cafe/vibe-friends view             # Open the TUI directly
npx @vibe-cafe/vibe-friends list             # Markdown list (CI / fallback)
npx @vibe-cafe/vibe-friends list --sort new  # Newest instead of top
npx @vibe-cafe/vibe-friends list --limit 20  # Up to 30
npx @vibe-cafe/vibe-friends --remove         # Uninstall the skill
npx @vibe-cafe/vibe-friends statusline           # Wire footer ticker
npx @vibe-cafe/vibe-friends statusline --remove  # Unwire footer ticker
npx @vibe-cafe/vibe-friends help             # Show help
```

## Development

Point at a local vibe-cafe dev server:

```bash
VIBE_FRIENDS_API_URL=http://localhost:3000 node bin/vibe-friends.js list
```

## $999 Club posts

Posts marked as $999 Club–only show a placeholder title (`[$999 Club 会员专属，请登录阅读]`) in the public feed. The link still works — clicking opens vibecafe.ai where the normal auth check decides what you can read.

## Roadmap (not yet)

- **Codex CLI statusline** — Codex's statusline currently only renders built-in items, no custom `command` shell-out. Holding until upstream adds it.
- **Codex CLI TUI overlay** — Codex's TUI doesn't restore cleanly from an alt-screen child process today, so `view` falls back to markdown. Revisit if upstream improves child-TTY handoff.
- **Vibe Usage app tab** — surfacing the feed in the [vibe-usage Mac app](https://github.com/vibe-cafe/vibe-usage-app)'s menu-bar popover, the most "always visible" UX possible. Tracked separately.

## Related

- [Vibe Usage](https://github.com/vibe-cafe/vibe-usage) — the `/vibe-usage` skill + CLI that tracks AI token spend
- [Vibe Usage Mac app](https://github.com/vibe-cafe/vibe-usage-app) — menu-bar usage tracker
- [VibeCafé](https://vibecafe.ai) — the community itself

## License

MIT
