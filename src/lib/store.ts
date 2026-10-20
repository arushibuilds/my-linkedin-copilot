import "server-only";
import { db, getKv, newId, now, parseJson, setKv } from "./db";
import {
  EMPTY_CONTEXT,
  type Draft,
  type Feedback,
  type Idea,
  type IdeaExpansion,
  type PersonalContext,
  type PostReview,
  type Sample,
  type SourceRef,
  type VoiceProfile,
} from "./types";

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? null : String(v));
const num = (v: unknown) => (v == null ? null : Number(v));

// ---------- Samples ----------

const toSample = (r: Row): Sample => ({
  id: String(r.id),
  text: String(r.text),
  postedOn: str(r.posted_on),
  topic: str(r.topic),
  reactions: num(r.reactions),
  comments: num(r.comments),
  reposts: num(r.reposts),
  feedback: (r.feedback as Feedback) ?? null,
  notes: str(r.notes),
  createdAt: String(r.created_at),
});

export function listSamples(): Sample[] {
  return (db().prepare("SELECT * FROM samples ORDER BY COALESCE(posted_on, created_at) DESC").all() as Row[]).map(toSample);
}

export function createSample(input: Partial<Sample> & { text: string }): Sample {
  const id = newId();
  db()
    .prepare(
      "INSERT INTO samples (id, text, posted_on, topic, reactions, comments, reposts, feedback, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      id,
      input.text.trim(),
      input.postedOn ?? null,
      input.topic ?? null,
      input.reactions ?? null,
      input.comments ?? null,
      input.reposts ?? null,
      input.feedback ?? null,
      input.notes ?? null,
      now(),
    );
  return getSample(id)!;
}

export function getSample(id: string): Sample | null {
  const r = db().prepare("SELECT * FROM samples WHERE id = ?").get(id) as Row | undefined;
  return r ? toSample(r) : null;
}

export function updateSample(id: string, patch: Partial<Sample>): Sample | null {
  const cur = getSample(id);
  if (!cur) return null;
  const next = { ...cur, ...patch };
  db()
    .prepare(
      "UPDATE samples SET text=?, posted_on=?, topic=?, reactions=?, comments=?, reposts=?, feedback=?, notes=? WHERE id=?",
    )
    .run(next.text, next.postedOn, next.topic, next.reactions, next.comments, next.reposts, next.feedback, next.notes, id);
  return getSample(id);
}

export function deleteSample(id: string) {
  db().prepare("DELETE FROM samples WHERE id = ?").run(id);
}

// ---------- Ideas ----------

