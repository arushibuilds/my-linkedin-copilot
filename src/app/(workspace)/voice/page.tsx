import { ReanalyzeButton } from "@/components/ReanalyzeButton";
import { Empty, LinkButton, PageHeader } from "@/components/ui";
import { computeStats, editLessons } from "@/lib/memory";
import { getVoiceProfile, listSamples } from "@/lib/store";

export default function VoicePage() {
  const samples = listSamples();
  const usable = samples.filter((s) => s.feedback !== "not");
  const profile = getVoiceProfile();
  const stats = computeStats(usable.map((s) => s.text));
  const lessons = editLessons();
  const exact = samples.filter((s) => s.feedback === "exact").length;
  const newSince = profile ? Math.max(0, usable.length - profile.analyzedSampleCount) : usable.length;

  return (
    <>
      <PageHeader
        title="My Voice"
        subtitle="What the copilot has learned about how you write. It uses this every time it generates or rewrites."
        actions={<ReanalyzeButton disabled={usable.length === 0} />}
      />

      {newSince > 0 && profile && (
        <p className="mb-6 rounded-lg bg-accent-soft px-4 py-2.5 text-sm">
          {newSince} new sample{newSince > 1 ? "s" : ""} since the last analysis. Re-analyze to fold them in.
        </p>
      )}

      {!profile ? (
        <Empty>
          {usable.length === 0 ? (
            <>
              No writing samples yet. <LinkButton href="/samples" variant="ghost">Add some posts →</LinkButton>
            </>
          ) : (
            "You have samples. Hit “Re-analyze my writing” to build your voice profile."
          )}
        </Empty>
      ) : (
        <div className="space-y-10">
          <blockquote className="border-l-2 border-ink pl-5 font-serif text-xl leading-relaxed md:text-2xl">{profile.summary}</blockquote>

          <section>
            <h2 className="mb-4 text-sm font-semibold">My writing style</h2>
            <dl className="grid gap-x-10 gap-y-5 md:grid-cols-2">
              {(
                [
                  ["Tone", profile.tone],
                  ["Formality", profile.formality],
                  ["Storytelling", profile.storytelling],
                  ["Humor", profile.humor],
                  ["Emojis", profile.emojis],
                  ["Formatting", profile.formatting],
                  ["Sentences", profile.sentenceStyle],
                  ["Openings", profile.openings],
                  ["Endings", profile.endings],
                  ["Talking about wins", profile.accomplishments],
                  ["Technical language", profile.technicalLanguage],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="label">{k}</dt>
                  <dd className="text-[15px]">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <ListCard title="Things I naturally do" items={profile.naturallyDoes} mark="✓" />
            <ListCard title="Avoid" items={profile.avoid} mark="✕" />
          </div>

          {profile.signaturePhrases.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold">Words and phrases I actually use</h2>
              <div className="flex flex-wrap gap-2">
                {profile.signaturePhrases.map((p) => (
                  <span key={p} className="chip font-serif text-[13px]">
                    &ldquo;{p}&rdquo;
                  </span>
                ))}
              </div>
            </section>
          )}

          {(profile.learnedFromEdits.length > 0 || lessons.length > 0) && (
            <ListCard title="Learned from your edits" items={[...new Set([...lessons, ...profile.learnedFromEdits])]} mark="↺" />
          )}

          <p className="text-xs text-ink-faint">
            Last analyzed {new Date(profile.updatedAt).toLocaleString()} from {profile.analyzedSampleCount} samples ({exact} marked &ldquo;exactly like me&rdquo;).
          </p>
        </div>
      )}

      {stats.sampleCount > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-sm font-semibold">By the numbers</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric value={stats.avgWords} label="words per post" />
            <Metric value={stats.avgSentenceWords} label="words per sentence" />
            <Metric value={stats.avgParagraphLines} label="lines per paragraph" />
            <Metric value={stats.emojiPerPost} label="emojis per post" />
            <Metric value={stats.emDashPerPost} label="em dashes per post" />
            <Metric value={stats.hashtagPerPost} label="hashtags per post" />
            <Metric value={`${Math.round(stats.questionEndingRate * 100)}%`} label="end with a question" />
            <Metric value={stats.sampleCount} label="samples analyzed" />
          </div>
          {stats.topWords.length > 0 && (
            <p className="mt-4 text-sm text-ink-soft">
              <span className="text-ink-faint">Most used words:</span> {stats.topWords.join(", ")}
            </p>
          )}
        </section>
      )}
    </>
  );
}

function ListCard({ title, items, mark }: { title: string; items: string[]; mark: string }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <ul className="space-y-2 text-[15px]">
        {items.map((i) => (
          <li key={i} className="flex gap-2.5">
            <span className="text-ink-faint">{mark}</span>
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="font-serif text-2xl">{value}</div>
      <div className="text-xs text-ink-faint">{label}</div>
    </div>
  );
}
