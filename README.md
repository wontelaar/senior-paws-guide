# Senior Paws Guide

Automated niche affiliate blog for senior dog care products (Astro static
site + Claude-generated content + Amazon Associates + AdSense). See
[`SETUP.md`](./SETUP.md) for the manual account-setup steps and
[`.claude/plans/crystalline-zooming-moon.md`](.claude/plans/crystalline-zooming-moon.md)
(if present) for the original planning doc.

## How it fits together

- `src/content/posts/*.md` — articles. Every field is defined in
  `src/content.config.ts`. New posts are written with `draft: true` and stay
  invisible on the site until that's removed after a human review.
- `data/topics.json` — the topic backlog. Only `"status": "ready"` topics
  (with real, manually-verified Amazon ASINs) get picked up by the generator.
  Never hand-write a fake ASIN here — see the comment at the top of the file.
- `scripts/generate-post.mjs` — picks the next ready/un-published topic,
  calls the Claude API, resolves `{{LINK:ASIN:Name}}` placeholders into real
  affiliate links, and writes a draft post.
- `scripts/qa-gate.mjs` — automated checks (length, product-link count,
  fabricated-experience phrases, near-duplicate content). Informational, not
  a hard blocker — every draft still needs a human read before publishing.
- `scripts/list-drafts.mjs` — lists posts still waiting on review.
- `.github/workflows/generate-content.yml` — runs the generator on a
  schedule (Mon/Wed/Fri by default) and commits the resulting draft.
- `site.config.json` — the one place that holds the site name, domain, and
  Amazon Associates tag. Update this before going live.

## Commands

| Command | Action |
| :-- | :-- |
| `npm run dev` | Local dev server at `localhost:4321` |
| `npm run build` | Production build to `./dist/` |
| `npm run generate` | Generate one new draft post (needs `ANTHROPIC_API_KEY` in `.env`) |
| `npm run qa` | Run the QA gate against all posts |
| `npm run drafts` | List posts still waiting on review |

## Before this makes any money

Nothing here auto-applies for AdSense/Amazon or auto-buys a domain — those
steps are manual and are covered in [`SETUP.md`](./SETUP.md).
