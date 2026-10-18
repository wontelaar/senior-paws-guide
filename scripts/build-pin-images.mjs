// Builds 1000x1500 Pinterest pin images (hero photo + headline overlay) from
// data/pin-creatives.json into ./pin-images/<topicId>.jpg.
import fs from 'node:fs';
import sharp from 'sharp';
import matter from 'gray-matter';

const creatives = JSON.parse(fs.readFileSync('./data/pin-creatives.json', 'utf-8'));
const only = process.argv.slice(2);
const W = 1000;
const H = 1500;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function wrap(text, maxChars) {
	const words = text.split(' ');
	const lines = [];
	let cur = '';
	for (const w of words) {
		if ((cur + ' ' + w).trim().length > maxChars && cur) {
			lines.push(cur);
			cur = w;
		} else cur = (cur + ' ' + w).trim();
	}
	if (cur) lines.push(cur);
	return lines;
}

for (const c of creatives) {
	if (only.length && !only.includes(c.topicId)) continue;
	const post = matter(fs.readFileSync(`./src/content/posts/${c.topicId}.md`, 'utf-8')).data;
	const url = new URL(post.heroImage);
	// Optional c.position ("left", "right", "top", ...) picks the crop anchor when
	// the centre crop cuts out the subject; fetch the uncropped photo for that case.
	if (c.position) {
		url.searchParams.set('w', '1500');
	} else {
		url.searchParams.set('w', String(W));
		url.searchParams.set('h', String(H));
		url.searchParams.set('fit', 'crop');
	}
	const photo = Buffer.from(await (await fetch(url)).arrayBuffer());

	const lines = wrap(c.headline, 19);
	const fs1 = 86;
	const lh = 98;
	const subY = 1368;
	const startY = subY - 78 - (lines.length - 1) * lh;
	const tspans = lines
		.map((l, i) => `<text x="70" y="${startY + i * lh}" font-size="${fs1}" font-weight="700" fill="#ffffff" font-family="Arial, Helvetica, sans-serif">${esc(l)}</text>`)
		.join('');
	const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.38" stop-color="#1c2a2e" stop-opacity="0"/><stop offset="1" stop-color="#1c2a2e" stop-opacity="0.92"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
${tspans}
<text x="70" y="${subY}" font-size="44" fill="#f2d9b3" font-family="Arial, Helvetica, sans-serif">${esc(c.sub)}</text>
<text x="70" y="1446" font-size="34" font-weight="700" fill="#ffffff" fill-opacity="0.85" font-family="Arial, Helvetica, sans-serif">seniorpawsguide.net</text>
</svg>`;
	const out = `./pin-images/${c.topicId}.jpg`;
	await sharp(photo).resize(W, H, { fit: 'cover', position: c.position || 'centre' }).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 88 }).toFile(out);
	console.log('wrote', out);
}
