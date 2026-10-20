"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, fmtDate } from "@/lib/client";
import { CATEGORIES, DRAFT_STATUSES, type Draft, type PostReview, type SourceRef } from "@/lib/types";
import { SourceList } from "./SourceList";
import { Button, CopyButton, ErrorNote, Field, ScoreBar } from "./ui";

type Rewrite = { improved: string; changes: string[]; preserved: string; sources: SourceRef[] };

const SCORE_LABELS: [keyof PostReview["scores"], string][] = [
  ["hook", "Hook"],
  ["authenticity", "Authenticity"],
  ["clarity", "Clarity"],
  ["credibility", "Credibility"],
  ["engagement", "Engagement"],
  ["selfPromotion", "Self-promotion balance"],
  ["length", "Length"],
];

export function DraftEditor({ draft }: { draft: Draft }) {
  const router = useRouter();
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [status, setStatus] = useState(draft.status);
  const [category, setCategory] = useState(draft.category ?? "");
  const [scheduledFor, setScheduledFor] = useState(draft.scheduledFor ?? "");
  const [tab, setTab] = useState<"coach" | "rewrite">("coach");
  const [review, setReview] = useState<PostReview | null>(draft.review);
  const [rewrite, setRewrite] = useState<Rewrite | null>(null);
  const [rewriteFrom, setRewriteFrom] = useState("");
  const [intensity, setIntensity] = useState(30);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState<null | "save" | "review" | "rewrite">(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty = title !== draft.title || body !== draft.body || status !== draft.status || category !== (draft.category ?? "") || scheduledFor !== (draft.scheduledFor ?? "");

  async function save(extra: Partial<Draft> = {}) {
    setBusy("save");
    setError(null);
    try {
      await api(`/api/drafts/${draft.id}`, "PATCH", { title, body, status, category: category || null, scheduledFor: scheduledFor || null, ...extra });
      setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function runReview() {
    setBusy("review");
    setError(null);
    try {
      setReview(await api<PostReview>("/api/review", "POST", { text: body, draftId: draft.id }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function runRewrite() {
    setBusy("rewrite");
    setError(null);
    try {
      setRewriteFrom(body);
      setRewrite(await api<Rewrite>("/api/rewrite", "POST", { text: body, intensity, instruction: instruction || undefined }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function markPosted() {
    setStatus("posted");
    await save({ status: "posted" });
  }

  async function remove() {
    if (!confirm("Delete this draft?")) return;
    await api(`/api/drafts/${draft.id}`, "DELETE");
    router.push("/drafts");
    router.refresh();
  }

  const chars = body.length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/drafts" className="text-sm text-ink-faint hover:text-ink">
          ← Drafts
        </Link>
        <div className="flex items-center gap-2 text-xs text-ink-faint">
          {dirty ? "Unsaved changes" : savedAt ? `Saved ${savedAt}` : `Updated ${fmtDate(draft.updatedAt)}`}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <input className="mb-3 w-full bg-transparent font-serif text-2xl outline-none" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="card p-1">
            <textarea
              className="post-text min-h-[440px] w-full resize-y rounded-lg bg-transparent px-4 py-3 outline-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "s" && (e.preventDefault(), save())}
            />
            <div className="flex items-center justify-between border-t border-line px-3 py-2 text-xs text-ink-faint">
              <span className={chars > 3000 ? "text-red-600" : ""}>
                {chars.toLocaleString()} / 3,000 · first {Math.min(chars, 210)} chars show before &ldquo;see more&rdquo;
              </span>
              <CopyButton text={body} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field label="Status">
              <select className="field" value={status} onChange={(e) => setStatus(e.target.value as Draft["status"])}>
                {DRAFT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.emoji} {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">None</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Post date">
              <input type="date" className="field" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            </Field>
          </div>

          <div className="mt-4">
            <ErrorNote error={error} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={() => save()} loading={busy === "save"} disabled={!dirty}>
              Save
            </Button>
            {status !== "posted" && (
              <Button variant="secondary" onClick={markPosted}>
                ✅ Mark as posted
              </Button>
            )}
            <Button variant="danger" className="ml-auto" onClick={remove}>
              Delete
            </Button>
          </div>
          {draft.aiBody && draft.aiBody !== body && (
            <p className="mt-3 text-xs text-ink-faint">Your edits to the AI version are saved and used to learn your preferences.</p>
          )}
          {draft.sources.length > 0 && (
            <div className="mt-8">
              <SourceList sources={draft.sources} />
            </div>
          )}
        </div>

        <aside>
          <div className="mb-4 flex gap-1 rounded-lg bg-paper-sunk p-1 text-sm">
            {(["coach", "rewrite"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-md px-3 py-1.5 ${tab === t ? "bg-paper-raised font-medium shadow-sm" : "text-ink-soft"}`}>
                {t === "coach" ? "🎯 Post Coach" : "✍️ Rewrite"}
              </button>
            ))}
          </div>

          {tab === "coach" && (
            <div className="card p-5">
              <Button onClick={runReview} loading={busy === "review"} className="w-full" disabled={!body.trim()}>
                {review ? "Review again" : "Review this post"}
              </Button>
              {review ? (
                <div className="mt-5 space-y-4">
                  {SCORE_LABELS.map(([k, label]) => (
                    <ScoreBar key={k} label={label} score={review.scores[k]} note={review.notes[k]} />
                  ))}
                  <div className="border-t border-line pt-4">
                    <p className="label">Recommendations</p>
                    <ol className="list-decimal space-y-2 pl-5 text-sm">
                      {review.recommendations.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ol>
                  </div>
                  <p className="text-xs text-ink-faint">Reviewed {fmtDate(review.reviewedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-soft">Checks your hook, authenticity, clarity, credibility, engagement, self-promotion, and length against how you actually write.</p>
              )}
            </div>
          )}

          {tab === "rewrite" && (
            <div className="card p-5">
              <p className="text-sm font-medium">Make this better, but still sound like me.</p>
              <div className="mt-4">
                <input type="range" min={0} max={100} step={5} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="w-full accent-ink" />
                <div className="flex justify-between text-xs text-ink-faint">
                  <span>Keep my wording</span>
                  <span>Rewrite more aggressively</span>
                </div>
              </div>
              <input className="field mt-4 text-sm" placeholder="Optional: e.g. tighten the opening" value={instruction} onChange={(e) => setInstruction(e.target.value)} />
              <Button onClick={runRewrite} loading={busy === "rewrite"} className="mt-3 w-full" disabled={!body.trim()}>
                Improve
              </Button>
            </div>
          )}
        </aside>
      </div>

      {rewrite && (
        <div className="mt-10">
          <h2 className="mb-4 font-serif text-2xl">Rewrite</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <p className="label">Original</p>
              <p className="post-text text-ink-soft">{rewriteFrom}</p>
            </div>
            <div className="card border-accent/30 p-5">
              <p className="label">Improved</p>
              <p className="post-text">{rewrite.improved}</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-paper-sunk px-5 py-4">
            <p className="text-sm font-medium">What changed</p>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">
              {rewrite.changes.map((c) => (
                <li key={c}>· {c}</li>
              ))}
              <li>· {rewrite.preserved}</li>
            </ul>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => {
                setBody(rewrite.improved);
                setRewrite(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Use this version
            </Button>
            <CopyButton text={rewrite.improved} />
            <Button variant="ghost" onClick={() => setRewrite(null)}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
