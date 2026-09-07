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
  ctaLabel: "Empezar sesión de estudio",
  tagline: "Piensa primero — memoriza después."
};

const BY_COLOR: Record<Color, StudyStrategy> = {
  R: {
    feynmanSeconds: 120,
    feynmanHardStop: true,
    passThreshold: 0.7,
    dailyCards: 8,
    hintsUpFront: 0,
    requirePrediction: true,
    ctaLabel: "Sesión sprint",
    tagline: "Gana al reloj. Domina el concepto."
  },
  Y: {
    feynmanSeconds: 180,
    feynmanHardStop: false,
    passThreshold: 0.65,
    dailyCards: 6,
    hintsUpFront: 1,
    requirePrediction: true,
    ctaLabel: "Sesión de exploración",
    tagline: "Conecta las ideas a tu manera."
  },
  G: {
    feynmanSeconds: 300,
    feynmanHardStop: false,
    passThreshold: 0.6,
    dailyCards: 4,
    hintsUpFront: 1,
    requirePrediction: true,
    ctaLabel: "Sesión guiada",
    tagline: "Una pregunta a la vez — la constancia gana."
  },
  B: {
    feynmanSeconds: 300,
    feynmanHardStop: true,
    passThreshold: 0.85,
    dailyCards: 6,
    hintsUpFront: 0,
    requirePrediction: true,
    ctaLabel: "Sesión en profundidad",
    tagline: "Rigor primero. Justifica tu razonamiento."
  }
};

export function getStrategy(profile: Profile | null): StudyStrategy {
  if (profile === null) return DEFAULT;
  return BY_COLOR[profile.primary];
}
