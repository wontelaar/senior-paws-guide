# Senior Paws Guide

Automated niche affiliate blog for senior dog care products (Astro static
site + Claude-generated content + Amazon Associates + AdSense). See
[`SETUP.md`](./SETUP.md) for the manual account-setup steps and
[`.claude/plans/crystalline-zooming-moon.md`](.claude/plans/crystalline-zooming-moon.md)
(if present) for the original planning doc.

## How it fits together

- `src/content/posts/*.md` — articles. Every field is defined in
  `src/content.config.ts`. New posts are written with `draft: true` and stay
  invisible on the site until reviewed. Review sets `approved: true` (draft
  stays true); the daily publish-queue workflow is what actually flips
  `draft` to false, one post per day — so approving several at once doesn't
  cause a same-day burst of new posts.
- `data/topics.json` — the topic backlog. Only `"status": "ready"` topics
  (with real, manually-verified Amazon ASINs) get picked up by the generator.
  Never hand-write a fake ASIN here — see the comment at the top of the file.
- `scripts/generate-post.mjs` — picks the next ready/un-published topic,
  calls the Claude API, resolves `{{LINK:ASIN:Name}}` placeholders into real
  affiliate links, and writes a draft post.
- `scripts/qa-gate.mjs` — automated checks (length, product-link count,
  fabricated-experience phrases, near-duplicate content). Informational, not
  a hard blocker — every draft still needs a human read before publishing.
- `scripts/list-drafts.mjs` — lists posts awaiting review vs. approved and
  queued for publish.
- `scripts/publish-next.mjs` — releases the single oldest `approved: true`
  draft by flipping its `draft` field to false.
- `.github/workflows/generate-content.yml` — runs the generator on a
  schedule (Mon/Wed/Fri by default) and commits the resulting draft.
- `.github/workflows/publish-queue.yml` — runs `publish-next.mjs` daily and
  commits the release.
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
| `npm run publish-next` | Release the next approved draft (normally runs via the daily workflow) |

## Before this makes any money

Nothing here auto-applies for AdSense/Amazon or auto-buys a domain — those
steps are manual and are covered in [`SETUP.md`](./SETUP.md).
