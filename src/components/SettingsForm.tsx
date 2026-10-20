"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import type { PersonalContext } from "@/lib/types";
import { Button, ErrorNote, Field } from "./ui";

const FIELDS: { key: keyof PersonalContext; label: string; placeholder: string }[] = [
  { key: "whoIAm", label: "Who I am", placeholder: "Education, career, interests..." },
  { key: "building", label: "What I'm building", placeholder: "Projects, organizations, communities, startups..." },
  { key: "goals", label: "What I'm working toward", placeholder: "Career goals and opportunities I'm interested in..." },
  { key: "topics", label: "Topics I care about", placeholder: "AI, open source, software engineering, communities..." },
  { key: "people", label: "People / organizations", placeholder: "Who I collaborate with often..." },
  { key: "milestones", label: "Current milestones", placeholder: "Upcoming events, conferences, launches, publications..." },
];

export function SettingsForm({ initial }: { initial: PersonalContext }) {
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api("/api/context", "PUT", c);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="mb-4 font-serif text-xl">My Context</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <textarea className="field min-h-[110px]" placeholder={f.placeholder} value={c[f.key]} onChange={(e) => setC({ ...c, [f.key]: e.target.value })} />
          </Field>
        ))}
      </div>
      <div className="mt-3">
        <ErrorNote error={error} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={save} loading={saving}>
          {saved ? "Saved" : "Save context"}
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            await api("/api/auth/logout", "POST");
            router.push("/login");
          }}
        >
          Sign out
        </Button>
      </div>
    </section>
  );
}
