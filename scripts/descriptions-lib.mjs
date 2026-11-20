// Builds a clean, complete meta description from a topic (used when the
// intro-derived one would have to be cut mid-sentence).
export function topicDescription(topic) {
	const kw = String(topic.targetKeyword || topic.title || '').trim();
	const cap = kw.charAt(0).toUpperCase() + kw.slice(1);
	const n = (topic.products || []).length;
	const lead = n ? `${cap}: ${n} picks` : cap;
	const full = `${lead} compared by features and what each is best for, with Amazon links.`;
	if (full.length <= 160) return full;
	const short = `${lead} compared by features and what each is best for.`;
	return short.length <= 160 ? short : `${lead} compared by features.`;
}
