import { useEffect, useState } from "react";
import { loadSettings, saveSettings } from "./storage.ts";
import type { Settings } from "./types.ts";

type Listener = (settings: Settings) => void;

let current: Settings = loadSettings();
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(current);
}

export function getSettings(): Settings {
  return current;
}

export function updateSettings(next: Settings): void {
  current = next;
  saveSettings(next);
  applyDomAttributes(next);
  emit();
}

export function useSettings(): [Settings, (next: Settings) => void] {
  const [settings, setSettings] = useState<Settings>(current);
  useEffect(() => {
    const listener: Listener = (s) => setSettings(s);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  return [settings, updateSettings];
}

export function applyDomAttributes(settings: Settings): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-cvd", settings.cvd);
}

// Apply once at module load so <html> matches persisted setting on first paint
applyDomAttributes(current);
