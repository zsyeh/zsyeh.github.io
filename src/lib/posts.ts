import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

export function sortPosts(posts: Post[]) {
  return posts.sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  });
}

export const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai',
});
