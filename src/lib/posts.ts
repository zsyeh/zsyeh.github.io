import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

const essaySlugs = new Set([
  'education-and-social-experience-do-not-grow-in-sync',
  'ju-bu-zui-you-ji-shu-ren-de-zhong-deng-ji-shu-xian-jing',
  'letter-to-engineering-students',
  'nao-long-wei-ba-yi-ke-bei-zu-zhou-de-e-mo-he-xin-yu-liang-ming-wu-li-xue-jia-de-yun-luo',
]);

export const isEssaysSite = import.meta.env.SITE_VARIANT === 'em';

export function visiblePosts(posts: Post[]) {
  return posts.filter((post) => {
    if (post.data.draft) return false;
    return isEssaysSite
      ? essaySlugs.has(post.data.slug)
      : !essaySlugs.has(post.data.slug);
  });
}

export function sortPosts(posts: Post[]) {
  return [...posts].sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  });
}

export function sortPostsByDate(posts: Post[]) {
  return [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function estimateReadingMinutes(body?: string): number {
  if (!body) return 1;
  const cleaned = body
    .replace(/```[\s\S]*?```/g, ' codeblock ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#>*_`~|-]/g, ' ');

  const cjkChars = (cleaned.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
  const latinWords = cleaned
    .replace(/[\u3400-\u9fff\uf900-\ufaff]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = cjkChars / 450 + latinWords / 220;
  return Math.max(1, Math.round(minutes));
}

export const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'Asia/Shanghai',
});
