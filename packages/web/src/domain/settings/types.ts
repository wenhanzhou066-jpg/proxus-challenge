export type Cvd = "none" | "deutan" | "protan" | "tritan";

export const CVD_LABEL: Record<Cvd, string> = {
  none: "Sin filtro",
  deutan: "Deuteranopía (verde-débil)",
  protan: "Protanopía (rojo-débil)",
  tritan: "Tritanopía (azul-amarillo)"
};

export interface Settings {
  readonly name: string;
  readonly cvd: Cvd;
  /**
   * When true, disables all color/personality-driven adaptation:
   * tutor voice, study session mechanics (timer, cards, hints, thresholds),
   * CTAs and taglines. Falls back to neutral defaults.
   */
  readonly disablePersonalityAdaptation: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  name: "",
  cvd: "none",
  disablePersonalityAdaptation: false
};
