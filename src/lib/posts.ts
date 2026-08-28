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
  return posts.filter((post) => isEssaysSite
    ? essaySlugs.has(post.data.slug)
    : !essaySlugs.has(post.data.slug));
}

export function sortPosts(posts: Post[]) {
  return posts.sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  });
}

export const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai',
});
