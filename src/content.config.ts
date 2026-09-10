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
		// Groups posts into homepage sections (e.g. "Mobility & Comfort").
		// Set from the topic's `category` field in data/topics.json.
		category: z.string(),
		// First product's real photo, used as the homepage card thumbnail.
		heroImage: z.string().optional(),
		tags: z.array(z.string()).default([]),
		draft: z.boolean().default(false),
		// Set by a human (or Claude, after reading the post) once it has
		// passed review. Distinct from `draft`: this just marks "cleared to
		// publish" — scripts/publish-next.mjs is what actually flips `draft`
		// to false, one post per day, so approving several at once doesn't
		// cause a same-day burst of new posts.
		approved: z.boolean().default(false),
	}),
});

// Legal pages (about/contact/privacy/disclosure) are plain .astro pages
// under src/pages/, not a content collection — they're few, fixed, and
// benefit from being reviewed as real code rather than generated content.
export const collections = { posts };
