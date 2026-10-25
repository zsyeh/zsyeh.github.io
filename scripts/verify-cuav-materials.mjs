import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('./cuav-materials.json', import.meta.url), 'utf8'));
const prefix = '/article-assets/cuav-sponsorship-2026/';
const article = await readFile(path.join(root, 'src/content/blog', `${manifest.article_slug}.md`), 'utf8');
const template = await readFile(path.join(root, 'src/components/ArticlePage.astro'), 'utf8');
const references = article + template;
assert.equal(manifest.files.length, 16);
assert.equal(new Set(manifest.files.map((f) => f.file)).size, 16);
assert.equal(manifest.excluded.length, 2);
assert(!/<video\b|<iframe\b|\.(?:mp4|mov)(?:["')?\s]|$)/i.test(article), 'Video must not be embedded or linked');
assert(article.includes('安装硬件开关'));
assert(article.includes('自费购入'));
assert(article.includes('不能证明当时启用了 GNSS'));
for (const file of manifest.files) {
  assert(!file.file.includes('/') && !file.file.includes('..'));
  const bytes = await readFile(path.join(root, 'public', prefix, file.file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, `Original bytes changed: ${file.file}`);
  assert(references.includes(prefix + file.file), `Non-video material omitted: ${file.original}`);
}
const images = [...article.matchAll(/<img\b[^>]+>/g)].map((m) => m[0]);
assert.equal(images.length, 13, 'All thirteen editorial photographs must appear');
for (const image of images) {
  assert(/alt="[^"]+"/.test(image));
  assert(/width="\d+"/.test(image) && /height="\d+"/.test(image));
}
if (process.argv.includes('--dist')) {
  const html = await readFile(path.join(root, 'dist/archives', manifest.article_slug, 'index.html'), 'utf8');
  for (const file of manifest.files) {
    assert(html.includes(prefix + file.file), `Missing published reference: ${file.file}`);
    const bytes = await readFile(path.join(root, 'dist', prefix, file.file));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
  }
  assert(!html.includes('<video') && !html.includes('<iframe'));
  assert(html.includes('2026年10月25日'));
}
console.log('CUAV material checks passed: 14 images including logo, original PDF, original draft; 2 videos excluded.');
