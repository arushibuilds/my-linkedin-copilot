"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button } from "./ui";

export function ReanalyzeButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        disabled={disabled}
        loading={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            await api("/api/voice", "POST");
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Reading your posts..." : "Re-analyze my writing"}
      </Button>
      {error && <span className="max-w-xs text-right text-xs text-red-700">{error}</span>}
    </div>
  );
}
