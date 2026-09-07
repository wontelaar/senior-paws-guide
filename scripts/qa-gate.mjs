#!/usr/bin/env node
// Automated quality gate for a generated draft. This does NOT replace human
// review — it's a cheap first filter that catches the specific failure
// modes that are believed to have caused a past AdSense rejection: thin
// content, formulaic repetition, and fabricated first-person "expertise".
// Exit code 0 = passed all checks, 1 = at least one check failed.

import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = path.resolve(import.meta.dirname, '..');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');

const MIN_WORD_COUNT = 900;
const MIN_PRODUCT_LINKS = 2;
const SIMILARITY_THRESHOLD = 0.5;

// Phrases that would fabricate first-hand experience or credentials we
// don't have — this is the exact pattern the plan identified as the likely
// cause of the earlier "low value content" rejection.
//
// Note: bare "my dog" / "our dog" is deliberately NOT banned here — in
// qna-structured articles the model writes FAQ headings from the reader's
// own voice ("Can my dog eat fine from the floor?"), which is normal,
// expected FAQ phrasing, not a fabricated authorial claim. Only patterns
// that specifically assert first-hand author experience/credentials count.
const BANNED_PATTERNS = [
	/\bin my experience\b/i,
	/\bi(?:'ve| have) (?:owned|used|tried)\b/i,
	/\bas a (?:veterinarian|vet|dog trainer)\b/i,
	/\bmy own (?:dog|senior dog|puppy)\b/i,
	/\bour own (?:dog|senior dog|puppy)\b/i,
	/\bi personally\b/i,
	/\bwe personally\b/i,
];

// A duplicated disclosure would stack on top of the one the layout already
// renders (src/components/AffiliateDisclosure.astro).
const DISCLOSURE_DUPE_PATTERN = /affiliate link|earn a commission|as an amazon associate/i;

function wordCount(body) {
	return body
		.replace(/<[^>]+>/g, ' ')
		.split(/\s+/)
		.filter(Boolean).length;
}

function countProductLinks(body) {
	return (body.match(/<a href="https:\/\/www\.amazon\.com\/dp\//g) || []).length;
}

function normalizedWordSet(body) {
	const words = body
		.toLowerCase()
		.replace(/<[^>]+>/g, ' ')
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter((w) => w.length > 3); // drop short stopword-ish tokens
	return new Set(words);
}

function jaccardSimilarity(a, b) {
	let intersection = 0;
	for (const w of a) if (b.has(w)) intersection++;
	const union = a.size + b.size - intersection;
	return union === 0 ? 0 : intersection / union;
}

async function loadAllPosts() {
	let files = [];
	try {
		files = await fs.readdir(POSTS_DIR);
	} catch {
		return [];
	}
	const posts = [];
	for (const file of files) {
		if (!file.endsWith('.md')) continue;
		const raw = await fs.readFile(path.join(POSTS_DIR, file), 'utf-8');
		const parsed = matter(raw);
		posts.push({ file, data: parsed.data, body: parsed.content });
	}
	return posts;
}

async function checkPost(targetFile) {
	const failures = [];
	const raw = await fs.readFile(targetFile, 'utf-8');
	const { data, content } = matter(raw);

	const wc = wordCount(content);
	if (wc < MIN_WORD_COUNT) {
		failures.push(`Word count ${wc} is below the ${MIN_WORD_COUNT} minimum.`);
	}

	const linkCount = countProductLinks(content);
	if (linkCount < MIN_PRODUCT_LINKS) {
		failures.push(`Only ${linkCount} product link(s) found, need at least ${MIN_PRODUCT_LINKS}.`);
	}

	for (const pattern of BANNED_PATTERNS) {
		if (pattern.test(content)) {
			failures.push(`Contains a fabricated-experience phrase matching ${pattern}.`);
		}
	}

	if (DISCLOSURE_DUPE_PATTERN.test(content)) {
		failures.push(
			'Body appears to include its own affiliate disclosure — the layout already renders one; remove the duplicate.',
		);
	}

	const allPosts = await loadAllPosts();
	const targetSet = normalizedWordSet(content);
	for (const other of allPosts) {
		if (path.resolve(POSTS_DIR, other.file) === path.resolve(targetFile)) continue;
		if (other.data.topicId === data.topicId) continue;
		const sim = jaccardSimilarity(targetSet, normalizedWordSet(other.body));
		if (sim > SIMILARITY_THRESHOLD) {
			failures.push(
				`Too similar (${(sim * 100).toFixed(0)}%) to existing post "${other.file}" — looks templated/duplicated.`,
			);
		}
	}

	return { file: targetFile, wordCount: wc, linkCount, failures };
}

async function main() {
	const targetArg = process.argv[2];
	const targets = targetArg
		? [path.resolve(targetArg)]
		: (await fs.readdir(POSTS_DIR).catch(() => []))
				.filter((f) => f.endsWith('.md'))
				.map((f) => path.join(POSTS_DIR, f));

	if (targets.length === 0) {
		console.log('No posts found to check.');
		return;
	}

	let anyFailed = false;
	for (const target of targets) {
		const result = await checkPost(target);
		const label = path.basename(result.file);
		if (result.failures.length === 0) {
			console.log(`PASS  ${label}  (${result.wordCount} words, ${result.linkCount} product links)`);
		} else {
			anyFailed = true;
			console.log(`FAIL  ${label}`);
			for (const f of result.failures) console.log(`      - ${f}`);
		}
	}

	if (anyFailed) process.exit(1);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
