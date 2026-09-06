// Three structurally different prompt shapes for the same underlying job
// (write an accurate, useful product-comparison article). Rotating which
// shape gets used is a deliberate anti-pattern-detection measure: a site
// where every article follows the exact same paragraph order is one of the
// signals Google's "scaled content abuse" policy targets, and it's also
// just a tell-tale sign of low-effort spun content to a human reviewer.

const SHARED_RULES = `
Hard rules — do not break these:
- Do not invent personal anecdotes, first-hand experience, or claims like
  "I have owned this" / "in my experience" / "as a veterinarian". You are
  writing as a research-based buying guide, not a first-person testimonial.
  Write in a knowledgeable third-person/informational voice instead.
- Do not fabricate product specs. Only use the facts given to you below for
  each product. If you don't have a detail, don't invent one — describe
  what you do know instead.
- Do not include an affiliate disclosure sentence yourself — the page
  template already renders one above the article body.
- Whenever you mention a specific product from the list below, insert the
  placeholder token immediately after its name in this exact form:
  {{LINK:ASIN:Product Name}} — for example: EHEYCIGA Orthopedic Extra-Large
  Dog Bed {{LINK:B0BDLGZCTY:EHEYCIGA Orthopedic Extra-Large Dog Bed}}.
  Do not write markdown links or raw URLs yourself; only use this token.
- Output GitHub-flavored Markdown for the article body only — no frontmatter,
  no top-level title heading (the page template renders the H1 separately).
  The very first line of your output must be the first sentence of the
  introduction paragraph itself — not a "#" heading, not a label like
  "Article Body" or "Introduction", nothing before the actual prose.
- Target length: 1100-1600 words in the body.
- No keyword stuffing: use the target keyword and close variants naturally,
  not repeated mechanically.
`;

function productList(products) {
	return products
		.map((p) => `- ${p.name} (ASIN: ${p.asin}) — known facts: ${p.notes}`)
		.join('\n');
}

function backgroundContext(topic) {
	if (!topic.ownerInsight) return '';
	return `\nBackground context (real, verified — use this to make the article genuinely well-informed, but rephrase in third person; do not write it as a first-person anecdote or invent a specific dog/owner):\n${topic.ownerInsight}\n`;
}

function cautionNote(topic) {
	if (!topic.caution) return '';
	return `\nContent caution: ${topic.caution}\n`;
}

export function buildPrompt(topic) {
	const products = productList(topic.products);
	const context = backgroundContext(topic) + cautionNote(topic);

	if (topic.structureType === 'comparison') {
		return `Write a buying-guide article titled "${topic.title}" targeting the search intent "${topic.targetKeyword}".

Structure this one as a comparison/roundup:
1. A short intro (2-3 sentences) framing the real problem this solves for someone with an aging or arthritic dog.
2. A markdown comparison table summarizing the products below (columns: Product, Best For, Key Feature, Notes).
3. One subsection per product (### heading with the product name) with a 2-4 sentence mini-review covering what it is, who it's best suited for, and one realistic caveat or trade-off — do not only list positives.
4. A "How to Choose" section (bulleted) covering the real factors a buyer should weigh (size/weight of dog, thickness, washability, budget).
5. A short FAQ section (2-3 Q&As) addressing common follow-up questions about this product category.

Products to cover (use ONLY these facts, do not add specs not listed here):
${products}
${context}${SHARED_RULES}`;
	}

	if (topic.structureType === 'narrative-guide') {
		return `Write an informational guide article titled "${topic.title}" targeting the search intent "${topic.targetKeyword}".

Structure this one as a narrative/explainer guide, NOT a table-driven roundup:
1. Open by explaining the underlying problem in plain terms (why this matters for senior/arthritic dogs specifically).
2. Walk through the 2-3 main approaches or categories a reader should understand before buying anything (explain the trade-offs in prose, not a table).
3. Weave in the specific products below as concrete examples within the relevant section of prose — introduce each by name with a sentence or two on what makes it fit that approach, using the placeholder token described below.
4. Close with a short practical checklist (bulleted) of what to measure or check before buying.

Products to reference (use ONLY these facts, do not add specs not listed here):
${products}
${context}${SHARED_RULES}`;
	}

	// qna
	return `Write an FAQ-style article titled "${topic.title}" targeting the search intent "${topic.targetKeyword}".

Structure this one as a series of real questions a buyer would actually ask, each as an ### heading followed by a thorough answer paragraph:
1. Start with 1-2 sentences of framing (no separate intro heading needed).
2. Cover 5-7 realistic questions (e.g. "Do I really need this or can I use X?", "What size/height do I need?", "Is it worth the price difference between budget and premium options?").
3. Naturally introduce the specific products below as answers/examples within the relevant Q&A, using the placeholder token described below — don't force all of them into one place.
4. End with a brief closing paragraph, no separate "conclusion" heading needed.

Products to reference (use ONLY these facts, do not add specs not listed here):
${products}
${context}${SHARED_RULES}`;
}
