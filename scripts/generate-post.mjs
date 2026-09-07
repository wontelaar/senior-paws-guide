#!/usr/bin/env node
// Picks the next un-published "ready" topic from data/topics.json, asks
// Claude to draft it, resolves affiliate link placeholders, and writes the
// result to src/content/posts/<topicId>.md as a draft (draft: true) so the
// QA gate + human spot-check happen before it ever appears on the live site.

import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import matter from 'gray-matter';
import { buildPrompt } from './prompt-templates.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const TOPICS_PATH = path.join(ROOT, 'data', 'topics.json');
const POSTS_DIR = path.join(ROOT, 'src', 'content', 'posts');
const SITE_CONFIG_PATH = path.join(ROOT, 'site.config.json');
const MODEL = process.env.CONTENT_MODEL || 'claude-haiku-4-5-20251001';

async function loadJson(p) {
	return JSON.parse(await fs.readFile(p, 'utf-8'));
}

async function alreadyGeneratedTopicIds() {
	let files;
	try {
		files = await fs.readdir(POSTS_DIR);
	} catch {
		return new Set();
	}
	const ids = new Set();
	for (const file of files) {
		if (!file.endsWith('.md')) continue;
		const raw = await fs.readFile(path.join(POSTS_DIR, file), 'utf-8');
		const { data } = matter(raw);
		if (data.topicId) ids.add(data.topicId);
	}
	return ids;
}

function resolveLinkTokens(markdown, products, amazonTag) {
	return markdown.replace(/\{\{LINK:([A-Z0-9]{10}):([^}]+)\}\}/g, (_match, asin, name) => {
		const known = products.find((p) => p.asin === asin);
		const label = (known?.name || name).trim();
		const href = `https://www.amazon.com/dp/${asin}?tag=${amazonTag}`;
		return `<a href="${href}" target="_blank" rel="nofollow sponsored noopener">${label}</a>`;
	});
}

// Real product photos, pulled from each product's actual Amazon listing
// (see data/topics.json imageUrl fields) — not AI-generated, since a
// generated image claiming to depict a specific real product would be
// inaccurate. Inserted right before each product's FIRST link occurrence
// in the body — inside a comparison-table cell, a "### Product Name"
// heading, or an inline prose mention — so photos sit next to the text
// that's talking about that product instead of all being dumped at the
// top. Only the first mention gets a thumbnail; later repeat mentions of
// the same product stay plain text.
//
// Floated (large) thumbnails look good when a paragraph discusses one
// product at a time (narrative-guide articles are usually written this
// way). But qna-style answers sometimes mention 2-3 products in the same
// paragraph, and floating several large images side by side there crams
// the text into a narrow column. So: paragraphs with exactly one
// first-mention get the large floated photo; paragraphs with more than
// one get a smaller, non-floating inline photo instead.
function injectInlineThumbnails(markdown, products) {
	const byAsin = new Map(products.filter((p) => p.imageUrl).map((p) => [p.asin, p]));
	if (byAsin.size === 0) return markdown;

	const linkRe = /<a href="https:\/\/www\.amazon\.com\/dp\/([A-Z0-9]{10})\?[^"]*"[^>]*>/g;
	const seen = new Set();
	const paragraphs = markdown.split(/\r?\n\r?\n/);

	for (const para of paragraphs) {
		const firstMentionsHere = [];
		for (const match of para.matchAll(linkRe)) {
			const asin = match[1];
			if (seen.has(asin) || !byAsin.has(asin)) continue;
			seen.add(asin);
			firstMentionsHere.push(asin);
		}
		if (firstMentionsHere.length === 0) continue;
		const thumbClass = firstMentionsHere.length === 1 ? 'product-inline-thumb' : 'product-inline-thumb-sm';
		for (const asin of firstMentionsHere) {
			const p = byAsin.get(asin);
			markdown = markdown.replace(
				new RegExp(`<a href="https://www\\.amazon\\.com/dp/${asin}\\?[^"]*"[^>]*>`),
				(m) => `<img class="${thumbClass}" src="${p.imageUrl}" alt="${p.name}" loading="lazy" />${m}`,
			);
		}
	}
	return markdown;
}

