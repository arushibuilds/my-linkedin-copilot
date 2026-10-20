import { IdeasBoard } from "@/components/IdeasBoard";
import { listIdeas } from "@/lib/store";

export default async function IdeasPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const { open } = await searchParams;
  return <IdeasBoard ideas={listIdeas()} openId={open ?? null} />;
}
