---
haloId: "post-m1ootn8u"
author: "eH"
source: "GitHub"
title: "从 Halo 到 Astro：构建同域名、同路由、可追溯的博客容灾与双向同步系统"
slug: "halo-astro-same-domain-failover-and-sync"
description: "记录 eH × DxLab 如何把 Halo、Astro、GitHub Pages、Nginx 与 GitHub Actions 组合成一套保留作者归属、统一 URI、支持图片归档和同域故障切换的发布系统。"
pubDate: "2026-07-22T08:00:41.810106670Z"
updatedDate: "2026-07-22T08:03:22.289325073Z"
categories: []
tags: []
pinned: true
haloUrl: "https://dxlab.ehzsy.space/archives/halo-astro-same-domain-failover-and-sync"
---

一套个人或小团队博客系统，通常会在“方便写作”和“可靠发布”之间做选择：动态 CMS 适合管理内容，但依赖数据库、运行时和服务器；静态站点稳定、快速、容易托管，却不一定适合日常编辑。

这次改造没有在 Halo 和 Astro 之间二选一，而是让两者承担不同职责：Halo 继续作为主要写作与内容管理系统，Astro 负责生成可独立存活的静态副本，GitHub 保存文章和图片，Nginx 则在统一域名下完成故障切换。

最终形成的站点以 **eH × DxLab** 对外展示，由 **eH** 负责站点所有权和基础设施维护。站内文章可能来自多位贡献者，因此站点 Owner 与文章 Author 被明确分开：平台属于 eH，但每篇文章仍保留自己的原始作者和首次写作入口。

## 一、改造目标

这套系统需要同时满足以下要求：

1. Halo 正常时，`dxlab.ehzsy.space` 直接访问 Halo。
2. Halo、FRP 或源站不可用时，同一个域名自动回源 Astro GitHub Pages。
3. 故障切换期间浏览器不跳转到备用域名。
4. Halo 与 Astro 的文章 URI 完全一致，刷新当前文章也能落到正确的备用页面。
5. Halo 与 GitHub 两端都能写作，并保留作者、来源和更新记录。
6. Halo 图片进入 GitHub 仓库，静态副本不依赖已经失效的源站图片。
7. 同步必须是增量的，不能因为内部版本号变化不断制造空提交。

整体结构如下：

```text
                         ┌──────────────┐
                         │ Halo writers │
                         └──────┬───────┘
                                │ publish
                                ▼
┌────────┐   primary   ┌────────────────┐
│ Browser│────────────▶│  Entry Nginx   │────────────▶ Halo
└────────┘             │ dxlab.ehzsy... │
     ▲                  └───────┬────────┘
     │ same host/path           │ 5xx / timeout
     │                          ▼
     │                  ┌────────────────┐
     └──────────────────│  Astro Pages   │
                        │ blog.ehzsy...  │
                        └───────▲────────┘
                                │ build
                         ┌──────┴───────┐
                         │ GitHub repo  │
                         └──────▲───────┘
                                │ sync
                         ┌──────┴───────┐
                         │ Halo content │
                         └──────────────┘
```

## 二、为什么备用站必须与 Halo 使用相同 URI

最初 Astro 的文章详情页位于：

```text
/posts/<slug>/
```

而 Halo 的公开 permalink 是：

```text
/archives/<slug>
```

这种差异在普通浏览时不明显，却会直接破坏容灾。假设读者正在访问：

```text
https://dxlab.ehzsy.space/archives/example-post
```

如果 Halo 恰好故障，Nginx 会把完全相同的请求路径交给 Astro。Astro 如果只生成 `/posts/example-post/`，备用站只能返回 404。入口代理知道上游是否健康，却不应该猜测每种内容的路径映射。

解决方案是在 Astro 中直接生成 Halo 的 permalink：

```text
src/pages/archives/[slug].astro
```

核心静态路径生成逻辑是：

```ts
export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({
    params: { slug: post.data.slug },
    props: { post },
  }));
}
```

所有首页卡片、归档列表和分类链接也统一指向 `/archives/<slug>`。旧的 `/posts/<slug>/` 页面暂时保留，用于兼容过去可能存在的收藏和外链，但它不再是站内主链接。

这次构建共为 46 篇公开文章生成了对应的 `/archives/<slug>` 静态页面。URI 对齐后，主站和备用站可以使用同一份请求路径，不再需要按文章执行重写。

## 三、Nginx 如何在不切换域名的情况下回源 GitHub Pages

`blog.ehzsy.space` 是 GitHub Pages 的独立检查入口，`dxlab.ehzsy.space` 才是公开访问时的统一入口。浏览器始终请求后者，是否使用备用站由服务器内部决定。

