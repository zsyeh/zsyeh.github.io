import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';

const ROOT = process.cwd();
const CONTENT_DIR = path.resolve('src/content/blog');
const STATE_FILE = path.resolve('.sync/state.json');
const BASE_DIR = path.resolve('.sync/base');
const CONFLICT_DIR = path.resolve('.sync/conflicts');
const HALO_URL = (process.env.HALO_URL || 'https://dxlab.ehzsy.space').replace(/\/$/, '');
const HALO_TOKEN = process.env.HALO_TOKEN || '';
const REQUIRE_HALO_TOKEN = process.env.REQUIRE_HALO_TOKEN === '1';
const md = new MarkdownIt({ html: true, linkify: true, typographer: false });
const taxonomyCache = new Map();

if (REQUIRE_HALO_TOKEN && !HALO_TOKEN) {
  throw new Error('HALO_TOKEN is required for bidirectional synchronization');
}

const hash = (value) => createHash('sha256').update(value).digest('hex');
const valueHash = (file) => file == null ? null : hash(file);

async function json(file, fallback = {}) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}

async function files(directory) {
  const output = [];
  let entries = [];
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return output; }
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await files(full));
    else if (entry.name.endsWith('.md')) output.push(full);
  }
  return output;
}

async function documents() {
  const output = new Map();
  for (const file of await files(CONTENT_DIR)) {
    const source = await readFile(file, 'utf8');
    const parsed = matter(source);
    const key = parsed.data.haloId ? `halo:${parsed.data.haloId}` : parsed.data.githubIssue ? `github:${parsed.data.githubIssue}` : `file:${path.relative(CONTENT_DIR, file)}`;
    output.set(key, { file, source, parsed });
  }
  return output;
}

