#!/usr/bin/env node
// Releases at most one approved draft per run. Intended to run on a daily
// schedule (see .github/workflows/publish-queue.yml) so that reviewing
// several drafts in one sitting doesn't turn into a same-day burst of new
// posts on the live site — approval and publish timing are deliberately
// decoupled.

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = path.resolve(import.meta.dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');

async function main() {
	const files = (await fs.readdir(POSTS_DIR).catch(() => [])).filter((f) => f.endsWith('.md'));

	const candidates = [];
	for (const file of files) {
		const filePath = path.join(POSTS_DIR, file);
		const raw = await fs.readFile(filePath, 'utf-8');
		const parsed = matter(raw);
		if (parsed.data.draft === true && parsed.data.approved === true) {
			candidates.push({ file, filePath, raw, parsed });
		}
	}

	if (candidates.length === 0) {
		console.log('No approved drafts waiting to be published.');
		return;
	}

	// Oldest pubDate first, so topics roughly release in the order they were
	// generated rather than reshuffling.
	candidates.sort(
		(a, b) => new Date(a.parsed.data.pubDate).valueOf() - new Date(b.parsed.data.pubDate).valueOf(),
	);
	const next = candidates[0];

	const updated = matter.stringify(next.parsed.content, {
		...next.parsed.data,
		draft: false,
	});
	await fs.writeFile(next.filePath, updated, 'utf-8');

	console.log(`Published: ${next.file} (${candidates.length - 1} approved draft(s) still queued)`);

	if (process.env.GITHUB_OUTPUT) {
		await fs.appendFile(process.env.GITHUB_OUTPUT, `published_file=${next.filePath}\n`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
