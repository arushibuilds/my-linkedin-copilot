export type Feedback = "exact" | "like" | "not" | null;

export interface Sample {
  id: string;
  text: string;
  postedOn: string | null;
  topic: string | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  feedback: Feedback;
  notes: string | null;
  createdAt: string;
}

export const IDEA_STATUSES = [
  { value: "idea", label: "Idea", emoji: "💭" },
  { value: "drafting", label: "Drafting", emoji: "✍️" },
  { value: "needs_work", label: "Needs work", emoji: "🔄" },
  { value: "ready", label: "Ready to post", emoji: "📅" },
  { value: "posted", label: "Posted", emoji: "✅" },
  { value: "archived", label: "Archived", emoji: "📦" },
] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number]["value"];

export const DRAFT_STATUSES = IDEA_STATUSES.filter((s) => s.value !== "idea");

export const CATEGORIES = ["Open source", "AI", "Career", "Projects", "Community", "Events", "Learning", "Personal", "Other"];
export const PRIORITIES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface IdeaExpansion {
  angles: string[];
  hooks: string[];
  structure: string[];
  themes: string[];
  overlap: { similarTo: string | null; note: string };
}

export interface Idea {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: IdeaStatus;
  notes: string | null;
  hook: string | null;
  links: string[];
  tags: string[];
  priority: Priority;
  scheduledFor: string | null;
  ai: IdeaExpansion | null;
  createdAt: string;
  updatedAt: string;
}

export interface SourceRef {
  id: string;
  kind: "sample" | "post";
  excerpt: string;
  score: number;
}

export interface PostReview {
  scores: { hook: number; authenticity: number; clarity: number; credibility: number; engagement: number; selfPromotion: number; length: number };
  notes: { hook: string; authenticity: string; clarity: string; credibility: string; engagement: string; selfPromotion: string; length: string };
  recommendations: string[];
  reviewedAt: string;
}

export interface Draft {
  id: string;
  title: string;
  body: string;
  aiBody: string | null;
  ideaId: string | null;
  category: string | null;
  status: IdeaStatus;
  scheduledFor: string | null;
  postedAt: string | null;
  sources: SourceRef[];
  review: PostReview | null;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceProfile {
  summary: string;
  tone: string;
  formality: string;
  storytelling: string;
  humor: string;
  emojis: string;
  formatting: string;
  sentenceStyle: string;
  openings: string;
  endings: string;
  accomplishments: string;
  technicalLanguage: string;
  naturallyDoes: string[];
  avoid: string[];
  signaturePhrases: string[];
  learnedFromEdits: string[];
  analyzedSampleCount: number;
  updatedAt: string;
}

/** Measured directly from the text, no LLM involved. */
export interface VoiceStats {
  sampleCount: number;
  avgWords: number;
  avgSentenceWords: number;
  avgParagraphLines: number;
  emojiPerPost: number;
  emDashPerPost: number;
  questionEndingRate: number;
  hashtagPerPost: number;
  topWords: string[];
  openingWords: string[];
}

export interface PersonalContext {
  whoIAm: string;
  building: string;
  goals: string;
  topics: string;
  people: string;
  milestones: string;
}

export const EMPTY_CONTEXT: PersonalContext = { whoIAm: "", building: "", goals: "", topics: "", people: "", milestones: "" };

export const TONES = [
  "My natural voice",
  "More casual",
  "More professional",
  "More thoughtful",
  "More confident",
  "More excited",
  "More technical",
  "More storytelling",
  "More concise",
];

export const GOALS = [
  "Share an accomplishment",
  "Tell a story",
  "Teach something",
  "Start a conversation",
  "Promote an event",
  "Share a project",
  "Build credibility",
  "Network",
  "Recruit/attract opportunities",
  "Celebrate someone else",
];

export interface GeneratedOption {
  label: "Safe" | "Stronger" | "Experimental";
  text: string;
  approach: string;
  placeholders: string[];
}

export interface RepetitionWarning {
  similarTo: string;
  similarToId: string;
  kind: "sample" | "post";
  score: number;
  message: string;
  alternativeAngles: string[];
}

export interface GenerateResult {
  generationId: string;
  options: GeneratedOption[];
  questions: string[];
  sources: SourceRef[];
  repetition: RepetitionWarning | null;
}

export interface SmartIdea {
  title: string;
  hook: string;
  coreStory: string;
  takeaway: string;
  whyAudienceCares: string;
  category: string;
}
