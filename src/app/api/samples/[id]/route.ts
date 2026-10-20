import { body, handle, HttpError, type Ctx } from "@/lib/api";
import { deleteSample, updateSample } from "@/lib/store";
import { SampleInput } from "@/lib/schemas";

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const s = updateSample((await params).id, await body(req, SampleInput.partial()));
  if (!s) throw new HttpError(404, "Sample not found");
  return s;
});
export const DELETE = handle(async (_req: Request, { params }: Ctx) => deleteSample((await params).id));
