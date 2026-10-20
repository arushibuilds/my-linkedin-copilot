import { z } from "zod";
import { reviewPost } from "@/lib/ai";
import { body, handle } from "@/lib/api";
import { retrieveExamples } from "@/lib/memory";
import { updateDraft } from "@/lib/store";
import type { PostReview } from "@/lib/types";

export const maxDuration = 300;

const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));

export const POST = handle(async (req: Request) => {
  const { text, draftId } = await body(req, z.object({ text: z.string().trim().min(1), draftId: z.string().optional() }));
  const { docs } = retrieveExamples(text, 3);
  const r = await reviewPost(text, docs);
  const keys = ["hook", "authenticity", "clarity", "credibility", "engagement", "selfPromotion", "length"] as const;
  const review: PostReview = {
    scores: Object.fromEntries(keys.map((k) => [k, clamp(r[k].score)])) as PostReview["scores"],
    notes: Object.fromEntries(keys.map((k) => [k, r[k].note])) as PostReview["notes"],
    recommendations: r.recommendations.slice(0, 3),
    reviewedAt: new Date().toISOString(),
  };
  if (draftId) updateDraft(draftId, { review });
  return review;
});
