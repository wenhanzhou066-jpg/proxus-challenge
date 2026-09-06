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

/**
 * Color-vision-deficiency-safe palettes.
 * R/G collisions fixed by shifting to orange + teal (deuteran/protan).
 * Y/B collisions fixed by shifting to magenta + cyan (tritan).
 * Each variant keeps enough luminance contrast so shapes remain distinguishable
 * in grayscale too — a decent fallback for edge cases.
 */
export type CvdMode = "none" | "deutan" | "protan" | "tritan";

const CVD_HEX: Record<CvdMode, Record<Color, string>> = {
  none: COLOR_HEX,
  deutan: { R: "#e67e22", Y: "#f1c40f", G: "#0d9488", B: "#2563eb" },
  protan: { R: "#d97706", Y: "#facc15", G: "#0e7490", B: "#1d4ed8" },
  tritan: { R: "#ef4444", Y: "#c026d3", G: "#22c55e", B: "#0891b2" }
};

const CVD_GRADIENT: Record<CvdMode, Record<Color, string>> = {
  none: COLOR_GRADIENT,
  deutan: {
    R: "from-orange-500 via-orange-600 to-amber-600",
    Y: "from-yellow-300 via-yellow-400 to-amber-400",
    G: "from-teal-400 via-teal-600 to-cyan-700",
    B: "from-blue-500 via-blue-600 to-indigo-700"
  },
  protan: {
    R: "from-amber-500 via-orange-600 to-orange-700",
    Y: "from-yellow-300 via-amber-400 to-amber-500",
    G: "from-cyan-500 via-teal-600 to-teal-700",
    B: "from-blue-500 via-blue-700 to-indigo-800"
  },
  tritan: {
    R: "from-rose-500 via-red-500 to-orange-500",
    Y: "from-fuchsia-400 via-fuchsia-500 to-purple-600",
    G: "from-emerald-400 via-green-500 to-teal-500",
    B: "from-cyan-400 via-cyan-600 to-sky-700"
  }
};

export const COLOR_SYMBOL: Record<Color, string> = { R: "▲", Y: "●", G: "■", B: "◆" };

export function getColorHex(color: Color, cvd: CvdMode): string {
  return CVD_HEX[cvd][color];
}

export function getColorGradient(color: Color, cvd: CvdMode): string {
  return CVD_GRADIENT[cvd][color];
}

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
