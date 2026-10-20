import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { computeStats, editLessons, editPairs, type MemoryDoc } from "./memory";
import { getContext, getVoiceProfile, listDrafts, listIdeas, listSamples } from "./store";
import type { PersonalContext, VoiceProfile, VoiceStats } from "./types";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
// Server-side refusal fallback ("default" routing) is supported on these models.
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

export class AIError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

let client: Anthropic | null = null;
function anthropic() {
  if (!client) client = new Anthropic();
  return client;
}

async function structured<S extends z.ZodType>(
  schema: S,
  system: string,
  prompt: string,
  effort: "low" | "medium" | "high" = "medium",
): Promise<z.infer<S>> {
  const useFallback = FALLBACK_MODELS.has(MODEL);
  let res;
  try {
    res = await anthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort, format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: prompt }],
      ...(useFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new AIError("Anthropic API key is missing or invalid. Set ANTHROPIC_API_KEY.", 500);
    if (err instanceof Anthropic.RateLimitError) throw new AIError("Rate limited by the Anthropic API. Try again in a moment.", 429);
    if (err instanceof Anthropic.APIError) throw new AIError(`Anthropic API error: ${err.message}`, 502);
    if (err instanceof Error && /api key|apiKey|authentication/i.test(err.message))
      throw new AIError("Anthropic API key is missing. Set ANTHROPIC_API_KEY in your environment.", 500);
    throw err;
  }
  if (res.stop_reason === "refusal") throw new AIError("The model declined this request. Try rephrasing it.", 422);
  if (res.stop_reason === "max_tokens") throw new AIError("The response was cut off. Try a shorter input.", 502);
  if (!res.parsed_output) throw new AIError("The model returned an unexpected format. Try again.", 502);
  return res.parsed_output as z.infer<S>;
}

// ---------- Shared voice brief ----------

const BANNED = [
  "I'm thrilled to announce",
  "Exciting times ahead",
  "This journey has taught me",
  "I'm humbled and honored",
  "Here's to many more",
  "Let that sink in",
  "The future is bright",
  "game-changer",
  "delve",
  "in today's fast-paced world",
];

const RULES = `Rules you must follow:
1. Sound like the author. Never produce generic "LinkedIn influencer" writing. Avoid phrases like ${BANNED.map((b) => `"${b}"`).join(", ")} unless the author's own samples use them.
2. Preserve personality. Do not turn casual writing into corporate writing. "And somehow, 1,500+ people showed up..." must not become "This initiative successfully attracted over 1,500 participants."
3. Specificity beats generic advice. Prefer concrete moments, names, and numbers that the author supplied.
4. Never invent accomplishments, numbers, experiences, quotes, people, or relationships. When a detail is missing, write a placeholder in square brackets like [number of attendees] and list it.
5. Do not over-optimize for engagement. No clickbait, no "agree?" bait, no fake suspense.
6. The author's real writing samples and explicit feedback outrank generic LinkedIn best practices.
7. Avoid em dashes unless the author's samples clearly use them.`;

function contextBlock(c: PersonalContext) {
  const lines = [
    ["Who I am", c.whoIAm],
    ["What I'm building", c.building],
    ["What I'm working toward", c.goals],
    ["Topics I care about", c.topics],
    ["People/organizations I work with", c.people],
    ["Current milestones", c.milestones],
  ].filter(([, v]) => v.trim());
  return lines.length ? lines.map(([k, v]) => `${k}: ${v}`).join("\n") : "(No personal context saved yet.)";
}

function profileBlock(p: VoiceProfile | null, stats: VoiceStats) {
  const measured = `Measured from ${stats.sampleCount} samples: ~${stats.avgWords} words per post, ~${stats.avgSentenceWords} words per sentence, ~${stats.avgParagraphLines} lines per paragraph, ${stats.emojiPerPost} emojis per post, ${stats.emDashPerPost} em dashes per post, ${stats.hashtagPerPost} hashtags per post, ${Math.round(stats.questionEndingRate * 100)}% of posts end with a question.`;
  if (!p) return `No voice profile analyzed yet.\n${measured}`;
  return `Voice profile:
Summary: ${p.summary}
Tone: ${p.tone}
Formality: ${p.formality}
Storytelling: ${p.storytelling}
Humor: ${p.humor}
Emojis: ${p.emojis}
Formatting: ${p.formatting}
Sentences: ${p.sentenceStyle}
Openings: ${p.openings}
Endings: ${p.endings}
Talking about accomplishments: ${p.accomplishments}
Technical language: ${p.technicalLanguage}
Naturally does: ${p.naturallyDoes.join("; ")}
Avoids: ${p.avoid.join("; ")}
Signature phrases: ${p.signaturePhrases.join("; ")}
Learned from the author's edits: ${p.learnedFromEdits.join("; ") || "nothing yet"}
${measured}`;
}

