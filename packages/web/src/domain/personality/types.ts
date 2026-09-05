export type Color = "R" | "Y" | "G" | "B";

export const COLOR_LABEL: Record<Color, string> = {
  R: "Red",
  Y: "Yellow",
  G: "Green",
  B: "Blue"
};

export const COLOR_TRAIT: Record<Color, string> = {
  R: "Dominant",
  Y: "Inspiring",
  G: "Steady",
  B: "Analytical"
};

export const COLOR_HEX: Record<Color, string> = {
  R: "#ef4444",
  Y: "#eab308",
  G: "#22c55e",
  B: "#3b82f6"
};

export const COLOR_GRADIENT: Record<Color, string> = {
  R: "from-rose-500 via-red-500 to-orange-500",
  Y: "from-amber-400 via-yellow-400 to-orange-300",
  G: "from-emerald-400 via-green-500 to-teal-500",
  B: "from-sky-400 via-blue-500 to-indigo-500"
};

export const COLOR_METHODS: Record<Color, ReadonlyArray<string>> = {
  R: ["Timed challenges", "Goal streaks", "Rapid-fire quizzes", "Leaderboards"],
  Y: ["Interactive flashcards", "Visual mind-maps", "Study groups", "Gamified quests"],
  G: ["Spaced repetition", "Structured summaries", "Steady daily plan", "Guided reviews"],
  B: ["Deep-dive summaries", "Detailed notes", "Structured tests", "Concept trees"]
};

export type UserMode = "free" | "guided";

export interface Tetrad {
  id: number;
  prompt: string;
  options: Record<Color, string>;
}

export interface Answer {
  blockId: number;
  most: Color | null;
  least: Color | null;
}

export type Scores = Record<Color, number>;

export interface Profile {
  scores: Scores;
  percent: Scores;
  primary: Color;
  secondary: Color | null;
  completedAt: string;
}
