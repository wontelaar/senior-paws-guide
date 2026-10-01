// One-off generator for the Pinterest launch plan: reads every published post
// and produces a CSV of (board, pin title, pin description, image, dest URL)
// for manual pin creation now, and as the data source for a future
// Pinterest-API automation script once the account/API access exists.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const SITE = 'https://seniorpawsguide.net';
const POSTS_DIR = './src/content/posts';

const BOARD_BY_CATEGORY = {
	'Mobility & Comfort': 'Mobility & Comfort for Senior Dogs',
	'Feeding & Medication': 'Feeding & Medication for Senior Dogs',
	'Grooming & Recovery': 'Grooming & Recovery for Senior Dogs',
};

// Rotate a few soft CTAs so 42 descriptions don't all end identically.
const CTAS = [
	'Full picks and buying tips in the guide.',
	"See all the options we'd actually recommend.",
	'Full comparison and what to look for, in the guide.',
	'Real picks for real senior dogs, in the guide.',
	'Details, pros/cons, and our picks in the full guide.',
];

function csvEscape(s) {
	const needsQuotes = /[",\n]/.test(s);
	const escaped = s.replace(/"/g, '""');
	return needsQuotes ? `"${escaped}"` : escaped;
}

const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
const rows = [['board', 'pin_title', 'pin_description', 'image_url', 'destination_url', 'topic_id']];

// Pinterest descriptions allow ~500 chars, far more than the 155-char SEO
// meta description -- pull the real first paragraph from the post body
// (untruncated) instead of reusing the meta description, which is cut at a
// word boundary with a trailing "…" that reads badly once a CTA is appended.
function firstParagraph(markdown) {
	const para = markdown
		.split(/\r?\n\r?\n/)
		.map((s) => s.trim())
		.find((s) => s.length > 40 && !s.startsWith('#') && !s.startsWith('|'));
	return (para || '').replace(/<[^>]+>/g, '').replace(/[*_]/g, '').trim();
}

const PIN_DESC_LIMIT = 420; // leave room for the CTA within Pinterest's ~500-char cap

let i = 0;
for (const f of files) {
	const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf-8');
	const { content, data } = matter(raw);
	if (data.draft) continue;

	const board = BOARD_BY_CATEGORY[data.category];
	if (!board) {
		console.warn(`No board mapping for category "${data.category}" (${data.topicId})`);
		continue;
	}

	const pinTitle = data.title.length > 100 ? data.title.slice(0, 97) + '...' : data.title;
	const cta = CTAS[i % CTAS.length];
	let body = firstParagraph(content);
	if (body.length > PIN_DESC_LIMIT) {
		const cut = body.slice(0, PIN_DESC_LIMIT);
		const sentenceEnd = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
		body = sentenceEnd > 100 ? cut.slice(0, sentenceEnd + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '.';
	}
	const pinDescription = `${body} ${cta}`.trim();
	const destUrl = `${SITE}/posts/${data.topicId}/`;

	rows.push([board, pinTitle, pinDescription, data.heroImage || '', destUrl, data.topicId]);
	i++;
}

const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
fs.writeFileSync('./data/pinterest-launch-plan.csv', csv + '\n', 'utf-8');
console.log(`Wrote ${rows.length - 1} pins to data/pinterest-launch-plan.csv`);

// Quick per-board tally for a sanity check.
const tally = {};
for (const r of rows.slice(1)) tally[r[0]] = (tally[r[0]] || 0) + 1;
console.log(tally);
