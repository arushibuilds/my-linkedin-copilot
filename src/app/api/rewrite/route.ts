import { z } from "zod";
import { rewritePost } from "@/lib/ai";
import { body, handle } from "@/lib/api";
import { retrieveExamples } from "@/lib/memory";
import { logGeneration } from "@/lib/store";

export const maxDuration = 300;

export const POST = handle(async (req: Request) => {
  const input = await body(
    req,
    z.object({ text: z.string().trim().min(1), intensity: z.number().min(0).max(100).default(35), instruction: z.string().optional() }),
  );
  const { docs, refs } = retrieveExamples(input.text, 3);
  const out = await rewritePost(input.text, input.intensity, input.instruction, docs);
  logGeneration("rewrite", input, out);
  return { ...out, sources: refs };
});
