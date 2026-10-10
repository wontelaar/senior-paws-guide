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
- Do not make comparisons or claims the facts below don't state. In particular:
  never say one product is cheaper, more expensive, more durable, longer-
  lasting, or better-engineered than another; never give timelines for
  results or how long anything lasts or stays cool; never give dosing,
  amounts, or usage schedules; never use review counts as proof of quality
  or durability (so never call a product "established", "long-standing",
  "proven", or say it has a "track record" or "long review history" — just
  state the review count if relevant); and never invent materials, features, certifications, or
  brand history. Do not claim a product lacks, excludes, or doesn't include
  an ingredient, feature, or size basis unless the facts say so; a detail
  missing from the facts is unknown, not absent, so say "check the listing"
  instead. Do not state that an ingredient "can interact" with drugs or has
  specific health effects, and do not suggest ways to use a product that the
  facts don't mention; say "ask your vet whether any ingredient could
  interact" or "follow the listing's instructions". Also don't say what a
  feature is "meant for", and don't make performance comparisons between
  designs (smooth vs textured, one closure vs another) unless the facts
  state them. If the facts don't say it,
  leave it out or tell the reader to check the listing or ask their vet.
- Never refer to "the facts", "the information provided", "available
  information", or "the manufacturer information available" in the article
  itself. The reader has never seen these notes. When you lack a detail,
  simply leave it out, or say "check the listing" or "ask your vet".
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
- Tone: this site earns its income when readers buy, so write as a confident,
  helpful guide who is on the reader's side and helps them pick the right
  product. NEVER write anything that talks the reader out of buying or makes
  a product sound like a poor choice. Specifically forbidden: listing
  downsides, drawbacks, "the catch", "however/but" sentences that undercut a
  product, "may not suit / may not be for you", "you don't need this",
  "skip it", "not worth it", "save your money", "you can get by without",
  "don't rely on this guide", "decide for yourself", "if you'd rather not
  buy...", or suggesting the reader use a cheaper homemade alternative
  instead of buying. Do not hedge or apologize for recommending products.
  Where a product fits a narrower situation, frame that as a positive
  ("a great pick for X", "ideal if your dog Y") rather than a limitation.
  Keep any health/safety mention to one short, calm sentence (for example
  "check with your vet if your dog has a health condition") only where it
  genuinely matters, never as repeated disclaimers.
- Vary your sentence patterns so the article does not read as formulaic or
  AI-generated: do not reuse the same opening phrase or sentence frame
  across product write-ups.
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
	return `\nContent caution (this is only about not making medical/safety claims we can't support — follow it in the lightest possible way: avoid the claims it forbids, and cover any vet/safety point in ONE short, calm sentence. Do not let it make the article hedge, warn repeatedly, or discourage buying): ${topic.caution}\n`;
}

export function buildPrompt(topic) {
	const products = productList(topic.products);
	const context = backgroundContext(topic) + cautionNote(topic);

	if (topic.structureType === 'comparison') {
		return `Write a buying-guide article titled "${topic.title}" targeting the search intent "${topic.targetKeyword}".

Structure this one as a comparison/roundup:
1. A short intro (2-3 sentences) framing the real problem this solves for someone with an aging or arthritic dog.
2. A markdown comparison table summarizing the products below (columns: Product, Best For, Key Feature, Notes).
3. One subsection per product (### heading with the product name) with a 2-4 sentence mini-review covering what it is, what makes it stand out, and who it's best suited for — keep it positive and persuasive, and end on why it's a good fit (no downsides or caveats).
4. A "How to Choose" section (bulleted) covering the real factors a buyer should weigh for THIS product category (e.g. size/weight of dog, format, budget, plus category-specific ones such as thickness or washability only when they genuinely apply). Never include a bullet just to say a factor doesn't apply.
5. A short FAQ section (2-3 Q&As) addressing common follow-up questions about this product category.

Products to cover (use ONLY these facts, do not add specs not listed here):
${products}
${context}${SHARED_RULES}`;
	}

	if (topic.structureType === 'narrative-guide') {
		return `Write an informational guide article titled "${topic.title}" targeting the search intent "${topic.targetKeyword}".

Structure this one as a narrative/explainer guide, NOT a table-driven roundup:
1. Open by explaining the underlying problem in plain terms (why this matters for senior/arthritic dogs specifically).
2. Walk through the 2-3 main approaches or categories a reader should understand before buying anything (explain what each one does well and who it suits in prose, not a table — no downsides).
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
2. Cover 5-7 realistic questions (e.g. "What size/height should I choose?", "What should I look for when picking one?", "Which option suits my dog best?"). Every answer should help the reader pick and buy with confidence — never questions or answers that suggest they may not need the product or could do without it.
3. Naturally introduce the specific products below as answers/examples within the relevant Q&A, using the placeholder token described below — don't force all of them into one place.
4. End with a brief closing paragraph, no separate "conclusion" heading needed.

Products to reference (use ONLY these facts, do not add specs not listed here):
${products}
${context}${SHARED_RULES}`;
}
