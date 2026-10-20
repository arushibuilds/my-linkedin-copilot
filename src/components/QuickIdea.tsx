"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { CATEGORIES } from "@/lib/types";
import { Button, ErrorNote, Field, Modal } from "./ui";

export function QuickIdea({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api("/api/ideas", "POST", { title, description: description || null, category: category || null });
      setTitle("");
      setDescription("");
      setCategory("");
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Quick idea">
      <div className="space-y-4">
        <input
          autoFocus
          className="field text-base"
          placeholder="What I learned from getting 1,500+ people into open source"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && save()}
        />
        <textarea className="field min-h-[90px]" placeholder="Any notes, details, or the moment that sparked it (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Field label="Category">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(category === c ? "" : c)} className={`chip ${category === c ? "chip-on" : ""}`}>
                {c}
              </button>
            ))}
          </div>
        </Field>
        <ErrorNote error={error} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!title.trim()}>
            Save idea
          </Button>
        </div>
      </div>
    </Modal>
  );
}
