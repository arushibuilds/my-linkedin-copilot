import { expandIdea } from "@/lib/ai";
import { handle, HttpError, type Ctx } from "@/lib/api";
import { findSimilar, retrieveExamples } from "@/lib/memory";
import { getIdea, updateIdea } from "@/lib/store";

export const maxDuration = 300;

export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const idea = getIdea((await params).id);
  if (!idea) throw new HttpError(404, "Idea not found");
  const query = [idea.title, idea.description, idea.notes].filter(Boolean).join("\n");
  const { docs } = retrieveExamples(query, 3);
  const similar = findSimilar(query, { threshold: 0.25 });
  const out = await expandIdea(idea, docs);
  return updateIdea(idea.id, {
    ai: {
      angles: out.angles,
      hooks: out.hooks,
      structure: out.structure,
      themes: out.themes,
      overlap: { similarTo: similar?.excerpt ?? null, note: out.overlapNote },
    },
    hook: idea.hook || out.hooks[0] || null,
  });
});