const toIdea = (r: Row): Idea => ({
  id: String(r.id),
  title: String(r.title),
  description: str(r.description),
  category: str(r.category),
  status: String(r.status) as Idea["status"],
  notes: str(r.notes),
  hook: str(r.hook),
  links: parseJson<string[]>(r.links, []),
  tags: parseJson<string[]>(r.tags, []),
  priority: (String(r.priority) as Idea["priority"]) || "medium",
  scheduledFor: str(r.scheduled_for),
  ai: parseJson<IdeaExpansion | null>(r.ai, null),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

export function listIdeas(): Idea[] {
  return (db().prepare("SELECT * FROM ideas ORDER BY updated_at DESC").all() as Row[]).map(toIdea);
}

export function getIdea(id: string): Idea | null {
  const r = db().prepare("SELECT * FROM ideas WHERE id = ?").get(id) as Row | undefined;
  return r ? toIdea(r) : null;
}

export function createIdea(input: Partial<Idea> & { title: string }): Idea {
  const id = newId();
  const t = now();
  db()
    .prepare(
      "INSERT INTO ideas (id, title, description, category, status, notes, hook, links, tags, priority, scheduled_for, ai, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      id,
      input.title.trim(),
      input.description ?? null,
      input.category ?? null,
      input.status ?? "idea",
      input.notes ?? null,
      input.hook ?? null,
      JSON.stringify(input.links ?? []),
      JSON.stringify(input.tags ?? []),
      input.priority ?? "medium",
      input.scheduledFor ?? null,
      input.ai ? JSON.stringify(input.ai) : null,
      t,
      t,
    );
  return getIdea(id)!;
}

export function updateIdea(id: string, patch: Partial<Idea>): Idea | null {
  const cur = getIdea(id);
  if (!cur) return null;
  const n = { ...cur, ...patch };
  db()
    .prepare(
      "UPDATE ideas SET title=?, description=?, category=?, status=?, notes=?, hook=?, links=?, tags=?, priority=?, scheduled_for=?, ai=?, updated_at=? WHERE id=?",
    )
    .run(
      n.title,
      n.description,
      n.category,
      n.status,
      n.notes,
      n.hook,
      JSON.stringify(n.links),
      JSON.stringify(n.tags),
      n.priority,
      n.scheduledFor,
      n.ai ? JSON.stringify(n.ai) : null,
      now(),
      id,
    );
  return getIdea(id);
}

export function deleteIdea(id: string) {
  db().prepare("DELETE FROM ideas WHERE id = ?").run(id);
}

// ---------- Drafts ----------

const toDraft = (r: Row): Draft => ({
  id: String(r.id),
  title: String(r.title),
  body: String(r.body),
  aiBody: str(r.ai_body),
  ideaId: str(r.idea_id),
  category: str(r.category),
  status: String(r.status) as Draft["status"],
  scheduledFor: str(r.scheduled_for),
  postedAt: str(r.posted_at),
  sources: parseJson<SourceRef[]>(r.sources, []),
  review: parseJson<PostReview | null>(r.review, null),
  createdAt: String(r.created_at),
  updatedAt: String(r.updated_at),
});

export function listDrafts(): Draft[] {
  return (db().prepare("SELECT * FROM drafts ORDER BY updated_at DESC").all() as Row[]).map(toDraft);
}

export function getDraft(id: string): Draft | null {
  const r = db().prepare("SELECT * FROM drafts WHERE id = ?").get(id) as Row | undefined;
  return r ? toDraft(r) : null;
}

export function createDraft(input: Partial<Draft> & { body: string }): Draft {
  const id = newId();
  const t = now();
  const title = input.title?.trim() || input.body.split("\n").find((l) => l.trim())?.slice(0, 80) || "Untitled draft";
  db()
    .prepare(
      "INSERT INTO drafts (id, title, body, ai_body, idea_id, category, status, scheduled_for, posted_at, sources, review, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
    )
    .run(
      id,
      title,
      input.body,
      input.aiBody ?? null,
      input.ideaId ?? null,
      input.category ?? null,
      input.status ?? "drafting",
      input.scheduledFor ?? null,
      input.postedAt ?? null,
      JSON.stringify(input.sources ?? []),
      null,
      t,
      t,
    );
  return getDraft(id)!;
}

export function updateDraft(id: string, patch: Partial<Draft>): Draft | null {
  const cur = getDraft(id);
  if (!cur) return null;
  const n = { ...cur, ...patch };
  if (patch.status === "posted" && !cur.postedAt && !patch.postedAt) n.postedAt = now();
  db()
    .prepare(
      "UPDATE drafts SET title=?, body=?, ai_body=?, idea_id=?, category=?, status=?, scheduled_for=?, posted_at=?, sources=?, review=?, updated_at=? WHERE id=?",
    )
    .run(
      n.title,
      n.body,
      n.aiBody,
      n.ideaId,
      n.category,
      n.status,
      n.scheduledFor,
      n.postedAt,
      JSON.stringify(n.sources),
      n.review ? JSON.stringify(n.review) : null,
      now(),
      id,
    );
  return getDraft(id);
}

export function deleteDraft(id: string) {
  db().prepare("DELETE FROM drafts WHERE id = ?").run(id);
}

// ---------- Generations ----------

export function logGeneration(kind: string, input: unknown, output: unknown): string {
  const id = newId();
  db()
    .prepare("INSERT INTO generations (id, kind, input, output, created_at) VALUES (?,?,?,?,?)")
    .run(id, kind, JSON.stringify(input), JSON.stringify(output), now());
  return id;
}

export function recentGenerations(limit = 20) {
  return (db().prepare("SELECT * FROM generations ORDER BY created_at DESC LIMIT ?").all(limit) as Row[]).map((r) => ({
    id: String(r.id),
    kind: String(r.kind),
    input: parseJson<Record<string, unknown>>(r.input, {}),
    createdAt: String(r.created_at),
  }));
}

// ---------- Singletons ----------

export const getVoiceProfile = () => getKv<VoiceProfile | null>("voice_profile", null);
export const setVoiceProfile = (p: VoiceProfile) => setKv("voice_profile", p);
export const getContext = () => ({ ...EMPTY_CONTEXT, ...getKv<Partial<PersonalContext>>("context", {}) });
export const setContext = (c: PersonalContext) => setKv("context", c);
