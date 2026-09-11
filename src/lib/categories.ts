import { getCollection } from 'astro:content';

// Fixed display order for known categories; anything else (a category typo,
// or a brand-new one not added here yet) still shows up, just after these.
const CATEGORY_ORDER = ['Mobility & Comfort', 'Feeding & Medication', 'Grooming & Recovery'];

function sortCategories(categories: string[]): string[] {
	return [...categories].sort((a, b) => {
		const ai = CATEGORY_ORDER.indexOf(a);
		const bi = CATEGORY_ORDER.indexOf(b);
		if (ai === -1 && bi === -1) return a.localeCompare(b);
		if (ai === -1) return 1;
		if (bi === -1) return -1;
		return ai - bi;
	});
}

export async function getOrderedCategories(): Promise<string[]> {
	const posts = await getCollection('posts', ({ data }) => !data.draft);
	return sortCategories([...new Set(posts.map((p) => p.data.category))]);
}
