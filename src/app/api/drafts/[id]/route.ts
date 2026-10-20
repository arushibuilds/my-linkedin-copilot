import { z } from "zod";
import { body, handle, HttpError, type Ctx } from "@/lib/api";
import { deleteDraft, updateDraft, updateIdea } from "@/lib/store";
import { DraftInput } from "@/lib/schemas";

const Patch = DraftInput.partial().extend({ postedAt: z.string().nullish() });

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const d = updateDraft((await params).id, (await body(req, Patch)) as never);
  if (!d) throw new HttpError(404, "Draft not found");
  // Keep the linked idea's status in step with its draft.
  if (d.ideaId && d.status !== "archived") updateIdea(d.ideaId, { status: d.status });
  return d;
});
export const DELETE = handle(async (_req: Request, { params }: Ctx) => deleteDraft((await params).id));
