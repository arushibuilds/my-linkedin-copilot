import { body, handle } from "@/lib/api";
import { DraftInput } from "@/lib/schemas";
import { createDraft, listDrafts, updateIdea } from "@/lib/store";

export const GET = handle(async () => listDrafts());
export const POST = handle(async (req: Request) => {
  const d = await body(req, DraftInput);
  const draft = createDraft({ ...d, aiBody: d.aiBody ?? null, ideaId: d.ideaId ?? null, category: d.category ?? null, scheduledFor: d.scheduledFor ?? null });
  if (draft.ideaId) updateIdea(draft.ideaId, { status: "drafting" });
  return draft;
});
