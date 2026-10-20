import { z } from "zod";

export const Status = z.enum(["idea", "drafting", "needs_work", "ready", "posted", "archived"]);

export const SampleInput = z.object({
  text: z.string().trim().min(1),
  postedOn: z.string().nullish(),
  topic: z.string().nullish(),
  reactions: z.number().int().nullish(),
  comments: z.number().int().nullish(),
  reposts: z.number().int().nullish(),
  feedback: z.enum(["exact", "like", "not"]).nullish(),
  notes: z.string().nullish(),
});

export const IdeaInput = z.object({
  title: z.string().trim().min(1),
  description: z.string().nullish(),
  category: z.string().nullish(),
  status: Status.optional(),
  notes: z.string().nullish(),
  hook: z.string().nullish(),
  links: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  scheduledFor: z.string().nullish(),
});

const Source = z.object({ id: z.string(), kind: z.enum(["sample", "post"]), excerpt: z.string(), score: z.number() });

export const DraftInput = z.object({
  title: z.string().optional(),
  body: z.string(),
  aiBody: z.string().nullish(),
  ideaId: z.string().nullish(),
  category: z.string().nullish(),
  status: Status.optional(),
  scheduledFor: z.string().nullish(),
  sources: z.array(Source).optional(),
});
