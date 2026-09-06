import type { Color, Profile } from "./types.ts";

/**
 * Personality-driven learning strategy config.
 * Consumed by StudySession, FeynmanTimer, ReviewQueue.
 */
export interface StudyStrategy {
  /** Feynman timer duration in seconds */
  readonly feynmanSeconds: number;
  /** Hard = auto-submits at zero; soft = timer keeps counting up */
  readonly feynmanHardStop: boolean;
  /** Minimum keyPoint coverage (0..1) to count as "correct" for SRS */
  readonly passThreshold: number;
  /** Cards surfaced per day in review queue */
  readonly dailyCards: number;
  /** How many guiding hints revealed up-front (before user hits "stuck") */
  readonly hintsUpFront: number;
  /** Force a prediction textarea before showing the question body */
  readonly requirePrediction: boolean;
  /** Copy label for the primary study CTA */
  readonly ctaLabel: string;
  /** Short one-liner shown near CTA — matches the color's vibe */
  readonly tagline: string;
}

const DEFAULT: StudyStrategy = {
  feynmanSeconds: 180,
  feynmanHardStop: false,
  passThreshold: 0.7,
  dailyCards: 6,
  hintsUpFront: 0,
  requirePrediction: true,
  ctaLabel: "Start study session",
  tagline: "Think first — memorize second."
};

const BY_COLOR: Record<Color, StudyStrategy> = {
  R: {
    feynmanSeconds: 120,
    feynmanHardStop: true,
    passThreshold: 0.7,
    dailyCards: 8,
    hintsUpFront: 0,
    requirePrediction: true,
    ctaLabel: "Sprint session",
    tagline: "Beat the clock. Own the concept."
  },
  Y: {
    feynmanSeconds: 180,
    feynmanHardStop: false,
    passThreshold: 0.65,
    dailyCards: 6,
    hintsUpFront: 1,
    requirePrediction: true,
    ctaLabel: "Explore session",
    tagline: "Connect the dots your way."
  },
  G: {
    feynmanSeconds: 300,
    feynmanHardStop: false,
    passThreshold: 0.6,
    dailyCards: 4,
    hintsUpFront: 1,
    requirePrediction: true,
    ctaLabel: "Guided session",
    tagline: "One question at a time — steady wins."
  },
  B: {
    feynmanSeconds: 300,
    feynmanHardStop: true,
    passThreshold: 0.85,
    dailyCards: 6,
    hintsUpFront: 0,
    requirePrediction: true,
    ctaLabel: "Deep session",
    tagline: "Rigor first. Cite your reasoning."
  }
};

export function getStrategy(profile: Profile | null): StudyStrategy {
  if (profile === null) return DEFAULT;
  return BY_COLOR[profile.primary];
}
