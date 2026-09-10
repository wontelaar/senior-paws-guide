// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';
import siteConfig from './site.config.json' with { type: 'json' };

// https://astro.build/config
export default defineConfig({
	site: siteConfig.siteUrl,
	// pagefind indexes the build output as part of Astro's own build (via the
	// astro:build:done hook), so the search index gets generated regardless of
	// what exact shell command a host (e.g. Cloudflare) runs to build the site.
	integrations: [sitemap(), pagefind()],
});
