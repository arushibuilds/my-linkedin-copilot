"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { GOALS, TONES, type GenerateResult, type RepetitionWarning } from "@/lib/types";
import { SourceList } from "./SourceList";
import { Button, CopyButton, ErrorNote, Field } from "./ui";

const EXAMPLES = [
  "I just presented my research at Grace Hopper",
  "Winter of Code Social registrations opened",
  "I got my first AI engineering internship",
  "I learned something interesting about open source",
  "I want to share a project I built",
  "I want to talk about a mistake I made",
];

type Initial = { topic: string; details: string; angle: string; ideaId: string; category: string };

export function GenerateForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [topic, setTopic] = useState(initial.topic);
  const [more, setMore] = useState(Boolean(initial.details));
  const [f, setF] = useState({ context: "", audience: "", outcome: "", details: initial.details, link: "", tags: "", draft: "" });
  const [angle, setAngle] = useState(initial.angle);
  const [tone, setTone] = useState(TONES[0]);
  const [goal, setGoal] = useState("Tell a story");
  const [phase, setPhase] = useState<"idle" | "checking" | "generating">("idle");
  const [warning, setWarning] = useState<RepetitionWarning | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [texts, setTexts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function start() {
    if (!topic.trim()) return;
    setError(null);
    setWarning(null);
    setPhase("checking");
    try {
      const { repetition } = await api<{ repetition: RepetitionWarning | null }>("/api/generate/check", "POST", { topic, details: f.details || undefined });
      if (repetition && !angle) {
        setWarning(repetition);
        setPhase("idle");
        return;
      }
      await generate(angle);
    } catch (e) {
      setError((e as Error).message);
      setPhase("idle");
    }
  }

  async function generate(useAngle: string) {
    setWarning(null);
    setPhase("generating");
    setError(null);
    try {
      const payload = Object.fromEntries(Object.entries({ topic, ...f, angle: useAngle }).filter(([, v]) => v && String(v).trim()));
      const out = await api<GenerateResult>("/api/generate", "POST", { ...payload, tone, goal });
      setResult(out);
      setTexts(out.options.map((o) => o.text));
      setAngle(useAngle);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPhase("idle");
    }
  }

  async function saveDraft(i: number) {
    if (!result) return;
    setSavingIdx(i);
    try {
      const d = await api<{ id: string }>("/api/drafts", "POST", {
        title: topic.slice(0, 80),
        body: texts[i],
        aiBody: result.options[i].text,
        ideaId: initial.ideaId || null,
        category: initial.category || null,
        sources: result.sources,
      });
      router.push(`/drafts/${d.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSavingIdx(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="card p-5 md:p-6">
        <label className="label" htmlFor="topic">
          What do you want to post about?
        </label>
        <textarea
          id="topic"
          autoFocus
          className="field min-h-[96px] resize-y border-none px-0 text-lg shadow-none focus:ring-0"
          placeholder="I just presented my research at Grace Hopper..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && start()}
        />
        {!topic && (
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button key={ex} className="chip hover:text-ink" onClick={() => setTopic(ex)}>
                {ex}
              </button>
            ))}
          </div>
        )}

        <button className="mt-4 text-sm text-ink-soft hover:text-ink" onClick={() => setMore(!more)}>
          {more ? "− Hide details" : "+ Add context, audience, details, links, tags, or a draft"}
        </button>
        {more && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Context">
              <textarea className="field min-h-[72px]" placeholder="What led to this? What happened?" value={f.context} onChange={set("context")} />
            </Field>
            <Field label="Important details" hint="Facts, numbers, names. It will only use what you give it.">
              <textarea className="field min-h-[72px]" placeholder="1,500+ participants, 40 projects, first PR moments..." value={f.details} onChange={set("details")} />
            </Field>
            <Field label="Audience">
              <input className="field" placeholder="Students, OSS maintainers, recruiters..." value={f.audience} onChange={set("audience")} />
            </Field>
            <Field label="Desired outcome">
              <input className="field" placeholder="Get registrations, start a conversation..." value={f.outcome} onChange={set("outcome")} />
            </Field>
            <Field label="Link">
              <input className="field" placeholder="https://..." value={f.link} onChange={set("link")} />
            </Field>
            <Field label="People / organizations to tag">
              <input className="field" placeholder="AnitaB.org, @Jane Doe" value={f.tags} onChange={set("tags")} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Your rough draft" hint="It keeps as much of your wording as it can.">
                <textarea className="field min-h-[110px]" value={f.draft} onChange={set("draft")} />
              </Field>
            </div>
          </div>
        )}

        {angle && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm">
            <span className="text-accent">Angle:</span>
            <span className="flex-1">{angle}</span>
            <button className="text-ink-faint hover:text-ink" onClick={() => setAngle("")} aria-label="Clear angle">
              ✕
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-5 border-t border-line pt-5 md:grid-cols-2">
          <Field label="Tone">
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button key={t} className={`chip ${tone === t ? "chip-on" : ""}`} onClick={() => setTone(t)}>
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Post goal">
            <div className="flex flex-wrap gap-1.5">
              {GOALS.map((g) => (
                <button key={g} className={`chip ${goal === g ? "chip-on" : ""}`} onClick={() => setGoal(g)}>
                  {g}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={start} loading={phase !== "idle"} disabled={!topic.trim()}>
            ✨ Generate 3 options
          </Button>
          <span className="text-xs text-ink-faint">
            {phase === "checking" ? "Checking you haven't posted this already..." : phase === "generating" ? "Pulling your closest posts and writing..." : "⌘ + Enter"}
          </span>
        </div>
      </div>

      <ErrorNote error={error} />

      {warning && (
        <div className="card border-amber-200 bg-amber-50/60 p-5">
          <p className="font-medium">🔁 {warning.message}</p>
          <p className="mt-2 border-l-2 border-amber-300 pl-3 text-sm italic text-ink-soft">{warning.similarTo}</p>
          <p className="mt-4 text-sm font-medium">Want to approach it from a different angle?</p>
          <div className="mt-2 space-y-2">
            {warning.alternativeAngles.map((a) => (
              <button key={a} onClick={() => generate(a)} className="card block w-full px-4 py-2.5 text-left text-sm hover:border-ink/30">
                {a}
              </button>
            ))}
          </div>
          <Button variant="ghost" className="mt-3" onClick={() => generate("")}>
            Generate anyway
          </Button>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {result.questions.length > 0 && (
            <div className="rounded-xl bg-paper-sunk px-5 py-4 text-sm">
              <p className="mb-1 font-medium">A few details would make this sharper:</p>
              <ul className="list-disc space-y-0.5 pl-5 text-ink-soft">
                {result.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            {result.options.map((o, i) => (
              <div key={o.label} className="card flex flex-col p-5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Option {"ABC"[i]} · {o.label}
                  </span>
                </div>
                <p className="mb-3 text-xs text-ink-soft">{o.approach}</p>
                <textarea
                  className="post-text min-h-[320px] flex-1 resize-y rounded-lg bg-paper px-3 py-2 outline-none focus:ring-2 focus:ring-accent/15"
                  value={texts[i] ?? ""}
                  onChange={(e) => setTexts(texts.map((t, j) => (j === i ? e.target.value : t)))}
                />
                {o.placeholders.length > 0 && (
                  <p className="mt-2 text-xs text-amber-700">Fill in: {o.placeholders.join(", ")}</p>
                )}
                <div className="mt-3 flex items-center gap-1">
                  <Button onClick={() => saveDraft(i)} loading={savingIdx === i}>
                    Save as draft
                  </Button>
                  <CopyButton text={texts[i] ?? ""} />
                </div>
              </div>
            ))}
          </div>
          <SourceList sources={result.sources} />
        </div>
      )}
    </div>
  );
}
