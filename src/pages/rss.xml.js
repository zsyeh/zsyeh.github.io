import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../config';
import { sortPosts } from '../lib/posts';

export async function GET(context) {
  const posts = sortPosts(await getCollection('blog'));
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/posts/${post.data.slug}/`,
      categories: [...post.data.categories, ...post.data.tags],
    })),
  });
}
