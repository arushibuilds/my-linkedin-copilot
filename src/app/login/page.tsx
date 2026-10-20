"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ErrorNote } from "@/components/ui";
import { api } from "@/lib/client";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/auth/login", "POST", { password });
      router.replace(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm">
      <img src="/icon.svg" alt="" className="mb-6 h-10 w-10" />
      <h1 className="font-serif text-3xl">Welcome back.</h1>
      <p className="mt-2 text-ink-soft">Your private writing workspace.</p>
      <input type="password" autoFocus className="field mt-8" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="mt-3">
        <ErrorNote error={error} />
      </div>
      <Button type="submit" loading={loading} className="mt-3 w-full">
        Unlock
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
