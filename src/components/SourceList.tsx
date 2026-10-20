import type { SourceRef } from "@/lib/types";

export function SourceList({ sources }: { sources: SourceRef[] }) {
  if (!sources.length)
    return <p className="text-sm text-ink-faint">No writing samples yet, so this is a generic voice. Add samples to make it sound like you.</p>;
  return (
    <div>
      <p className="label">Based on these writing samples</p>
      <div className="grid gap-2 md:grid-cols-2">
        {sources.map((s) => (
          <div key={s.id} className="rounded-lg border border-line px-3 py-2 text-sm text-ink-soft">
            <span className="mr-1.5 text-[11px] uppercase tracking-wide text-ink-faint">{s.kind === "post" ? "Posted" : "Sample"}</span>
            {s.excerpt}
          </div>
        ))}
      </div>
    </div>
  );
}
