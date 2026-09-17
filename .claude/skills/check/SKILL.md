---
name: check
description: 링크검사랑 초안 점검해줘 — pull latest, review new drafts, verify Amazon links, approve and push. Use when the user asks to check/review drafts and links for the Senior Paws Guide project.
---

Do the recurring Senior Paws Guide review routine:

1. `git pull --ff-only` in the project root to fetch any new commits/drafts.
2. Enumerate every post in `src/content/posts/` and find any with `draft: true` and no `approved` field set — these are new, unreviewed drafts.
3. For each new draft:
   - Read the full content and check it against the established rubric: no fabricated first-person experience, accurate product claims, appropriate health/safety hedging, no leaked internal jargon (e.g. "ASIN") or unresolved template placeholders (e.g. `{{LINK:...}}`), no missing product cards.
   - Run `npm run qa -- <file>` (the QA gate script) and confirm it passes.
4. Extract every Amazon ASIN referenced in those new drafts (`grep -oE 'amazon\.com/dp/[A-Z0-9]{10}'`).
5. Verify each ASIN is live and purchasable using the Browser tool, **with the delivery address set to a US ZIP (10001, New York)** — a fresh browser session defaults to Korea and gives false "unavailable" results for some categories. Use the fast `javascript_tool` pattern (one `JSON.stringify({title, price, addToCart, location})` call per product page) rather than screenshots.
6. If anything fails QA, has a broken/dead link, or has a content issue, fix it (or flag it clearly) before approving. If a bug traces back to the generation script rather than just this one draft, fix the script too (not just the data) so it can't recur silently.
7. Set `approved: true` on every draft that passes.
8. Commit with a descriptive message and the required `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` line, then push.
9. Also check `data/topics.json` against existing posts' `topicId`s to see how many ready-but-undrafted topics remain in the backlog — if it's running low (a few days' worth or less at the current publish cadence), flag this to the user explicitly rather than waiting to be asked.
10. Report a clear, concise summary back to the user in Korean: what was reviewed, what passed, anything fixed, and the backlog status.
