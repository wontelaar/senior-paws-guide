#!/usr/bin/env node
// Convenience script for the weekly review pass: lists every post still
// marked draft: true, so you know what's waiting on a human look before it
// can go live. Usage: node scripts/list-drafts.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = path.resolve(import.meta.dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');

const files = (await fs.readdir(POSTS_DIR).catch(() => [])).filter((f) => f.endsWith('.md'));

if (files.length === 0) {
	console.log('No posts yet.');
	process.exit(0);
}

let unreviewedCount = 0;
let queuedCount = 0;
for (const file of files) {
	const raw = await fs.readFile(path.join(POSTS_DIR, file), 'utf-8');
	const { data } = matter(raw);
	if (data.draft && data.approved) {
		queuedCount++;
		console.log(`QUEUED   ${file}  —  "${data.title}"  (waiting for publish-queue to release it)`);
	} else if (data.draft) {
		unreviewedCount++;
		console.log(`REVIEW   ${file}  —  "${data.title}"`);
	}
}

if (unreviewedCount === 0 && queuedCount === 0) {
	console.log('Nothing waiting — everything has been reviewed and published.');
} else {
	if (unreviewedCount > 0) {
		console.log(
			`\n${unreviewedCount} draft(s) need review. Read each one, then set "approved: true" ` +
				'(keep draft: true) to queue it, or fix/delete it if it has a problem.',
		);
	}
	if (queuedCount > 0) {
		console.log(
			`${queuedCount} draft(s) approved and queued — the daily publish-queue workflow releases ` +
				'one per day automatically.',
		);
	}
}
