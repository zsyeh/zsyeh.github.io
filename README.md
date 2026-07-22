# Halo → Astro Blog

这是 `zsyeh.github.io` 的 Astro 源码。文章可以在 Halo 中维护，也可以通过带 `article` 和 `published` 标签的 GitHub Issue 发布；GitHub 侧的文章变化会写回 Halo，随后构建并发布到 GitHub Pages。

运行环境需要 Node.js 22.12 或更高版本。

## 同步链路

- 本机 `halo-astro-sync.service` 每 20 秒检查一次 Halo，只在内容变化时提交并推送，用于加速 Halo → GitHub。
- GitHub Actions 收到推送后构建 Astro 并部署 Pages。
- Actions 还会每 5 分钟执行一次带三方合并的双向同步，作为本机同步服务的兜底，并将 GitHub 文章变化写回 Halo。
- 文章 Markdown、封面及 `/upload/` 附件会一并保存到仓库；草稿、私密文章和回收站文章不会发布。
- GitHub 仓库必须配置 Actions 密钥 `HALO_TOKEN`；缺少密钥时工作流会明确失败，避免出现看似成功、实际没有写回 Halo 的情况。

## 本地命令

```bash
npm ci
npm run sync
npm run dev
npm run build
```

同步源可通过环境变量覆盖：

```bash
HALO_URL=https://dxlab.ehzsy.space npm run sync
```

## 同步服务维护

```bash
systemctl --user status halo-astro-sync.service
journalctl --user -u halo-astro-sync.service -f
systemctl --user restart halo-astro-sync.service
```

如果工作目录发生变化，需要同步修改 `systemd/halo-astro-sync.service` 中的 `WorkingDirectory` 和 `ExecStart`，再复制到 `~/.config/systemd/user/` 并运行 `systemctl --user daemon-reload`。

## 手动触发云端同步

GitHub 仓库的 Actions 页面可手动运行 **Sync Halo and deploy Pages**。工作流也接受 `halo-published` 类型的 `repository_dispatch`。当前的 20 秒增量检查无需在 Halo 保存 GitHub PAT，也不引入额外插件维护成本；发布到 Pages 的主要耗时实际来自 GitHub Actions 构建，而不是这段检查间隔。
