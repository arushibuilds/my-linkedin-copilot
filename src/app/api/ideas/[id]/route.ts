import { body, handle, HttpError, type Ctx } from "@/lib/api";
import { deleteIdea, updateIdea } from "@/lib/store";
import { IdeaInput } from "@/lib/schemas";

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const i = updateIdea((await params).id, (await body(req, IdeaInput.partial())) as never);
  if (!i) throw new HttpError(404, "Idea not found");
  return i;
});
export const DELETE = handle(async (_req: Request, { params }: Ctx) => deleteIdea((await params).id));
