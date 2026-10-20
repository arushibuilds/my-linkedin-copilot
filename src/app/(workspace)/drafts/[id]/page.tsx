import { notFound } from "next/navigation";
import { DraftEditor } from "@/components/DraftEditor";
import { getDraft } from "@/lib/store";

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const draft = getDraft((await params).id);
  if (!draft) notFound();
  return <DraftEditor draft={draft} />;
}
