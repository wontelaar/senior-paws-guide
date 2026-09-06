import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import siteConfig from '../../site.config.json' with { type: 'json' };

export async function GET(context) {
	const posts = await getCollection('posts', ({ data }) => !data.draft);
	return rss({
		title: siteConfig.siteName,
		description: `${siteConfig.siteName} — senior dog care buying guides.`,
		site: context.site,
		items: posts
			.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
			.map((post) => ({
				title: post.data.title,
				description: post.data.description,
				pubDate: post.data.pubDate,
				link: `/posts/${post.id}/`,
			})),
	});
}
