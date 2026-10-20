import { SettingsForm } from "@/components/SettingsForm";
import { PageHeader } from "@/components/ui";
import { MODEL } from "@/lib/ai";
import { getContext, listDrafts, listIdeas, listSamples, recentGenerations } from "@/lib/store";

export default function SettingsPage() {
  const gens = recentGenerations(8);
  return (
    <>
      <PageHeader title="Settings" subtitle="Your personal context makes ideas and posts more specific. The copilot never invents facts beyond what's here." />
      <SettingsForm initial={getContext()} />
      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="card p-5 text-sm">
          <h2 className="mb-3 font-semibold">Workspace</h2>
          <dl className="space-y-1.5 text-ink-soft">
            <div className="flex justify-between"><dt>Model</dt><dd className="font-mono text-xs">{MODEL}</dd></div>
            <div className="flex justify-between"><dt>API key</dt><dd>{process.env.ANTHROPIC_API_KEY ? "Configured" : "Missing"}</dd></div>
            <div className="flex justify-between"><dt>Writing samples</dt><dd>{listSamples().length}</dd></div>
            <div className="flex justify-between"><dt>Ideas</dt><dd>{listIdeas().length}</dd></div>
            <div className="flex justify-between"><dt>Drafts</dt><dd>{listDrafts().length}</dd></div>
          </dl>
        </div>
        <div className="card p-5 text-sm">
          <h2 className="mb-3 font-semibold">Recent generations</h2>
          {gens.length === 0 ? (
            <p className="text-ink-faint">None yet.</p>
          ) : (
            <ul className="space-y-1.5 text-ink-soft">
              {gens.map((g) => (
                <li key={g.id} className="flex justify-between gap-3">
                  <span className="truncate">
                    <span className="mr-1.5 text-xs uppercase text-ink-faint">{g.kind}</span>
                    {String(g.input.topic ?? g.input.focus ?? g.input.text ?? "").slice(0, 60) || "(no input)"}
                  </span>
                  <span className="shrink-0 text-xs text-ink-faint">{new Date(g.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
