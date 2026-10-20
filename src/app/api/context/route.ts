import { z } from "zod";
import { body, handle } from "@/lib/api";
import { getContext, setContext } from "@/lib/store";

const ContextInput = z.object({
  whoIAm: z.string(),
  building: z.string(),
  goals: z.string(),
  topics: z.string(),
  people: z.string(),
  milestones: z.string(),
});

export const GET = handle(async () => getContext());
export const PUT = handle(async (req: Request) => {
  const c = await body(req, ContextInput);
  setContext(c);
  return c;
});