入口配置的关键部分可以抽象为：

```nginx
upstream astro_github_pages {
    server <github-pages-origin>:443;
}

server {
    listen 443 ssl;
    server_name dxlab.ehzsy.space;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_connect_timeout 3s;
        proxy_read_timeout 8s;

        proxy_intercept_errors on;
        error_page 500 502 503 504 = @astro_fallback;

        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location @astro_fallback {
        proxy_pass https://astro_github_pages;
        proxy_ssl_server_name on;
        proxy_ssl_name blog.ehzsy.space;
        proxy_set_header Host blog.ehzsy.space;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto https;

        proxy_redirect https://blog.ehzsy.space/ https://dxlab.ehzsy.space/;
        proxy_redirect http://blog.ehzsy.space/ https://dxlab.ehzsy.space/;
        add_header X-Dxlab-Upstream astro-github-pages always;
    }
}
```

这里有四个容易忽略的细节。

### 1. 使用内部命名 location

`error_page ... = @astro_fallback` 让 Nginx 在服务器内部发起第二次回源，而不是向浏览器返回 302。用户看到的 Host 和 URI 都不会因为切换而改变。

### 2. 正确设置 TLS SNI 和 Host

GitHub Pages 依赖域名选择站点。仅修改 `Host` 不够，TLS 握手还需要：

```nginx
proxy_ssl_server_name on;
proxy_ssl_name blog.ehzsy.space;
```

缺少它们时，共享 CDN 可能返回证书错误或错误站点。

### 3. 重写备用站的规范化跳转

静态托管通常会把 `/archives/example` 规范化到 `/archives/example/`。如果把上游 `Location` 原样返回，浏览器会看到 `blog.ehzsy.space`，破坏“中途不切换域名”的要求。

`proxy_redirect` 会将这类响应重新写回 `dxlab.ehzsy.space`。即使发生末尾斜杠规范化，域名仍保持不变。

### 4. 不要把失效判定时间设得过长

源站断开时，FRP 的入口端口有时仍能接受连接，却迟迟没有响应。原先 30 秒的 `proxy_read_timeout` 会让用户长时间看到加载状态。将其调整为 8 秒后，实测约 9.2 秒即可得到备用文章页面。

这个时间不是理论上的零延迟。若需要亚秒级切换，应增加主动健康检查、双 upstream 或在更靠近用户的边缘层实现健康探测。对于当前架构，8 秒是在正常后台操作与故障体验之间的折中。

## 四、Halo 与 Astro 的内容同步

同步分为两条链路，而不是让所有任务都塞进同一个定时脚本。

### Halo 到 GitHub

本机用户级 systemd 服务每 20 秒执行一次 Halo 导出：

```text
halo-astro-sync.service
  └─ watch-and-sync.sh
      └─ scripts/sync-halo.mjs
```

导出器只选择同时满足以下条件的文章：

- 已发布；
- 未删除；
- 可见性为公开；
- 当前状态为 `PUBLISHED`。

文章被转换为带 frontmatter 的 Markdown，保存在 `src/content/blog/`。只有真实文件发生变化时，轮询服务才提交 Git 记录并推送。

### GitHub 到 Halo

GitHub Actions 在仓库推送、Issue 更新、手动触发和定时任务中运行双向同步。同步器保存三类状态：

```text
.halo-sync.json   Halo 文章内容签名
.sync/state.json  两端上次一致时的状态
.sync/base/       三方合并所需的共同基线
```

判断逻辑可以概括为：

```text
仅 Halo 改动   -> 导出到 GitHub
仅 GitHub 改动 -> 写回 Halo
两端同时改动   -> 使用共同基线进行三方合并
同一段冲突     -> 保留原文并生成冲突记录
```

同步系统不会在冲突时静默选择某一边，因为对于文章来说，“最后写入者覆盖”通常意味着不可恢复的内容损失。

## 五、消除 revision 引起的提交循环

Halo 的 `metadata.version` 会在资源被更新时增长，但 version 变化不一定意味着文章正文、标题或配置发生变化。如果把它放入同步签名，就可能出现下面的循环：

```text
GitHub Actions 写回 Halo
        ↓
Halo metadata.version + 1
        ↓
本机轮询认为文章变化
        ↓
提交新的状态文件
        ↓
再次触发 GitHub Actions
```

更糟的是，46 篇文章会一起改动状态，看起来像一次大规模内容更新，实际上正文一个字都没有变化。

修复后的签名只保留与发布结果有关的字段：

```js
function signature(post) {
  return [
    EXPORT_VERSION,
    post.metadata.annotations?.['checksum/content'],
    post.metadata.annotations?.['checksum/config'],
    post.status.lastModifyTime,
  ].join(':');
}
```

