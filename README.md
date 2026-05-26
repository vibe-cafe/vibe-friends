# vibe-friends

`/vibe-friends` slash command for Claude Code, Codex CLI, Cursor, and Windsurf — peek at the latest posts from **Vibe Friends**, the community built by [VibeCafé](https://vibecafe.ai), right from your AI coding tool.

## Install

```bash
npx @vibe-cafe/vibe-friends
```

That's it. The installer:
1. Detects which AI coding tools you have (Claude Code / Codex CLI / Cursor / Windsurf)
2. Writes a `SKILL.md` to each tool's skills directory

Then type `/vibe-friends` inside any of those tools to see the top posts.

No account, no API key, no setup. The skill calls a public read-only endpoint on vibecafe.ai.

## What you see

```
# Vibe Friends 社区热帖

1. **[Claude Code 用了一个月，每天 30 刀…](https://vibecafe.ai/item/abc123)** — @duck4money · 42 赞 · 12 评论
2. **[Codex 5 hour cap 还有人在用吗](https://vibecafe.ai/item/def456)** — @other · 31 赞 · 8 评论
...

来 Vibe Friends 社区参与讨论: https://vibecafe.ai
```

Click any link to open the post in your browser — that's where you vote, comment, and reply.

## Want to peek without polluting your AI session?

`/vibe-friends` runs inside your Claude Code / Codex conversation, so the output becomes part of the chat history and counts toward context.

If you'd rather glance at the feed *without* interrupting whatever you're asking the AI to do, two options:

- **Open a second terminal pane / tmux split** and just run `npx @vibe-cafe/vibe-friends list` there. Zero context cost.
- **Claude Code only** — use the `!` prefix in the input box: `!npx @vibe-cafe/vibe-friends list` runs the shell command directly without invoking the model. No tokens spent, no message in history.

## Other commands

```bash
npx @vibe-cafe/vibe-friends                  # Install the skill
npx @vibe-cafe/vibe-friends list             # Print the top 10 as markdown
npx @vibe-cafe/vibe-friends list --sort new  # Latest instead of top
npx @vibe-cafe/vibe-friends list --limit 20  # Show more (max 30)
npx @vibe-cafe/vibe-friends --remove         # Uninstall the skill
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

- **Statusline mode** for Claude Code — a one-liner ("最热: …") in the status bar so you can glance at it without typing anything. Only viable in Claude Code (Codex / Cursor have no statusline extension point). Holding off until we hear whether people actually want it.
- **Vibe Usage app tab** — surfacing the feed in the [vibe-usage Mac app](https://github.com/vibe-cafe/vibe-usage-app)'s menu-bar popover, which is the most "always visible" UX possible. Tracking separately.

## Related

- [Vibe Usage](https://github.com/vibe-cafe/vibe-usage) — the `/vibe-usage` skill + CLI that tracks AI token spend
- [Vibe Usage Mac app](https://github.com/vibe-cafe/vibe-usage-app) — menu-bar usage tracker
- [VibeCafé](https://vibecafe.ai) — the community itself

## License

MIT
