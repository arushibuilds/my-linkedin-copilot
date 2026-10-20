"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorNote, PageHeader } from "@/components/ui";
import { api } from "@/lib/client";

export default function NewDraftPage() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setSaving(true);
    try {
      const d = await api<{ id: string }>("/api/drafts", "POST", { body });
      router.push(`/drafts/${d.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Paste a draft" subtitle="Bring something you've written. Then rewrite it or run it through the Post Coach." />
      <textarea autoFocus className="field post-text min-h-[360px]" placeholder="Paste your draft here..." value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="mt-3">
        <ErrorNote error={error} />
      </div>
      <Button className="mt-3" onClick={create} loading={saving} disabled={!body.trim()}>
        Open in editor
      </Button>
    </>
  );
}