function examplesBlock(docs: MemoryDoc[]) {
  if (!docs.length) return "(No writing samples yet. Write plainly and conversationally, and flag that the voice is not yet learned.)";
  return docs
    .map((d, i) => `<example index="${i + 1}"${d.weight > 1.3 ? ' rated="sounds exactly like me"' : ""}>\n${d.text}\n</example>`)
    .join("\n\n");
}

function voiceSystem(extra = "") {
  const stats = computeStats(listSamples().filter((s) => s.feedback !== "not").map((s) => s.text));
  const lessons = editLessons();
  return `You are the private writing copilot for one person. Your job is to help them write LinkedIn posts that sound exactly like them, never like generic AI content.

${profileBlock(getVoiceProfile(), stats)}
${lessons.length ? `\nRecent edit patterns (strong signal, follow them): ${lessons.join(" ")}` : ""}

About the author:
${contextBlock(getContext())}

${RULES}
${extra}`;
}

// ---------- Voice analysis ----------

const VoiceSchema = z.object({
  summary: z.string().describe("Two or three sentences describing the voice as a whole"),
  tone: z.string(),
  formality: z.string(),
  storytelling: z.string().describe("Typical story arc, e.g. personal experience -> lesson -> broader takeaway"),
  humor: z.string(),
  emojis: z.string(),
  formatting: z.string(),
  sentenceStyle: z.string(),
  openings: z.string().describe("How posts usually open"),
  endings: z.string().describe("How posts usually end, including questions and calls to action"),
  accomplishments: z.string().describe("How they talk about wins without sounding self-promotional"),
  technicalLanguage: z.string(),
  naturallyDoes: z.array(z.string()).describe("5 to 8 concrete habits"),
  avoid: z.array(z.string()).describe("5 to 8 things this writer avoids or should avoid"),
  signaturePhrases: z.array(z.string()).describe("Words or phrases they actually use, quoted from samples"),
  learnedFromEdits: z.array(z.string()).describe("Preferences inferred from how they edited AI drafts; empty if none"),
});

export async function analyzeVoice(): Promise<Omit<VoiceProfile, "updatedAt">> {
  const samples = listSamples().filter((s) => s.feedback !== "not");
  const disliked = listSamples().filter((s) => s.feedback === "not");
  if (samples.length === 0) throw new AIError("Add at least one writing sample first.", 400);
  // Weight by feedback: "exactly like me" first, then liked, then the rest, newest first.
  const rank = { exact: 0, like: 1 } as Record<string, number>;
  const ordered = [...samples].sort((a, b) => (rank[a.feedback ?? ""] ?? 2) - (rank[b.feedback ?? ""] ?? 2));
  const body = ordered
    .slice(0, 50)
    .map((s) => `<post${s.feedback === "exact" ? ' rating="sounds exactly like me (weight heavily)"' : s.feedback === "like" ? ' rating="I like this"' : ""}>\n${s.text}\n</post>`)
    .join("\n\n");
  const notMe = disliked.slice(0, 8).map((s) => `<not_me>\n${s.text}\n</not_me>`).join("\n\n");
  const pairs = editPairs()
    .map((p) => `<edit>\n<ai_draft>\n${p.ai}\n</ai_draft>\n<what_they_kept>\n${p.final}\n</what_they_kept>\n</edit>`)
    .join("\n\n");
  const stats = computeStats(samples.map((s) => s.text));

  const out = await structured(
    VoiceSchema,
    `You are a sharp editor who studies one writer's LinkedIn posts and describes their voice precisely enough that another writer could imitate it. Be concrete and evidence-based. Quote real phrases. Do not flatter. Do not use em dashes.`,
    `Analyze this writer's voice.

Measured stats: ${JSON.stringify(stats)}

Their posts:
${body}
${notMe ? `\nPosts they marked as NOT sounding like them (learn what to avoid):\n${notMe}` : ""}
${pairs ? `\nHow they edited AI drafts (infer preferences from the differences):\n${pairs}` : ""}
${editLessons().length ? `\nHeuristic edit patterns: ${editLessons().join(" ")}` : ""}`,
    "high",
  );
  return { ...out, analyzedSampleCount: samples.length };
}

