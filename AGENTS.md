# vibe-friends — agent notes

Independent npm package that installs a `/vibe-friends` skill **and** an optional Claude Code statusline ticker. The skill calls a public read-only endpoint on vibecafe.ai and opens a full-screen TUI overlay (or a markdown list as fallback).

This repo deliberately does **not** depend on `@vibe-cafe/vibe-usage` — different purpose, different release cadence, different install story. The two products share a server (vibecafe.ai) but nothing else.

## Layout

```
.
├── bin/
│   └── vibe-friends.js          # CLI entry — routes view / list / install / statusline / refresh-cache
├── src/
│   ├── install.js               # Detect AI tools → write SKILL.md
│   ├── view.js                  # Alt-screen TUI (the new default for /vibe-friends)
│   ├── list.js                  # GET /api/news/public → markdown table (fallback + CI mode)
│   ├── api.js                   # fetchPosts() — shared HTTP client
│   ├── open-url.js              # Cross-platform `open` URL
│   ├── statusline.js            # Footer renderer; invoked by Claude Code's statusLine.command
│   ├── statusline-install.js    # Wires/unwires vbf-statusline into ~/.claude/settings.json
│   ├── refresh-cache.js         # Background cache populator; spawned by statusline.js
│   └── skill-content.js         # SKILL.md template (tells the host model to run `view` and not paraphrase)
├── README.md
└── package.json                 # ESM, Node >= 20, zero deps
```

## Key conventions

- **Pure ESM** (`"type": "module"`), Node built-ins only (no deps). Same hygiene as vibe-usage.
- **Skill discipline**: SKILL.md tells the host model to **not summarise the TUI session** — the only thing it sees on exit is one line like `[vibe-friends] 浏览了 N 条`, which should pass through verbatim.
- **No auth.** The endpoint is public. Anyone who can `npx` can see the feed; no key file required.
- **Alt-screen overlay**: `view.js` uses `\x1b[?1049h` / `\x1b[?1049l` to enter/exit a separate screen buffer so the parent Claude Code TUI restores cleanly. SIGINT/SIGTERM/uncaughtException all run `cleanup()` to guarantee cursor + screen restoration; missing this leaves the user's terminal stuck in raw mode.
- **API URL override**: `VIBE_FRIENDS_API_URL` env var swaps the base URL — used for local dev against `http://localhost:3000`. Default: `https://vibecafe.ai`.
- **999-only posts** show a placeholder title (`[$999 Club 会员专属，请登录阅读]`) in the list. The link still resolves to vibecafe.ai where Clerk decides what to render. Redaction lives **server-side** in `/api/news/public/route.ts` — never trust client-side filtering.

## Naming

`VibeCafé` is the company. `Vibe Friends` is the community brand (always spelled with a space). `Vibe Usage` is the sibling product. Use these spellings in all user-facing text.

## Server contract

`GET https://vibecafe.ai/api/news/public?sort=top|new&limit=N`

Response:
```json
{
  "posts": [
    {
      "id": "cuid",
      "title": "string (or '[$999 Club 会员专属，请登录阅读]')",
      "author": { "handle": "string (or '999-club' placeholder)" },
      "score": 12,
      "commentCount": 3,
      "createdAt": "ISO-8601",
      "url": "https://vibecafe.ai/item/<id>"
    }
  ]
}
```

- `limit` clamped to 30 server-side.
- Cached `s-maxage=60, stale-while-revalidate=300` — safe to hammer.

## Statusline mechanics

`statusline-install.js` is **chainable**: if Claude Code's `settings.json` already has a `statusLine.command` (claude-hud, vibe-usage-statusline.sh, custom script), the install:
1. Backs up `settings.json` → `~/.claude/settings.json.vbf-backup` (one-shot, never overwrites)
2. Writes the original command to `~/.vibe-friends/wrap-prev.sh` (chmod 755)
3. Replaces `statusLine.command` with `vbf-statusline` (resolved to `<node> <bin>/vibe-friends.js statusline-render`)

At each Claude turn boundary, `statusline.js`:
1. Drains stdin (Claude pipes session JSON)
2. Pipes that stdin to `wrap-prev.sh` if it exists, prints its stdout
3. Reads `~/.vibe-friends/cache.json`. If `now - lastRotatedAt >= 30s` (or it's the first render), advances `lastIndex` and updates `lastRotatedAt`; otherwise re-renders the current post without writing the cache. This keeps the line steady on fast turn boundaries — Claude Code reruns the statusline on every message / tool call / token update, which used to flip the post several times per second.
4. If cache is stale (>5min) **fires off `vbf refresh-cache` detached** — never blocks the statusline render

`--remove` reads `wrap-prev.sh`, extracts the `exec` target, restores it to `settings.json.statusLine.command`, deletes the wrap script. The `.vbf-backup` file stays in place as a safety net.

## Why Codex / Cursor / Windsurf only get the markdown fallback

- **Codex CLI statusline**: `tui.status_line` is a curated list of built-in items, no `command` shell-out. No way to inject our renderer.
- **Codex CLI TUI overlay**: no documented mechanism to suspend/restore the parent Codex TUI from a child process; the alt-screen overlay would leak rendering and Claude (in this case the Codex model) would see the captured stdout.
- For all three, `view` detects non-TTY / `TERM=dumb` and degrades to `list` automatically. The SKILL.md they get is identical — host model decides what to do with the markdown output.

## Releases

1. Bump `package.json` version.
2. Update README + AGENTS.md if user-facing behaviour changed.
3. `npm publish` (manual — keep a human in the loop on what hits npm).
4. Push to GitHub.

## Not in scope

- No personalisation (no "posts I voted") — would require auth, defeats zero-friction install.
- No write actions (no vote / comment) — those go to vibecafe.ai.
- No realtime ticker — Claude Code statusline only refreshes on turn boundaries, that's a hard upstream constraint.
