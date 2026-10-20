import { z } from "zod";
import { generatePosts } from "@/lib/ai";
import { body, handle } from "@/lib/api";
import { retrieveExamples } from "@/lib/memory";
import { logGeneration } from "@/lib/store";
import type { GenerateResult } from "@/lib/types";

export const maxDuration = 300;

const GenerateInput = z.object({
  topic: z.string().trim().min(1),
  context: z.string().optional(),
  audience: z.string().optional(),
  outcome: z.string().optional(),
  details: z.string().optional(),
  link: z.string().optional(),
  tags: z.string().optional(),
  draft: z.string().optional(),
  tone: z.string().default("My natural voice"),
  goal: z.string().default("Tell a story"),
  angle: z.string().optional(),
});

export const POST = handle(async (req: Request): Promise<GenerateResult> => {
  const input = await body(req, GenerateInput);
  const query = [input.topic, input.context, input.details, input.angle, input.goal].filter(Boolean).join("\n");
  const { docs, refs } = retrieveExamples(query, 4);
  const out = await generatePosts(input, docs);
  const order = { Safe: 0, Stronger: 1, Experimental: 2 };
  const options = [...out.options].sort((a, b) => order[a.label] - order[b.label]);
  const generationId = logGeneration("post", input, { ...out, sources: refs });
  return { generationId, options, questions: out.questions, sources: refs, repetition: null };
});
