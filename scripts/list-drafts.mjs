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

let draftCount = 0;
for (const file of files) {
	const raw = await fs.readFile(path.join(POSTS_DIR, file), 'utf-8');
	const { data } = matter(raw);
	if (data.draft) {
		draftCount++;
		console.log(`DRAFT  ${file}  —  "${data.title}"`);
	}
}

if (draftCount === 0) {
	console.log('No drafts waiting — everything published has been reviewed.');
} else {
	console.log(
		`\n${draftCount} draft(s) waiting for review. Open the file, read it, then delete the ` +
			'"draft: true" line (or set it to false) to publish.',
	);
}
