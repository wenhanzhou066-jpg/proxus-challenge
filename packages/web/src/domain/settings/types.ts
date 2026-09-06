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
}

export const DEFAULT_SETTINGS: Settings = {
  name: "",
  cvd: "none"
};
