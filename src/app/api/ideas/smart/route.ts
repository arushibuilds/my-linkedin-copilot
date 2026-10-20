import { z } from "zod";
import { smartIdeas } from "@/lib/ai";
import { body, handle } from "@/lib/api";
import { logGeneration } from "@/lib/store";

export const maxDuration = 300;

export const POST = handle(async (req: Request) => {
  const { focus } = await body(req, z.object({ focus: z.string().optional() }));
  const out = await smartIdeas(focus);
  logGeneration("ideas", { focus }, out);
  return out;
});
