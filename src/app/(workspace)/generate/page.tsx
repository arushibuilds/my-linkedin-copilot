import { GenerateForm } from "@/components/GenerateForm";
import { PageHeader } from "@/components/ui";

export default async function GeneratePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="Generate" subtitle="Tell it what happened. It writes three versions in your voice, based on posts you've actually written." />
      <GenerateForm initial={{ topic: sp.topic ?? "", details: sp.details ?? "", angle: sp.angle ?? "", ideaId: sp.ideaId ?? "", category: sp.category ?? "" }} />
    </>
  );
}
