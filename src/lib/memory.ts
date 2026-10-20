import "server-only";
import { listDrafts, listSamples } from "./store";
import type { Sample, SourceRef, VoiceStats } from "./types";

// Writing Memory: a small BM25 index over everything you've written.
// Retrieval picks the few most relevant posts for a prompt instead of stuffing every post in.

const STOP = new Set(
  "a an the and or but if of to in on at for with from by as is are was were be been being it its this that these those i me my we our you your he she they them their so just very really not no do did does have has had can could would should will about into than then there here what which who when where how all any some more most also out up over too only own same such get got".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9#+\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

export interface MemoryDoc {
  id: string;
  kind: "sample" | "post";
  text: string;
  /** Feedback weight: "exactly like me" posts count more. */
  weight: number;
  date: string;
}

const FEEDBACK_WEIGHT: Record<string, number> = { exact: 1.6, like: 1.15, not: 0 };

export function memoryDocs(opts: { includeDisliked?: boolean } = {}): MemoryDoc[] {
  const samples: MemoryDoc[] = listSamples()
    .map((s: Sample) => ({
      id: s.id,
      kind: "sample" as const,
      text: s.text,
      weight: s.feedback ? FEEDBACK_WEIGHT[s.feedback] : 1,
      date: s.postedOn || s.createdAt,
    }))
    .filter((d) => opts.includeDisliked || d.weight > 0);
  const posts: MemoryDoc[] = listDrafts()
    .filter((d) => d.status === "posted")
    .map((d) => ({ id: d.id, kind: "post" as const, text: d.body, weight: 1.1, date: d.postedAt || d.updatedAt }));
  return [...samples, ...posts];
}

function bm25(query: string, docs: MemoryDoc[]) {
  const k1 = 1.4;
  const b = 0.75;
  const toks = docs.map((d) => tokenize(d.text));
  const avgLen = toks.reduce((a, t) => a + t.length, 0) / Math.max(1, toks.length);
  const df = new Map<string, number>();
  for (const t of toks) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1);
  const q = [...new Set(tokenize(query))];
  return docs.map((doc, i) => {
    const tf = new Map<string, number>();
    for (const w of toks[i]) tf.set(w, (tf.get(w) ?? 0) + 1);
    let score = 0;
    for (const w of q) {
      const f = tf.get(w);
      if (!f) continue;
      const n = df.get(w) ?? 0;
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * toks[i].length) / avgLen)));
    }
    return { doc, score };
  });
}

const excerpt = (text: string) => {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 160 ? t.slice(0, 157) + "..." : t;
};

/**
 * Most relevant past writing for a topic. Falls back to the best-rated posts when
 * nothing matches, so generations always have real voice examples to lean on.
 */
export function retrieveExamples(query: string, k = 4): { docs: MemoryDoc[]; refs: SourceRef[] } {
  const docs = memoryDocs();
  if (!docs.length) return { docs: [], refs: [] };
  const scored = bm25(query, docs)
    .map((s) => ({ ...s, score: s.score * s.doc.weight }))
    .sort((a, b) => b.score - a.score);
  let picked = scored.filter((s) => s.score > 0).slice(0, k);
  if (picked.length < Math.min(k, 2)) {
    const fill = scored
      .filter((s) => !picked.includes(s))
      .sort((a, b) => b.doc.weight - a.doc.weight || b.doc.date.localeCompare(a.doc.date))
      .slice(0, Math.min(k, 3) - picked.length);
    picked = [...picked, ...fill];
  }
  return {
    docs: picked.map((p) => p.doc),
    refs: picked.map((p) => ({ id: p.doc.id, kind: p.doc.kind, excerpt: excerpt(p.doc.text), score: Number(p.score.toFixed(2)) })),
  };
}

/** Cosine similarity over term counts: used to flag repeated stories/points. */
function cosine(a: string[], b: string[]) {
  const va = new Map<string, number>();
  const vb = new Map<string, number>();
  for (const w of a) va.set(w, (va.get(w) ?? 0) + 1);
  for (const w of b) vb.set(w, (vb.get(w) ?? 0) + 1);
  let dot = 0;
  for (const [w, c] of va) dot += c * (vb.get(w) ?? 0);
  const n = (v: Map<string, number>) => Math.sqrt([...v.values()].reduce((s, c) => s + c * c, 0));
  return dot / (n(va) * n(vb) || 1);
}

export function findSimilar(text: string, opts: { excludeId?: string; threshold?: number } = {}) {
  const q = tokenize(text);
  if (q.length < 3) return null;
  let best: { doc: MemoryDoc; score: number } | null = null;
  for (const doc of memoryDocs({ includeDisliked: true })) {
    if (doc.id === opts.excludeId) continue;
    const score = cosine(q, tokenize(doc.text));
    if (!best || score > best.score) best = { doc, score };
  }
  return best && best.score >= (opts.threshold ?? 0.32) ? { ...best, excerpt: excerpt(best.doc.text) } : null;
}

