# CUAV article material coverage — 2026-10-25

Source: user-provided `山东理工大学+赵盛宇.zip` in `/PCSbaidu`.
The two MP4 files are intentionally excluded from the published article.
All other files are retained byte-for-byte: 13 photographs, the CUAV logo,
the two-page product-use PDF and the original Markdown draft. The four older
photographs and logo were already present; their hashes match the new package.
The remaining nine photographs and two attachments are added without resizing
or cropping. Signed download URLs, account configuration and videos are not
committed. `cuav-materials.json` records the original-name/public-file mapping,
coverage role and SHA256 of every non-video file.

The revised text incorporates the draft's funding/application story, sponsor
support, preparation and competition disappointment, omitted hardware-switch
requirement, earlier competition experience, self-funded X7+, student learning
and future plans. Relative competition years are not converted into invented
dates. Hardware-performance superlatives are rewritten as personal experience,
not quantitative comparisons. X7+ is explicitly outside the sponsored kit.
Indoor flight images do not substantiate GNSS accuracy. Installation/team
photographs supplement the earlier report; its original 2026-09-08 content is
not silently rewritten. The unchanged original draft is downloadable and is
clearly distinguished from the revised article.

The public slug and publication date remain unchanged. The article-specific
layout adds captions, click-through originals, responsive galleries, full-ratio
portrait images, two attachment links and a visible update date. Styles are
scoped to this article; other articles are not redesigned.

Verification (Node.js 22):

```sh
node scripts/verify-cuav-materials.mjs
npm run build
node scripts/verify-cuav-materials.mjs --dist
```

Browser checks at 1440px/390px verify all 14 images load without distortion,
13 figures/captions, original-image navigation, both attachment responses,
no video/embed, no horizontal overflow and no JavaScript errors. Deployment
uses the existing `main` push → GitHub Actions → `gh-pages` pipeline. Do not
modify the DNS/Pages domain or run unrelated Halo synchronization manually.
