import { analyzeVoice } from "@/lib/ai";
import { handle } from "@/lib/api";
import { computeStats, editLessons } from "@/lib/memory";
import { getVoiceProfile, listSamples, setVoiceProfile } from "@/lib/store";

export const maxDuration = 300;

export const GET = handle(async () => ({
  profile: getVoiceProfile(),
  stats: computeStats(listSamples().filter((s) => s.feedback !== "not").map((s) => s.text)),
  lessons: editLessons(),
}));

export const POST = handle(async () => {
  const profile = { ...(await analyzeVoice()), updatedAt: new Date().toISOString() };
  setVoiceProfile(profile);
  return profile;
});