function escapeHtml(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Boxed "pick card" (image + name + short blurb + CTA button), the
// review-roundup pattern sites like Wirecutter use — image on the left,
// a clear buy button on the right, instead of a bare text link. Used for
// 'comparison'-structured articles, where every product already gets its
// own "### Product Name" heading to anchor the card to.
function buildProductCard(product, amazonTag) {
	const href = `https://www.amazon.com/dp/${product.asin}?tag=${amazonTag}`;
	const notes = product.notes ? `<p class="product-card-notes">${escapeHtml(product.notes)}</p>` : '';
	return `<div class="product-card">
  <img src="${product.imageUrl}" alt="${escapeHtml(product.name)}" loading="lazy" />
  <div class="product-card-body">
    <div class="product-card-name">${escapeHtml(product.name)}</div>
    ${notes}
    <a class="product-card-cta" href="${href}" target="_blank" rel="nofollow sponsored noopener">Check Price on Amazon</a>
  </div>
</div>`;
}

function injectProductCardsAfterHeadings(markdown, products, amazonTag) {
	let result = markdown;
	for (const p of products) {
		if (!p.imageUrl) continue;
		const card = buildProductCard(p, amazonTag);
		const linkPattern = new RegExp(`<a href="https://www\\.amazon\\.com/dp/${p.asin}\\?[^"]*"[^>]*>`);
		const headingPattern = new RegExp(`(^###[^\\n]*${linkPattern.source}[^\\n]*)$`, 'm');
		const headingMatch = result.match(headingPattern);
		if (headingMatch) {
			result = result.replace(headingPattern, `${headingMatch[1]}\n\n${card}`);
			continue;
		}
		// Fallback: the "### heading" is plain text and the link only shows
		// up in the paragraph below it (as written by hand rather than
		// generated) — insert the card right before that paragraph instead.
		const parts = result.split(/\r?\n\r?\n/);
		const idx = parts.findIndex((part) => linkPattern.test(part));
		if (idx === -1) continue;
		parts.splice(idx, 0, card);
		result = parts.join('\n\n');
	}
	return result;
}

// The model is told not to add a leading heading (e.g. "# Article Body")
// before the intro paragraph, but this strips one defensively in case it
// does anyway — the layout renders its own H1, so a stray heading would
// otherwise show up as a duplicate, oddly-placed title in the body.
function stripLeadingHeading(markdown) {
	const lines = markdown.split('\n');
	let i = 0;
	while (i < lines.length && lines[i].trim() === '') i++;
	if (lines[i] && /^#{1,6}\s/.test(lines[i])) {
		lines.splice(i, 1);
		while (lines[i] !== undefined && lines[i].trim() === '') lines.splice(i, 1);
	}
	return lines.join('\n');
}

function deriveDescription(markdown) {
	const firstParagraph = markdown
		.split(/\r?\n\r?\n/)
		.map((s) => s.trim())
		.find((s) => s.length > 40 && !s.startsWith('#') && !s.startsWith('|'));
	const plain = (firstParagraph || '').replace(/\{\{LINK:[^}]+\}\}/g, '').replace(/[*_#]/g, '');
	if (plain.length <= 155) return plain.trim();
	// Cut at the last sentence boundary within the limit; fall back to the
	// last word boundary so we never truncate mid-word or mid-clause.
	const hardCut = plain.slice(0, 155);
	const sentenceEnd = Math.max(hardCut.lastIndexOf('. '), hardCut.lastIndexOf('? '), hardCut.lastIndexOf('! '));
	if (sentenceEnd > 60) return hardCut.slice(0, sentenceEnd + 1).trim();
	const wordEnd = hardCut.lastIndexOf(' ');
	return `${hardCut.slice(0, wordEnd > 0 ? wordEnd : 155).trim()}…`;
}

function countWords(markdown) {
	return markdown
		.replace(/\{\{LINK:[^}]+\}\}/g, ' ')
		.split(/\s+/)
		.filter(Boolean).length;
}

async function main() {
	if (!process.env.ANTHROPIC_API_KEY) {
		console.error(
			'ANTHROPIC_API_KEY is not set. Put it in a local .env file (never commit it) ' +
				'or a GitHub Actions secret before running this script.',
		);
		process.exit(1);
	}

	const [{ topics }, siteConfig] = await Promise.all([
		loadJson(TOPICS_PATH),
		loadJson(SITE_CONFIG_PATH),
	]);

	const done = await alreadyGeneratedTopicIds();
	const next = topics.find((t) => t.status === 'ready' && !done.has(t.id));

	if (!next) {
		console.log(
			'No ready, un-published topics left in data/topics.json. ' +
				'Add more "ready" topics (with real, verified ASINs) before running again.',
		);
		return;
	}

	console.log(`Generating: ${next.title} (${next.id}), structure=${next.structureType}`);

	const client = new Anthropic();
	const prompt = buildPrompt(next);

	const response = await client.messages.create({
		model: MODEL,
		max_tokens: 4096,
		messages: [{ role: 'user', content: prompt }],
	});

	const rawBody = stripLeadingHeading(
		response.content
			.filter((block) => block.type === 'text')
			.map((block) => block.text)
			.join('\n')
			.trim(),
	);

	let body = resolveLinkTokens(rawBody, next.products, siteConfig.amazonAssociateTag);
	body =
		next.structureType === 'comparison'
			? injectProductCardsAfterHeadings(body, next.products, siteConfig.amazonAssociateTag)
			: injectInlineThumbnails(body, next.products);
	const wordCount = countWords(rawBody);

	const frontmatter = {
		title: next.title,
		description: deriveDescription(rawBody),
		pubDate: new Date().toISOString().slice(0, 10),
		structureType: next.structureType,
		topicId: next.id,
		tags: [],
		// Stays a draft until the QA gate (scripts/qa-gate.mjs) and a
		// human spot-check both pass — see the GitHub Actions workflow.
		draft: true,
	};

	await fs.mkdir(POSTS_DIR, { recursive: true });
	const outPath = path.join(POSTS_DIR, `${next.id}.md`);
	await fs.writeFile(outPath, matter.stringify(body, frontmatter), 'utf-8');

	console.log(`Wrote ${outPath} (${wordCount} words, draft: true)`);

	if (process.env.GITHUB_OUTPUT) {
		await fs.appendFile(process.env.GITHUB_OUTPUT, `post_path=${outPath}\ntopic_id=${next.id}\n`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
