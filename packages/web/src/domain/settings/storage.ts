import { DEFAULT_SETTINGS, type Settings } from "./types.ts";

const KEY = "proxus.settings.v1";

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : DEFAULT_SETTINGS.name,
      cvd: parsed.cvd === "deutan" || parsed.cvd === "protan" || parsed.cvd === "tritan" || parsed.cvd === "none"
        ? parsed.cvd
        : DEFAULT_SETTINGS.cvd
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* noop */
  }
}
