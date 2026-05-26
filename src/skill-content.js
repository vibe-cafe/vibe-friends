export const SKILL_CONTENT = `---
name: vibe-friends
description: 看 Vibe Friends 社区当下热帖（VibeCafé 旗下）。
---

# Vibe Friends

当用户输入 \`/vibe-friends\`、说「看看社区」「Vibe Friends」「最新热帖」时，运行：

\`\`\`bash
npx @vibe-cafe/vibe-friends list
\`\`\`

可选参数（用户没特别说就别加）：
- \`--sort new\` 看最新发的（默认 \`top\` 热度）
- \`--limit 20\` 多看几条（默认 10，最多 30）

## 输出处理

命令输出已经是 markdown 列表，每条带 vibecafe.ai 链接。**原样展示给用户，不要总结、不要解读、不要换语言**。用户会点击链接打开浏览器看详情。

## 注意

- 不需要登录、不需要 API key、不需要 vibe-usage CLI
- 999 Club 会员的帖子会显示占位（[$999 Club 会员专属，请登录阅读]），用户点过去 web 端登录后才能看
`
