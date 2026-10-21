// Generates the "fit/choose guide" section for a topic and verifies its math.
//
// The model writes the guide (measurement steps + lookup tables) using ONLY the
// product facts in data/topics.json. Because models are unreliable at
// arithmetic, it must also return every computed number as an expression; this
// module re-computes each expression in code and rejects the guide when a
// stated value does not match or does not appear in the text. A rejected guide
// is simply not inserted (the post is still generated, and the QA gate warns).
import fs from 'node:fs';
import path from 'node:path';

const GUIDES_DIR = path.resolve(import.meta.dirname, '..', 'data', 'fit-guides');

// Few-shot exemplars: hand-checked guides whose structure we want to copy.
const EXEMPLAR_IDS = ['dog-ramps-for-car-guide', 'dog-stairs-for-bed-guide'];

export function loadExemplars() {
	return EXEMPLAR_IDS.map((id) => {
		const p = path.join(GUIDES_DIR, `${id}.md`);
		return fs.existsSync(p) ? `--- EXAMPLE (${id}) ---\n${fs.readFileSync(p, 'utf-8').trim()}` : '';
	})
		.filter(Boolean)
		.join('\n\n');
}

const SAFE_EXPR = /^[0-9+\-*/().,\sA-Za-z_]+$/;
const ALLOWED_IDENT = new Set(['Math', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'PI', 'ceil', 'floor', 'round', 'sqrt', 'min', 'max', 'abs']);

function evaluate(expr) {
	if (!SAFE_EXPR.test(expr)) throw new Error(`unsafe expression: ${expr}`);
	for (const id of expr.match(/[A-Za-z_]+/g) || []) {
		if (!ALLOWED_IDENT.has(id)) throw new Error(`identifier not allowed in expression: ${id}`);
	}
	// eslint-disable-next-line no-new-func
	const value = new Function(`"use strict"; return (${expr});`)();
	if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`non-numeric result: ${expr}`);
	return value;
}

// Pulls the trailing ```json {...}``` block off the model's reply.
export function splitGuideAndCalcs(text) {
	const m = text.match(/```json\s*([\s\S]*?)```\s*$/);
	if (!m) throw new Error('fit guide reply has no trailing ```json calculations block');
	const markdown = text.slice(0, m.index).trim();
	const parsed = JSON.parse(m[1]);
	return { markdown, calculations: parsed.calculations ?? [] };
}

export function verifyCalculations(markdown, calculations) {
	const problems = [];
	for (const c of calculations) {
		try {
			const decimals = Number.isInteger(c.decimals) ? c.decimals : 1;
			const computed = Number(evaluate(c.expr).toFixed(decimals));
			if (Math.abs(computed - Number(c.value)) > 1e-9) {
				problems.push(`${c.expr} = ${computed}, but the guide states ${c.value}`);
				continue;
			}
			const shown = computed.toFixed(decimals);
			const shownTrimmed = String(computed);
			if (!markdown.includes(shown) && !markdown.includes(shownTrimmed)) {
				problems.push(`value ${shown} (from ${c.expr}) does not appear in the guide text`);
			}
		} catch (err) {
			problems.push(`${c.expr}: ${err.message}`);
		}
	}
	return problems;
}

export function validateGuideShape(markdown) {
	const problems = [];
	if (!/^## /m.test(markdown)) problems.push('guide has no "## " heading');
	if ((markdown.match(/^\|.*\|\s*$/gm) || []).length < 4) problems.push('guide has fewer than one real table');
	const banned = /\b(established|proven|track record|cheaper|cheapest|more durable|longer-lasting|downside|drawback|however|skip it|not worth|don't need|save your money|treats?|cures?|relieves?|prevents?|heals?|clinically|guarantee[sd]?)\b/i;
	const hit = markdown.match(banned);
	if (hit) problems.push(`banned wording: "${hit[0]}"`);
	if (/\b20(2[4-9])\b/.test(markdown)) problems.push('guide mentions a year');
	return problems;
}

export function writeGuide(topicId, markdown) {
	fs.mkdirSync(GUIDES_DIR, { recursive: true });
	fs.writeFileSync(path.join(GUIDES_DIR, `${topicId}.md`), markdown.trim() + '\n', 'utf-8');
}
