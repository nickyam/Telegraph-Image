# AGENTS.md

给 AI 编码代理（及任何接手本仓库的人）看的操作约定。以下红线必须遵守。

## 项目
Telegraph-Image 定制 fork，Cloudflare Pages 部署，图床 yun.nickyam.com。
push 到 `main` 即触发 CF Pages 自动部署。

## 操作红线（最高优先）
- 上游同步：**绝不 `git merge upstream/main`**。更新走「fetch 上游 → 列逐文件 diff → 用户逐项挑 → 手动移植单点改动到 main」，绝不整包合并、绝不覆盖定制。
- **绝不自动 push**；push 前须用户明确确认。
- **不删 `img-block-compressed.png`**：防盗链命中时 `functions/file/[id].js` 302 到它，是线上占位图。
- 站内链接 / functions 内 302 目标**一律不带 `.html`**（Pages auto-trailing-slash 会把 `/xxx.html` 308 到 `/xxx`）。
- 首页壁纸用 `urlbase + _1280x720.jpg`（按视口降级 `_960x540`）。
- `/file/*` 2xx 缓存 30 天 + stale-while-revalidate；非 2xx 强制 `no-store`（telegra.ph 404/5xx 自带长缓存，透传会导致「图片莫名裂」）。
- 上传 `POST /upload`，Basic auth，字段 `file`；限流 10 次/10 秒（调用方须串行 + 间隔）。
- 根目录 `404.html` 由 Pages 自动用于 not-found，勿删。
- `admin-imgtc.html` / `admin-waterfall.html` 从 `admin.html` 有入口，保留。

## 密钥
不在本文件。均在 Cloudflare 环境变量中（`TG_BOT_TOKEN` / `CHAT_ID` 等），勿写入仓库、勿泄露。
