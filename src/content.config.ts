import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		// Which prompt structure this article was generated with. Rotating
		// these keeps the site from reading as templated/mass-produced.
		structureType: z.enum(['comparison', 'narrative-guide', 'qna']),
		topicId: z.string(),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
	}),
});

// Legal pages (about/contact/privacy/disclosure) are plain .astro pages
// under src/pages/, not a content collection — they're few, fixed, and
// benefit from being reviewed as real code rather than generated content.
export const collections = { posts };
