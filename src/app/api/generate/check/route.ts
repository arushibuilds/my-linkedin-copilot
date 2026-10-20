import { z } from "zod";
import { alternativeAngles } from "@/lib/ai";
import { body, handle } from "@/lib/api";
import { findSimilar } from "@/lib/memory";
import type { RepetitionWarning } from "@/lib/types";

export const maxDuration = 120;

// Runs before generating: have I already made this point, hook, or story?
export const POST = handle(async (req: Request) => {
  const { topic, details } = await body(req, z.object({ topic: z.string().min(1), details: z.string().optional() }));
  const similar = findSimilar([topic, details].filter(Boolean).join("\n"));
  if (!similar) return { repetition: null };
  const alt = await alternativeAngles(topic, similar.doc.text);
  const repetition: RepetitionWarning = {
    similarTo: similar.excerpt,
    similarToId: similar.doc.id,
    kind: similar.doc.kind,
    score: Number(similar.score.toFixed(2)),
    message: alt.message,
    alternativeAngles: alt.alternativeAngles.slice(0, 3),
  };
  return { repetition };
});
