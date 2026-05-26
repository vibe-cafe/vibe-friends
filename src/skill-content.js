export const SKILL_CONTENT = `---
name: vibe-friends
description: 在终端打开 Vibe Friends 社区热帖 TUI（VibeCafé 旗下社区）。
---

# Vibe Friends

当用户输入 \`/vibe-friends\`、说「看看社区」「Vibe Friends」「最新热帖」时，运行：

\`\`\`bash
npx @vibe-cafe/vibe-friends view
\`\`\`

这会进入一个独立的全屏 TUI（alt-screen，不污染主对话）。用户可以：
- \`↑↓\` 移动高亮
- \`Enter\` 在浏览器打开
- \`r\` 刷新
- \`q\` / \`ESC\` 退出

退出后只会留一行类似 \`[vibe-friends] 浏览了 10 条帖子，已退出\` 的摘要。

## 输出处理

- **不要总结、不要解读**。退出后的那一行摘要原样保留即可，**不要复述用户在 TUI 里看到了什么**（你也看不到）
- 用户主屏幕的对话上下文应当几乎不被影响

## 何时不用 view

- 用户明确说「列一下」「打 markdown」「不要 TUI」→ 改跑 \`npx @vibe-cafe/vibe-friends list\`
- 环境不是 TTY（CI、被管道接住）→ \`view\` 会自动降级到 \`list\`，无需你判断

## 注意

- 不需要登录、不需要 API key、不需要 vibe-usage CLI
- 999 Club 会员的帖子在 TUI 里会显示占位（\`[$999 Club 会员专属，请登录阅读]\`），点过去 web 端登录后才能看
`
