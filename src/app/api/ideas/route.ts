import { body, handle } from "@/lib/api";
import { IdeaInput } from "@/lib/schemas";
import { createIdea, listIdeas } from "@/lib/store";

export const GET = handle(async () => listIdeas());
export const POST = handle(async (req: Request) => {
  const i = await body(req, IdeaInput);
  return createIdea({ ...i, description: i.description ?? null, category: i.category ?? null, notes: i.notes ?? null, hook: i.hook ?? null, scheduledFor: i.scheduledFor ?? null });
});
