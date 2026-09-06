// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import siteConfig from './site.config.json' with { type: 'json' };

// https://astro.build/config
export default defineConfig({
	site: siteConfig.siteUrl,
	integrations: [sitemap()],
});
