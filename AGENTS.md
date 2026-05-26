# vibe-friends — agent notes

Independent npm package that installs a `/vibe-friends` skill into Claude Code, Codex CLI, Cursor, and Windsurf. The skill calls a public read-only endpoint on vibecafe.ai and renders the top posts as markdown.

This repo deliberately does **not** depend on `@vibe-cafe/vibe-usage` — different purpose, different release cadence, different install story. The two skills share a server (vibecafe.ai) but nothing else.

## Layout

```
.
├── bin/
│   └── vibe-friends.js       # CLI entry — routes `<no-arg>` / `list` / `--remove` / `help`
├── src/
│   ├── install.js            # Detect AI tools → write SKILL.md (mirrors vibe-usage's installer shape but no shared code)
│   ├── list.js               # GET /api/news/public → markdown table
│   └── skill-content.js      # SKILL.md template (tells Claude/Codex to run `npx … list` and print raw)
├── README.md
└── package.json              # ESM, Node >= 20, zero deps
```

## Key conventions

- **Pure ESM** (`"type": "module"`), Node built-ins only (no deps). Same hygiene as vibe-usage.
- **Skill discipline**: the SKILL.md tells the host model to **print the command output verbatim** — don't summarise, don't translate. This keeps tokens cheap and avoids paraphrase drift on numbers / handles.
- **No auth.** The endpoint is public. Anyone who can `npx` can see the feed; no key file, no config file on disk.
- **API URL override**: `VIBE_FRIENDS_API_URL` env var swaps the base URL — used for local dev against `http://localhost:3000`. Default: `https://vibecafe.ai`.
- **999-only posts** show a placeholder title (`[$999 Club 会员专属，请登录阅读]`) in the list. The link still resolves to vibecafe.ai where Clerk decides what to render. The placeholder + handle redaction live **server-side** in `/api/news/public/route.ts` — never trust client-side filtering.

## Naming

`VibeCafé` is the company. `Vibe Friends` is the community brand (always spelled with a space). `Vibe Usage` is the sibling product. Use these spellings in all user-facing text.

## Server contract

`GET https://vibecafe.ai/api/news/public?sort=top|new&limit=N`

Response shape:
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

## Releases

1. Bump `package.json` version.
2. Update README if user-facing behaviour changed.
3. `npm publish` (manual — keep human in the loop on what hits npm).
4. Push to GitHub: `git push origin main`. No CI yet; no release tags required.

## Not in scope

- No personalisation (no "posts I voted", "posts I authored") — would require auth, defeats the zero-friction install.
- No write actions (no vote / comment / submit) — go to vibecafe.ai for those.
- No statusline integration — passive consumption is the [claude-hud](https://github.com/) path, not a skill.