async function haloRequest(endpoint, options = {}) {
  if (!HALO_TOKEN) throw new Error('HALO_TOKEN is required to write GitHub changes back to Halo');
  const response = await fetch(`${HALO_URL}${endpoint}`, {
    ...options,
    headers: { authorization: `Bearer ${HALO_TOKEN}`, 'content-type': 'application/json', accept: 'application/json', ...options.headers },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function taxonomyIndex(kind) {
  if (taxonomyCache.has(kind)) return taxonomyCache.get(kind);
  const response = await haloRequest(`/apis/api.content.halo.run/v1alpha1/${kind}?page=1&size=200`);
  const index = new Map();
  for (const item of response.items || []) {
    index.set(item.spec.displayName.toLocaleLowerCase(), item.metadata.name);
    index.set(item.spec.slug.toLocaleLowerCase(), item.metadata.name);
  }
  taxonomyCache.set(kind, index);
  return index;
}

async function taxonomyIds(kind, requested = [], existing = []) {
  if (!Array.isArray(requested)) return existing;
  const index = await taxonomyIndex(kind);
  const resolved = requested.map((name) => index.get(String(name).toLocaleLowerCase())).filter(Boolean);
  const missing = requested.filter((name) => !index.has(String(name).toLocaleLowerCase()));
  if (missing.length) console.warn(`Unknown Halo ${kind}: ${missing.join(', ')}`);
  return [...new Set(resolved)];
}

function postSpec(data, existing = {}, taxonomy = {}) {
  return {
    ...existing,
    title: data.title,
    slug: data.slug,
    template: existing.template || '',
    cover: data.cover || '',
    deleted: false,
    publish: existing.publish ?? false,
    publishTime: existing.publishTime || null,
    pinned: Boolean(data.pinned),
    allowComment: existing.allowComment ?? true,
    visible: 'PUBLIC',
    priority: existing.priority || 0,
    excerpt: { autoGenerate: !data.description, raw: data.description || '' },
    categories: taxonomy.categories ?? existing.categories ?? [],
    tags: taxonomy.tags ?? existing.tags ?? [],
    htmlMetas: existing.htmlMetas || [],
  };
}

async function writeToHalo(doc) {
  const { data, content } = doc.parsed;
  const taxonomy = {
    categories: await taxonomyIds('categories', data.categories),
    tags: await taxonomyIds('tags', data.tags),
  };
  const payloadContent = { version: null, raw: content.trim(), content: md.render(content.trim()), rawType: 'MARKDOWN' };
  const syncAnnotations = {
    'astro.ehzsy.space/source': data.source === 'GitHub' ? 'github' : 'halo',
    'astro.ehzsy.space/author': data.author || 'Unknown',
  };
  let post;
  if (data.haloId) {
    post = await haloRequest(`/apis/content.halo.run/v1alpha1/posts/${data.haloId}`);
    post.metadata.annotations = { ...(post.metadata.annotations || {}), ...syncAnnotations };
    post.spec = postSpec(data, post.spec, taxonomy);
    post = await haloRequest(`/apis/api.console.halo.run/v1alpha1/posts/${data.haloId}`, { method: 'PUT', body: JSON.stringify({ post, content: payloadContent }) });
  } else {
    const request = {
      post: { apiVersion: 'content.halo.run/v1alpha1', kind: 'Post', metadata: { generateName: 'post-', annotations: syncAnnotations }, spec: postSpec(data, {}, taxonomy) },
      content: payloadContent,
    };
    post = await haloRequest('/apis/api.console.halo.run/v1alpha1/posts', { method: 'POST', body: JSON.stringify(request) });
    data.haloId = post.metadata.name;
    data.haloUrl = new URL(`/archives/${data.slug}`, HALO_URL).href;
    doc.source = matter.stringify(content.trim(), data);
    doc.parsed = matter(doc.source);
    await writeFile(doc.file, doc.source);
  }
  await haloRequest(`/apis/api.console.halo.run/v1alpha1/posts/${post.metadata.name}/publish?async=false`, { method: 'PUT' });
  return post.metadata.name;
}

async function unpublish(haloId) {
  await haloRequest(`/apis/api.console.halo.run/v1alpha1/posts/${haloId}/unpublish`, { method: 'PUT' });
}

async function mergeDocuments(current, base, incoming, key) {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'halo-astro-merge-'));
  const names = ['github.md', 'base.md', 'halo.md'];
  await Promise.all(names.map((name, index) => writeFile(path.join(temp, name), [current, base, incoming][index])));
  const result = spawnSync('git', ['merge-file', '-p', ...names], { cwd: temp, encoding: 'utf8' });
  await rm(temp, { recursive: true, force: true });
  if (result.status === 0) return { clean: true, content: result.stdout };
  await mkdir(CONFLICT_DIR, { recursive: true });
  const conflict = path.join(CONFLICT_DIR, `${key.replace(':', '-')}.md`);
  await writeFile(conflict, `# 双向同步冲突：${key}\n\n解决下面的冲突标记后，把最终版本写回文章文件并删除此文件。\n\n${result.stdout}`);
  return { clean: false, conflict };
}

await mkdir(BASE_DIR, { recursive: true });
await mkdir(CONFLICT_DIR, { recursive: true });
const storedState = await json(STATE_FILE, { posts: {} });
// Version 2 adds author/source provenance to the shared baseline. Re-bootstrap
// once instead of treating the exporter migration as edits on both sides.
const oldState = storedState.version === 2 ? storedState : { posts: {} };
const before = await documents();

execFileSync(process.execPath, ['scripts/sync-halo.mjs'], { cwd: ROOT, stdio: 'inherit', env: process.env });

const haloManifest = await json(path.resolve('.halo-sync.json'));
const after = await documents();
// Keep the state file deterministic. A per-run timestamp would make every
// polling pass look like a content change and create an empty sync commit.
const next = { version: 2, posts: {} };
const keys = new Set([...Object.keys(oldState.posts), ...before.keys(), ...after.keys()]);

for (const key of keys) {
  const previous = oldState.posts[key];
  const localBefore = before.get(key);
  let localAfter = after.get(key);
  const haloId = localBefore?.parsed.data.haloId || localAfter?.parsed.data.haloId || previous?.haloId;
  const haloSignature = haloId ? haloManifest[haloId] ?? null : null;

  if (!previous) {
    if (localAfter?.parsed.data.haloId) {
      // Existing Halo exports are the initial common baseline.
    } else if (localAfter) {
      try { await writeToHalo(localAfter); } catch (error) { console.warn(`${key}: ${error.message}`); continue; }
      localAfter = (await documents()).get(`halo:${localAfter.parsed.data.haloId}`) || localAfter;
    } else continue;
  } else {
    const gitChanged = valueHash(localBefore?.source) !== previous.gitHash;
    const haloChanged = haloSignature !== previous.haloSignature;

    if (!localBefore && haloSignature && !haloChanged) {
      try { await unpublish(haloId); } catch (error) { console.warn(`${key}: ${error.message}`); next.posts[key] = previous; continue; }
      if (localAfter) await rm(localAfter.file, { force: true });
      await rm(path.join(BASE_DIR, `${hash(key)}.md`), { force: true });
      continue;
    }
    if (!haloSignature && localBefore && !gitChanged) {
      // Halo was unpublished/deleted: its exported Markdown is removed from the publish repository.
      if (localAfter) await rm(localAfter.file, { force: true });
      await rm(path.join(BASE_DIR, `${hash(key)}.md`), { force: true });
      continue;
    }
    if (gitChanged && haloChanged && localBefore && localAfter) {
      const base = await readFile(path.join(BASE_DIR, `${hash(key)}.md`), 'utf8');
      const merged = await mergeDocuments(localBefore.source, base, localAfter.source, key);
      if (!merged.clean) {
        await writeFile(localBefore.file, localBefore.source);
        console.warn(`${key}: automatic merge failed; conflict record created.`);
        next.posts[key] = previous;
        continue;
      }
      await writeFile(localBefore.file, merged.content);
      localAfter = { file: localBefore.file, source: merged.content, parsed: matter(merged.content) };
      try { await writeToHalo(localAfter); } catch (error) { console.warn(`${key}: ${error.message}`); next.posts[key] = previous; continue; }
    } else if (gitChanged && localBefore) {
      // sync-halo intentionally preserves locally changed files when Halo itself is unchanged.
      try { await writeToHalo(localBefore); localAfter = localBefore; } catch (error) { console.warn(`${key}: ${error.message}`); next.posts[key] = previous; continue; }
    }
  }

  if (!localAfter) continue;
  const finalKey = localAfter.parsed.data.haloId ? `halo:${localAfter.parsed.data.haloId}` : key;
  const baseFile = path.join(BASE_DIR, `${hash(finalKey)}.md`);
  await writeFile(baseFile, localAfter.source);
  next.posts[finalKey] = {
    haloId: localAfter.parsed.data.haloId || null,
    file: path.relative(ROOT, localAfter.file),
    gitHash: valueHash(localAfter.source),
    haloSignature: localAfter.parsed.data.haloId === haloId ? haloSignature : null,
  };
}

await writeFile(STATE_FILE, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Bidirectional sync complete: ${Object.keys(next.posts).length} tracked posts.`);
