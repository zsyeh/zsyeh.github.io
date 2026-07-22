import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const HALO_URL = (process.env.HALO_URL || 'https://dxlab.ehzsy.space').replace(/\/$/, '');
const CONTENT_DIR = path.resolve('src/content/blog');
const ASSET_DIR = path.resolve('public/halo-assets');
const MANIFEST_FILE = path.resolve('.halo-sync.json');
const PAGE_SIZE = 100;
const HALO_TOKEN = process.env.HALO_TOKEN || '';

async function requestJson(url) {
  const headers = { accept: 'application/json' };
  if (HALO_TOKEN) headers.authorization = `Bearer ${HALO_TOKEN}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function listPosts() {
  const posts = [];
  for (let page = 1; ; page += 1) {
    const url = `${HALO_URL}/apis/api.content.halo.run/v1alpha1/posts?page=${page}&size=${PAGE_SIZE}`;
    const result = await requestJson(url);
    posts.push(...result.items);
    if (posts.length >= result.total) return posts;
  }
}

function uploadUrls(markdown, cover) {
  const escapedOrigin = HALO_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:${escapedOrigin})?\\/upload\\/[^\\s\\"'<>)}\\]]+`, 'g');
  return [...new Set(`${markdown}\n${cover || ''}`.match(pattern) || [])];
}

function assetInfo(source) {
  const url = new URL(source, HALO_URL);
  if (url.origin !== new URL(HALO_URL).origin || !url.pathname.startsWith('/upload/')) return null;
  const encodedRelative = url.pathname.slice('/upload/'.length);
  const decodedRelative = decodeURIComponent(encodedRelative);
  const target = path.resolve(ASSET_DIR, decodedRelative);
  if (!target.startsWith(`${ASSET_DIR}${path.sep}`)) throw new Error(`Unsafe asset path: ${source}`);
  return { source: url.href, publicPath: `/halo-assets/${encodedRelative}`, target };
}

async function downloadAsset(info) {
  try {
    await access(info.target);
    return;
  } catch {}
  const headers = HALO_TOKEN ? { authorization: `Bearer ${HALO_TOKEN}` } : {};
  const response = await fetch(info.source, { headers });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  await mkdir(path.dirname(info.target), { recursive: true });
  await writeFile(info.target, Buffer.from(await response.arrayBuffer()));
}

async function localizeAssets(markdown, cover) {
  const replacements = new Map();
  const retained = new Set();
  for (const source of uploadUrls(markdown, cover)) {
    const info = assetInfo(source);
    if (!info) continue;
    try {
      await downloadAsset(info);
      replacements.set(source, info.publicPath);
      retained.add(info.target);
    } catch (error) {
      console.warn(`Asset skipped (${source}): ${error.message}`);
    }
  }

  let body = markdown;
  let localCover = cover || undefined;
  for (const [source, target] of replacements) {
    body = body.split(source).join(target);
    if (localCover === source) localCover = target;
  }
  if (localCover?.startsWith('/upload/')) localCover = `${HALO_URL}${localCover}`;
  return { body, cover: localCover, retained };
}

function frontmatter(post, cover) {
  const data = {
    haloId: post.metadata.name,
    title: post.spec.title,
    slug: post.spec.slug,
    description: post.status.excerpt || post.spec.excerpt?.raw || '',
    pubDate: post.spec.publishTime || post.metadata.creationTimestamp,
    updatedDate: post.status.lastModifyTime || post.spec.publishTime,
    ...(cover ? { cover } : {}),
    categories: (post.categories || []).map((item) => item.spec.displayName),
    tags: (post.tags || []).map((item) => item.spec.displayName),
    pinned: Boolean(post.spec.pinned),
    haloUrl: new URL(post.status.permalink, HALO_URL).href,
  };
  return Object.entries(data).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n');
}

async function writeIfChanged(file, content) {
  let previous;
  try { previous = await readFile(file, 'utf8'); } catch {}
  if (previous === content) return false;
  await writeFile(file, content);
  return true;
}

async function readManifest() {
  try { return JSON.parse(await readFile(MANIFEST_FILE, 'utf8')); } catch { return {}; }
}

function signature(post) {
  return [
    post.metadata.version,
    post.metadata.annotations?.['checksum/content'],
    post.metadata.annotations?.['checksum/config'],
    post.status.lastModifyTime,
  ].join(':');
}

function retainDocumentAssets(document, retainedAssets) {
  const matches = document.matchAll(/\/halo-assets\/([^\s\"'<>)}\]]+)/g);
  for (const match of matches) {
    const target = path.resolve(ASSET_DIR, decodeURIComponent(match[1]));
    if (target.startsWith(`${ASSET_DIR}${path.sep}`)) retainedAssets.add(target);
  }
}

async function walkFiles(directory) {
  const files = [];
  let entries = [];
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return files; }
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(fullPath));
    else files.push(fullPath);
  }
  return files;
}

await mkdir(CONTENT_DIR, { recursive: true });
await mkdir(ASSET_DIR, { recursive: true });

const summaries = await listPosts();
const published = summaries.filter((post) =>
  post.spec.publish && !post.spec.deleted && post.spec.visible === 'PUBLIC' && post.status.phase === 'PUBLISHED'
);
const retainedPosts = new Set();
const retainedAssets = new Set();
const previousManifest = await readManifest();
const nextManifest = {};
let changed = 0;

for (const summary of published) {
  const file = path.join(CONTENT_DIR, `${summary.metadata.name}.md`);
  const currentSignature = signature(summary);
  nextManifest[summary.metadata.name] = currentSignature;
  if (previousManifest[summary.metadata.name] === currentSignature) {
    try {
      const document = await readFile(file, 'utf8');
      retainedPosts.add(file);
      retainDocumentAssets(document, retainedAssets);
      continue;
    } catch {}
  }
  let post;
  try {
    post = await requestJson(`${HALO_URL}/apis/api.content.halo.run/v1alpha1/posts/${summary.metadata.name}`);
  } catch (error) {
    console.warn(`Post skipped (${summary.metadata.name}): ${error.message}`);
    try {
      const document = await readFile(file, 'utf8');
      retainedPosts.add(file);
      retainDocumentAssets(document, retainedAssets);
      if (previousManifest[summary.metadata.name]) nextManifest[summary.metadata.name] = previousManifest[summary.metadata.name];
      else delete nextManifest[summary.metadata.name];
    } catch {}
    continue;
  }
  const localized = await localizeAssets(post.content?.raw || '', post.spec.cover);
  for (const asset of localized.retained) retainedAssets.add(asset);
  const document = `---\n${frontmatter(post, localized.cover)}\n---\n\n${localized.body.trim()}\n`;
  if (await writeIfChanged(file, document)) changed += 1;
  retainedPosts.add(file);
}

for (const file of await walkFiles(CONTENT_DIR)) {
  const managedByHalo = Object.hasOwn(previousManifest, path.basename(file, '.md'));
  if (file.endsWith('.md') && managedByHalo && !retainedPosts.has(file)) {
    await rm(file);
    changed += 1;
  }
}
for (const file of await walkFiles(ASSET_DIR)) {
  if (!retainedAssets.has(file)) await rm(file);
}
await writeIfChanged(MANIFEST_FILE, `${JSON.stringify(nextManifest, null, 2)}\n`);

console.log(`Halo sync complete: ${published.length} published posts, ${changed} content files changed, ${retainedAssets.size} assets.`);
