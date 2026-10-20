# My LinkedIn Copilot

A private writing workspace that learns how you write, then helps you turn ideas into LinkedIn posts that sound like you, not like generic AI.

**The defining feature: it knows how you write.** Give it 20 to 50 of your real posts, rate the ones that sound most like you, and every generation, rewrite, and review is grounded in those samples and your explicit feedback instead of generic LinkedIn best practices.

## What's inside

| Page | What it does |
| --- | --- |
| **Dashboard** | Answers four questions at a glance: what should I post, what ideas do I have, what am I working on, how does my writing sound. |
| **Generate** ✨ | Topic + optional context, audience, outcome, details, link, tags, rough draft. Pick a tone and a goal. Get three options: **Safe**, **Stronger**, **Experimental**. Shows which past posts influenced it. Checks for repetition first. |
| **Ideas** 💡 | Persistent idea bank with status, category, priority, hook, tags, links, notes, planned date. "Develop this idea" returns 3 angles, 5 hooks, a story structure, themes, and an overlap check. Includes the Smart Idea Generator. |
| **Drafts** | Editor with a 3,000 character counter, **Post Coach** (scores hook, authenticity, clarity, credibility, engagement, self-promotion, length + 2 to 3 recommendations) and **Rewrite** (side-by-side original vs improved, "what changed", and a *Keep my wording ↔ Rewrite more aggressively* slider). |
| **Calendar** | Month view of ideas, drafts, ready and published posts. Drag to schedule. Shows posting themes for the month and nudges you when one topic dominates. |
| **My Voice** | The learned voice profile (tone, formality, storytelling arc, humor, emoji use, formatting, openings, endings, things you do, things to avoid, signature phrases, lessons from your edits) plus measured stats. "Re-analyze my writing" rebuilds it. |
| **Writing Samples** | Add posts one at a time or paste many at once. Rate each one ❤️ exactly like me / 👍 like / 👎 not me. |
| **Settings** | My Context (who you are, what you're building, goals, topics, people, milestones), workspace info, recent generations, sign out. |

Press **`i`** anywhere to capture a quick idea.

## How it learns your voice

- **Writing Memory (retrieval, not prompt stuffing).** Samples and published posts are indexed with BM25. Each generation retrieves only the 2 to 4 most relevant posts and shows them under *Based on these writing samples*.
- **Feedback weighting.** ❤️ posts get 1.6x retrieval weight and are flagged to the model as the strongest signal. 👎 posts are excluded from style examples and used as "not me" counter-examples during analysis.
- **Learning from edits.** When you save a draft, the original AI text is kept alongside your edited version. Repeated patterns (removing em dashes, shortening openings, cutting emojis or hashtags, trimming length) become explicit rules in every prompt, and the full edit pairs are fed into voice re-analysis.
- **Measured stats.** Words per post, sentence length, paragraph length, emojis, em dashes, hashtags, and question endings are computed directly from your samples and passed to the model.
- **Repetition guard.** Before generating, the topic is compared to everything you've posted. If it's too close, you get a warning, the earlier post, and 3 fresh angles.
- **Hard rules.** No influencer clichés, no turning casual into corporate, specifics over generic claims, and it **never invents** accomplishments, numbers, quotes, or relationships. Missing details become `[placeholders]` and follow-up questions.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS
- SQLite via Node's built-in `node:sqlite` (no native deps, one file in `./data`)
- Claude via the official Anthropic TypeScript SDK (`claude-opus-5-5`, adaptive thinking, Zod-validated structured outputs, server-side refusal fallback)
- Single-user password auth with an HMAC-signed, HTTP-only session cookie

## Run it locally

Requires **Node 22.13+**.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000 and unlock with your `APP_PASSWORD`.

| Variable | Required | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | From console.anthropic.com |
| `APP_PASSWORD` | yes | The password for your workspace |
| `SESSION_SECRET` | yes | Long random string, e.g. `openssl rand -hex 32` |
| `DATABASE_PATH` | no | Defaults to `./data/copilot.db` |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-opus-5-5` |

### Getting started in 5 minutes

1. **Settings → My Context.** Fill in who you are, what you're building, and upcoming milestones.
2. **Writing Samples → Paste many.** Paste 20+ posts separated by `---`.
3. Rate the best ones ❤️.
4. **My Voice → Re-analyze my writing.**
5. **Generate**, or hit **Give me ideas** on the dashboard.

## Deploying

The database is a single SQLite file, so deploy somewhere with a persistent disk (Railway, Render, Fly.io, a VPS) and point `DATABASE_PATH` at the mounted volume. Serverless platforms with ephemeral filesystems (e.g. Vercel) would need the data layer in `src/lib/db.ts` swapped for a hosted database.

## Project layout

```
src/
  app/
    (workspace)/      pages: dashboard, generate, ideas, drafts, calendar, voice, samples, settings
    api/              route handlers (auth, samples, ideas, drafts, generate, rewrite, review, voice, context)
    login/
  components/         client UI
  lib/
    ai.ts             prompts + Claude calls (voice analysis, generation, ideas, rewrite, coach)
    memory.ts         Writing Memory: BM25 retrieval, similarity, stats, edit lessons
    store.ts          SQLite data access
    db.ts             connection + schema
    auth.ts           password + signed cookie
  middleware.ts       protects every page and API route
```