`metadata.version` 被明确排除。连续执行两次同步时，第二次应当得到：

```text
46 published posts, 0 content files changed
```

同时 Git 工作区保持干净。这比单纯在脚本末尾忽略状态文件更可靠，因为真正的内容变化仍会触发部署。

## 六、站点 Owner、文章 Author 与写作来源

站点使用 **eH × DxLab** 品牌，但这不表示全部文章都由 eH 创作。为了避免平台归属覆盖创作者署名，每篇 Markdown 都保留两个独立字段：

```yaml
author: "YangLuoNou"
source: "Halo"
```

它们在页面上显示为：

```text
BY YangLuoNou · WRITTEN ON HALO
```

其语义分别是：

- **Owner**：eH，负责域名、仓库、发布系统和站点维护；
- **Author**：文章实际作者，来自 Halo Owner 显示名或 GitHub Issue 创建者；
- **Source**：文章首次写作并上传的平台，即 Halo 或 GitHub。

作者和来源还会写入 Halo annotations。文章在两端往返同步后，署名不会退化为运行同步任务的机器人账号。

## 七、把图片放进 GitHub，并保持可检索

只同步 Markdown 并不能形成真正独立的备用站。如果正文仍引用 Halo 的 `/upload/`，Halo 停机后页面虽然能打开，图片却会全部失效。

同步器会识别 Halo 封面和正文中的上传地址，将文件下载到：

```text
public/halo-assets/
```

随后把 Markdown 引用改写为仓库中的静态路径。GitHub Issue 中粘贴的图片则继续使用 GitHub Attachments。这样当前发布内容不依赖第三方公共图床，也不依赖 Halo 在线提供图片。

为了方便检索，系统还生成：

```text
public/halo-assets/manifest.json
```

索引记录包括：

- 文件名；
- 当前访问路径；
- 原始来源；
- 存储类型；
- 引用文章标题；
- 文章 Slug；
- Halo ID。

例如可以按文章 Slug 查找全部图片：

```bash
jq '.assets[] | select(.references[].slug == "article-slug")' \
  public/halo-assets/manifest.json
```

Git 仓库由此同时承担版本库、静态资源源站和轻量图片目录的职责。

## 八、验证故障切换不能只看首页

只请求首页得到 200，无法证明容灾真正可用。完整测试至少需要覆盖：

1. 首页；
2. 归档页；
3. 一篇 eH 的文章；
4. 一篇其他贡献者的文章；
5. 分类与标签页；
6. RSS；
7. 图片资源；
8. 无末尾斜杠的文章 URI。

测试时先暂停同步轮询，再停止 Halo，避免轮询任务把预期内的故障记录成持续错误：

```bash
systemctl --user stop halo-astro-sync.service
docker stop halo
```

从外部网络验证：

```bash
curl -sS -D - -o /tmp/page \
  https://dxlab.ehzsy.space/archives/example-post/
```

预期响应包含：

```text
HTTP/2 200
X-Dxlab-Upstream: astro-github-pages
```

同时检查正文中存在正确的 `BY <author>` 和 `WRITTEN ON <source>`，浏览器有效 URL 仍属于 `dxlab.ehzsy.space`。

测试完成后显式恢复服务：

```bash
docker start halo
systemctl --user start halo-astro-sync.service
```

最后再次确认容器、同步服务和公网文章均正常。不要只依赖 shell 的退出钩子恢复关键服务；远程命令超时或执行环境强制终止时，退出钩子未必有机会完整运行。

## 九、最终结果与边界

改造完成后，这套发布系统具备以下特性：

- Halo 保留成熟的后台写作体验；
- Astro 提供独立、快速的静态副本；
- GitHub 保存文章、历史版本和绝大多数图片；
- 主站与备用站使用相同文章 URI；
- Nginx 在服务端回源，切换时不暴露备用域名；
- eH 的站点所有权与贡献者的文章署名互不冲突；
- GitHub 和 Halo 的首次写作来源可追溯；
- 双向修改通过共同基线合并；
- revision-only 变化不会制造持续部署循环。

它仍然不是跨地域数据库级双活：Halo 后台只有主实例，GitHub Pages 的更新也受构建时间影响。但对于个人技术站和小型团队知识库，这套设计把动态 CMS 的易用性、静态站点的生存能力以及 Git 的可追溯性组合在了一起。

真正可靠的博客并不是“永远不故障”，而是在某一层故障时，读者仍能用原来的域名和原来的链接读到同一篇文章；系统恢复后，作者也能继续在熟悉的入口写作。
