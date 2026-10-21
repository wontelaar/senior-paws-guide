// Pings IndexNow (Bing, Yandex, Naver, Seznam, ...) with every URL in the live
// sitemap. The key file lives in /public/<key>.txt so it is served from the
// site root, which is how IndexNow verifies ownership. Run after a deploy:
//   node scripts/indexnow.mjs            (all sitemap URLs)
//   node scripts/indexnow.mjs <url> ...  (only the given URLs)
import fs from 'node:fs';
import siteConfig from '../site.config.json' with { type: 'json' };

const SITE = siteConfig.siteUrl;
const host = new URL(SITE).host;
const keyFile = fs.readdirSync('./public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('No IndexNow key file found in ./public');
const key = keyFile.replace(/\.txt$/, '');

async function sitemapUrls() {
	const index = await (await fetch(`${SITE}/sitemap-index.xml`)).text();
	const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	const urls = [];
	for (const map of maps) {
		const xml = await (await fetch(map)).text();
		urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
	}
	return urls;
}

const urlList = process.argv.length > 2 ? process.argv.slice(2) : await sitemapUrls();
const res = await fetch('https://api.indexnow.org/indexnow', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json; charset=utf-8' },
	body: JSON.stringify({ host, key, keyLocation: `${SITE}/${key}.txt`, urlList }),
});
console.log(`IndexNow: ${urlList.length} URLs -> HTTP ${res.status} ${res.statusText}`);
if (!res.ok) console.log(await res.text());