// ---------- Generate ----------

const GenerateSchema = z.object({
  options: z.array(
    z.object({
      label: z.enum(["Safe", "Stronger", "Experimental"]),
      text: z.string().describe("The full LinkedIn post, with line breaks"),
      approach: z.string().describe("One sentence on what this version does differently"),
      placeholders: z.array(z.string()).describe("Bracketed placeholders in the text that the author must fill"),
    }),
  ),
  questions: z.array(z.string()).describe("Up to 3 questions for missing details that would make the post more specific. Empty if none."),
});

export interface GenerateInput {
  topic: string;
  context?: string;
  audience?: string;
  outcome?: string;
  details?: string;
  link?: string;
  tags?: string;
  draft?: string;
  tone: string;
  goal: string;
  angle?: string;
}

export async function generatePosts(input: GenerateInput, examples: MemoryDoc[]) {
  const fields = [
    ["Topic", input.topic],
    ["Context", input.context],
    ["Audience", input.audience],
    ["Desired outcome", input.outcome],
    ["Important details (facts you may use)", input.details],
    ["Link to include", input.link],
    ["People/organizations to tag", input.tags],
    ["Author's rough draft (keep their wording where possible)", input.draft],
    ["Angle to take", input.angle],
  ]
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  return structured(
    GenerateSchema,
    voiceSystem(`\nThe most relevant posts the author has written. Match their voice, rhythm, and formatting closely, but do not copy sentences or reuse their hooks:\n\n${examplesBlock(examples)}`),
    `Write a LinkedIn post.

${fields}
Tone: ${input.tone}
Post goal: ${input.goal}

Return exactly three options, in this order:
- Safe: very close to the author's existing style and structure.
- Stronger: more polished and engaging, still unmistakably them.
- Experimental: a different structure or hook, same voice.

Tag people as @Name only if they were listed. Do not add hashtags unless the author's samples use them.`,
    "high",
  );
}

// ---------- Repetition ----------

const AnglesSchema = z.object({
  message: z.string().describe("One friendly sentence naming what the earlier post covered"),
  alternativeAngles: z.array(z.string()).describe("Exactly 3 fresh angles"),
});

export async function alternativeAngles(topic: string, previous: string) {
  return structured(
    AnglesSchema,
    voiceSystem(),
    `The author wants to post about: "${topic}"

It looks similar to something they already posted:
<previous>
${previous}
</previous>

Briefly say what the earlier post covered, then suggest 3 genuinely different angles on the new topic that would not repeat the earlier point, hook, or story.`,
    "low",
  );
}

// ---------- Ideas ----------

const ExpandSchema = z.object({
  angles: z.array(z.string()).describe("3 possible angles"),
  hooks: z.array(z.string()).describe("5 opening hooks in the author's voice"),
  structure: z.array(z.string()).describe("4 to 6 beats for a story structure"),
  themes: z.array(z.string()).describe("Relevant themes"),
  overlapNote: z.string().describe("Whether this overlaps with past posts, and how to stay fresh. Say 'No overlap found' if none."),
});

export async function expandIdea(idea: { title: string; description?: string | null; notes?: string | null }, related: MemoryDoc[]) {
  return structured(
    ExpandSchema,
    voiceSystem(),
    `Help develop this post idea.

Idea: ${idea.title}
${idea.description ? `Description: ${idea.description}` : ""}
${idea.notes ? `Notes: ${idea.notes}` : ""}

Past posts that may be related:
${examplesBlock(related)}`,
    "medium",
  );
}

const SmartIdeasSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string(),
      hook: z.string().describe("An opening line in the author's voice"),
      coreStory: z.string(),
      takeaway: z.string(),
      whyAudienceCares: z.string(),
      category: z.string(),
    }),
  ),
});

