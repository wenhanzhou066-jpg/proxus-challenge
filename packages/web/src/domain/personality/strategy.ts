import type { Color, Profile } from "./types.ts";

/**
 * Personality-driven learning strategy config.
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
  /**
   * Voice directive prepended to every user message.
   * Short (2-3 lines). Tells the tutor how to structure and word its replies
   * to match the learner's personality color. Stripped from bubble render.
   */
  readonly tutorVoice: string;
}

const DEFAULT: StudyStrategy = {
  feynmanSeconds: 180,
  feynmanHardStop: false,
  passThreshold: 0.7,
  dailyCards: 6,
  hintsUpFront: 0,
  requirePrediction: true,
  ctaLabel: "Empezar sesión de estudio",
  tagline: "Piensa primero — memoriza después.",
  tutorVoice: "Responde en español claro y neutral. Estructura: respuesta corta primero, luego 2-3 puntos de detalle."
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
    tagline: "Gana al reloj. Domina el concepto.",
    tutorVoice: [
      "Perfil del estudiante: DIRECTO / ORIENTADO A RESULTADOS.",
      "Voz: frases cortas, sin rodeos. Da la respuesta primero, luego 1-2 frases de porqué. Evita analogías largas y meta-comentarios.",
      "Estructura: bullets breves, negrita en la palabra clave. Máximo 6 líneas salvo que pida detalle explícito."
    ].join(" ")
  },
  Y: {
    feynmanSeconds: 180,
    feynmanHardStop: false,
    passThreshold: 0.65,
    dailyCards: 6,
    hintsUpFront: 1,
    requirePrediction: true,
    ctaLabel: "Sesión de exploración",
    tagline: "Conecta las ideas a tu manera.",
    tutorVoice: [
      "Perfil del estudiante: CREATIVO / CONECTOR DE IDEAS.",
      "Voz: cercana y entusiasta. Empieza con una analogía o ejemplo cotidiano, luego el concepto. Conecta con temas cercanos cuando sea natural.",
      "Estructura: párrafo corto + una lista si ayuda. Termina invitando a explorar un ángulo relacionado."
    ].join(" ")
  },
  G: {
    feynmanSeconds: 300,
    feynmanHardStop: false,
    passThreshold: 0.6,
    dailyCards: 4,
    hintsUpFront: 1,
    requirePrediction: true,
    ctaLabel: "Sesión guiada",
    tagline: "Una pregunta a la vez — la constancia gana.",
    tutorVoice: [
      "Perfil del estudiante: REFLEXIVO / NECESITA CONTEXTO SEGURO.",
      "Voz: paciente y socrática. Antes de la respuesta directa, ofrece una pregunta guía o un paso pequeño. Refuerza los intentos aunque estén incompletos.",
      "Estructura: máximo un concepto por respuesta. Cierra con \"¿quieres que profundicemos en X o probemos un ejemplo?\"."
    ].join(" ")
  },
  B: {
    feynmanSeconds: 300,
    feynmanHardStop: true,
    passThreshold: 0.85,
    dailyCards: 6,
    hintsUpFront: 0,
    requirePrediction: true,
    ctaLabel: "Sesión en profundidad",
    tagline: "Rigor primero. Justifica tu razonamiento.",
    tutorVoice: [
      "Perfil del estudiante: METÓDICO / RIGUROSO.",
      "Voz: precisa y formal. Define términos antes de usarlos. Justifica cada afirmación con el material o principio del que sale.",
      "Estructura: 1) definición, 2) demostración/paso a paso, 3) caso límite o excepción. Cita el material fuente cuando sea posible."
    ].join(" ")
  }
};

export function getStrategy(profile: Profile | null, disabled = false): StudyStrategy {
  if (disabled || profile === null) return DEFAULT;
  return BY_COLOR[profile.primary];
}
