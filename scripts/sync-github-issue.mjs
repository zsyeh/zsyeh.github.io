import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) {
  console.log('GITHUB_EVENT_PATH is not set; skipping Issue import.');
  process.exit(0);
}

const event = JSON.parse(await readFile(eventPath, 'utf8'));
const issue = event.issue;
if (!issue || !issue.labels?.some((label) => label.name === 'article')) process.exit(0);

const output = path.resolve(`src/content/blog/github-${issue.number}.md`);
const published = issue.state === 'open' && issue.labels.some((label) => label.name === 'published');
if (!published) {
  await rm(output, { force: true });
  console.log(`Issue #${issue.number} is not published; content removed.`);
  process.exit(0);
}

function field(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = issue.body.match(new RegExp(`### ${escaped}\\s*\\n+([\\s\\S]*?)(?=\\n### |$)`));
  const value = match?.[1]?.trim();
  return !value || value === '_No response_' ? '' : value.replace(/^```markdown\n|\n```$/g, '');
}

const title = issue.title.replace(/^\[文章\]\s*/, '').trim();
const slug = field('文章网址标识');
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Issue #${issue.number}: invalid slug "${slug}"`);
const list = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);
const value = (input) => JSON.stringify(input);
const document = `---
githubIssue: ${issue.number}
title: ${value(title)}
slug: ${value(slug)}
description: ${value(field('摘要'))}
pubDate: ${value(issue.created_at)}
updatedDate: ${value(issue.updated_at)}
categories: ${value(list(field('分类')))}
tags: ${value(list(field('标签')))}
pinned: false
---

${field('正文').trim()}
`;

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, document);
console.log(`Issue #${issue.number} published to ${path.relative(process.cwd(), output)}.`);
