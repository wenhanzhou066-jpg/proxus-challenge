import type { Profile, UserMode } from "./types.ts";

const KEY = "proxus.personality.profile.v2";
const MODE_KEY = "proxus.personality.mode.v2";

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile): void {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  localStorage.removeItem(KEY);
}

export function loadMode(): UserMode | null {
  const v = localStorage.getItem(MODE_KEY);
  return v === "free" || v === "guided" ? v : null;
}

export function saveMode(mode: UserMode): void {
  localStorage.setItem(MODE_KEY, mode);
}

export function clearAll(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem(MODE_KEY);
}
