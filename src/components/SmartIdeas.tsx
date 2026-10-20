"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import type { SmartIdea } from "@/lib/types";
import { Button, ErrorNote } from "./ui";

export function SmartIdeas({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const [ideas, setIdeas] = useState<SmartIdea[]>([]);
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const out = await api<{ ideas: SmartIdea[] }>("/api/ideas/smart", "POST", { focus: focus || undefined });
      setIdeas(out.ideas);
      setSaved(new Set());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function save(i: number) {
    const idea = ideas[i];
    await api("/api/ideas", "POST", {
      title: idea.title,
      description: `${idea.coreStory}\n\nTakeaway: ${idea.takeaway}\n\nWhy it matters: ${idea.whyAudienceCares}`,
      hook: idea.hook,
      category: idea.category,
    });
    setSaved(new Set(saved).add(i));
    router.refresh();
  }

  const write = (idea: SmartIdea) =>
    router.push(`/generate?${new URLSearchParams({ topic: idea.title, details: `${idea.coreStory}\nTakeaway: ${idea.takeaway}`, angle: idea.hook })}`);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {!compact && (
          <input className="field max-w-xs flex-1" placeholder="Optional focus, e.g. open source" value={focus} onChange={(e) => setFocus(e.target.value)} />
        )}
        <Button onClick={run} loading={loading}>
          🔥 Give me ideas
        </Button>
      </div>
      {loading && <p className="mt-3 text-sm text-ink-faint">Reading your posts, ideas, and context...</p>}
      <div className="mt-3">
        <ErrorNote error={error} />
      </div>
      {ideas.length > 0 && (
        <div className={`mt-4 grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
          {ideas.map((idea, i) => (
            <div key={i} className="card flex flex-col p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="chip">{idea.category}</span>
              </div>
              <p className="font-serif text-[17px] leading-snug">&ldquo;{idea.hook}&rdquo;</p>
              <dl className="mt-3 space-y-2 text-sm text-ink-soft">
                <div>
                  <dt className="label mb-0.5">Core story</dt>
                  <dd>{idea.coreStory}</dd>
                </div>
                <div>
                  <dt className="label mb-0.5">Takeaway</dt>
                  <dd>{idea.takeaway}</dd>
                </div>
                <div>
                  <dt className="label mb-0.5">Why your audience cares</dt>
                  <dd>{idea.whyAudienceCares}</dd>
                </div>
              </dl>
              <div className="mt-auto flex gap-2 pt-4">
                <Button variant="secondary" onClick={() => save(i)} disabled={saved.has(i)}>
                  {saved.has(i) ? "Saved" : "Save to bank"}
                </Button>
                <Button variant="ghost" onClick={() => write(idea)}>
                  Write it →
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