export async function smartIdeas(focus?: string) {
  const samples = listSamples().slice(0, 25);
  const posted = listDrafts().filter((d) => d.status === "posted").slice(0, 15);
  const ideas = listIdeas().slice(0, 30);
  const topicCounts = new Map<string, number>();
  for (const s of samples) if (s.topic) topicCounts.set(s.topic, (topicCounts.get(s.topic) ?? 0) + 1);
  for (const d of posted) if (d.category) topicCounts.set(d.category, (topicCounts.get(d.category) ?? 0) + 1);

  return structured(
    SmartIdeasSchema,
    voiceSystem(),
    `Suggest 6 highly personalized LinkedIn post ideas for this author.

Do NOT suggest generic ideas like "5 lessons I learned from leadership". Each idea must come from something specific in their context, projects, milestones, or past posts. Prefer something like: "I expected running an open-source program with 1,500+ people to be mostly about organizing projects. I was wrong. The hardest part was..."
Favor topics they have not covered recently. Do not invent facts; if an idea depends on a detail you don't know, phrase the hook with a [placeholder].
${focus ? `\nFocus area requested: ${focus}` : ""}

Topic counts so far: ${JSON.stringify(Object.fromEntries(topicCounts))}

Recent posts (first lines):
${[...posted.map((d) => d.body), ...samples.map((s) => s.text)].slice(0, 25).map((t) => `- ${t.split("\n")[0].slice(0, 140)}`).join("\n") || "(none)"}

Saved ideas already in the bank (don't duplicate):
${ideas.map((i) => `- ${i.title}`).join("\n") || "(none)"}`,
    "medium",
  );
}

// ---------- Rewrite ----------

const RewriteSchema = z.object({
  improved: z.string(),
  changes: z.array(z.string()).describe("3 to 6 short bullet points describing what changed, e.g. 'Stronger opening'"),
  preserved: z.string().describe("One sentence on what was kept to preserve the author's voice"),
});

export async function rewritePost(text: string, intensity: number, instruction: string | undefined, examples: MemoryDoc[]) {
  const level =
    intensity <= 20
      ? "Light touch: fix only clear issues. Keep almost every sentence and nearly all wording."
      : intensity <= 50
        ? "Moderate: tighten, reorder, and sharpen, but keep most of their wording and all of their phrasing quirks."
        : intensity <= 80
          ? "Substantial: restructure freely and rewrite weak sentences, keeping their voice and key phrases."
          : "Aggressive: rewrite as needed for the strongest post, still clearly in their voice.";
  return structured(
    RewriteSchema,
    voiceSystem(`\nExamples of the author's real writing:\n\n${examplesBlock(examples)}`),
    `Make this post better, but keep it sounding like the author. Do not replace their personality.

Rewrite intensity: ${intensity}/100. ${level}
${instruction ? `Extra instruction: ${instruction}` : ""}

<draft>
${text}
</draft>`,
    "medium",
  );
}

// ---------- Post coach ----------

const ReviewSchema = z.object({
  hook: z.object({ score: z.number().int(), note: z.string() }),
  authenticity: z.object({ score: z.number().int(), note: z.string() }),
  clarity: z.object({ score: z.number().int(), note: z.string() }),
  credibility: z.object({ score: z.number().int(), note: z.string() }),
  engagement: z.object({ score: z.number().int(), note: z.string() }),
  selfPromotion: z.object({ score: z.number().int(), note: z.string().describe("Confident without bragging? 10 = perfectly balanced") }),
  length: z.object({ score: z.number().int(), note: z.string().describe("Name anything unnecessary") }),
  recommendations: z.array(z.string()).describe("2 or 3 specific, actionable recommendations"),
});

export async function reviewPost(text: string, examples: MemoryDoc[]) {
  return structured(
    ReviewSchema,
    voiceSystem(`\nExamples of the author's real writing, use them to judge authenticity:\n\n${examplesBlock(examples)}`),
    `Review this LinkedIn post before it goes out. Score each dimension from 1 to 10 and be honest; a 9 or 10 must be earned. Keep each note to one sentence. Recommendations must be specific to this text, not generic advice.

<post>
${text}
</post>`,
    "medium",
  );
}