// ---------- Measured voice stats ----------

const EMOJI = /\p{Extended_Pictographic}/gu;

export function computeStats(texts: string[]): VoiceStats {
  const n = texts.length || 1;
  const words = texts.map((t) => t.split(/\s+/).filter(Boolean).length);
  const sentences = texts.flatMap((t) => t.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.trim().length > 1));
  const sentenceWords = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const paragraphs = texts.flatMap((t) => t.split(/\n\s*\n/).filter((p) => p.trim()));
  const freq = new Map<string, number>();
  for (const t of texts) for (const w of tokenize(t)) if (!w.startsWith("#")) freq.set(w, (freq.get(w) ?? 0) + 1);
  const openings = new Map<string, number>();
  for (const t of texts) {
    const first = t.trim().split(/\s+/).slice(0, 2).join(" ").toLowerCase();
    if (first) openings.set(first, (openings.get(first) ?? 0) + 1);
  }
  return {
    sampleCount: texts.length,
    avgWords: Math.round(words.reduce((a, b) => a + b, 0) / n),
    avgSentenceWords: Number((sentenceWords.reduce((a, b) => a + b, 0) / Math.max(1, sentenceWords.length)).toFixed(1)),
    avgParagraphLines: Number((paragraphs.reduce((a, p) => a + p.split("\n").length, 0) / Math.max(1, paragraphs.length)).toFixed(1)),
    emojiPerPost: Number((texts.reduce((a, t) => a + (t.match(EMOJI)?.length ?? 0), 0) / n).toFixed(1)),
    emDashPerPost: Number((texts.reduce((a, t) => a + (t.match(/—/g)?.length ?? 0), 0) / n).toFixed(1)),
    questionEndingRate: Number((texts.filter((t) => /\?\s*(#\S+\s*)*$/.test(t.trim())).length / n).toFixed(2)),
    hashtagPerPost: Number((texts.reduce((a, t) => a + (t.match(/#\w+/g)?.length ?? 0), 0) / n).toFixed(1)),
    topWords: [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w]) => w),
    openingWords: [...openings.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w),
  };
}

/**
 * Compares what the AI wrote with what you kept. Returns plain-language lessons
 * (e.g. "Removes em dashes") that feed into the voice profile.
 */
export function editLessons(): string[] {
  const pairs = listDrafts().filter((d) => d.aiBody && d.aiBody.trim() !== d.body.trim());
  if (pairs.length < 2) return [];
  const tally = { emDash: 0, shorterOpen: 0, shorter: 0, longer: 0, fewerEmoji: 0, fewerHashtags: 0, fewerExclaim: 0 };
  for (const d of pairs) {
    const a = d.aiBody!;
    const b = d.body;
    const count = (t: string, re: RegExp) => t.match(re)?.length ?? 0;
    if (count(a, /—/g) > count(b, /—/g)) tally.emDash++;
    const firstLine = (t: string) => t.trim().split("\n")[0].length;
    if (firstLine(b) < firstLine(a) * 0.8) tally.shorterOpen++;
    if (b.length < a.length * 0.85) tally.shorter++;
    if (b.length > a.length * 1.15) tally.longer++;
    if (count(a, EMOJI) > count(b, EMOJI)) tally.fewerEmoji++;
    if (count(a, /#\w+/g) > count(b, /#\w+/g)) tally.fewerHashtags++;
    if (count(a, /!/g) > count(b, /!/g)) tally.fewerExclaim++;
  }
  const min = Math.max(2, Math.ceil(pairs.length * 0.4));
  const lessons: string[] = [];
  if (tally.emDash >= min) lessons.push("Removes em dashes from AI drafts. Avoid em dashes.");
  if (tally.shorterOpen >= min) lessons.push("Shortens opening lines. Keep hooks tight.");
  if (tally.shorter >= min) lessons.push("Cuts drafts down. Aim shorter than feels natural.");
  if (tally.longer >= min) lessons.push("Adds detail to drafts. Include more specifics.");
  if (tally.fewerEmoji >= min) lessons.push("Removes emojis. Use fewer.");
  if (tally.fewerHashtags >= min) lessons.push("Removes hashtags. Use fewer or none.");
  if (tally.fewerExclaim >= min) lessons.push("Tones down exclamation marks.");
  return lessons;
}

export function editPairs(limit = 6) {
  return listDrafts()
    .filter((d) => d.aiBody && d.aiBody.trim() !== d.body.trim())
    .slice(0, limit)
    .map((d) => ({ ai: d.aiBody!, final: d.body }));
}
