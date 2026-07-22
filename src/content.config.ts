import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    haloId: z.string().optional(),
    githubIssue: z.number().int().positive().optional(),
    author: z.string().default('eH'),
    source: z.enum(['Halo', 'GitHub']).default('Halo'),
    title: z.string(),
    slug: z.string(),
    description: z.string().default(''),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    cover: z.string().optional(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    pinned: z.boolean().default(false),
    haloUrl: z.url().optional(),
  }),
});

export const collections = { blog };
