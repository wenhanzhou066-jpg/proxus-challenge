import type { Cvd } from "./types.ts";

export type FeedbackKind = "pass" | "fail" | "partial" | "info";

export interface FeedbackPalette {
  readonly badge: string;
  readonly softBg: string;
  readonly border: string;
  readonly text: string;
  readonly icon: string;
}

/**
 * Tailwind class bundles per feedback kind, remapped for color-vision deficiency.
 * Red/green collisions (deutan/protan) → red shifts to amber/orange, still readable.
 * Tritan barely affects red/green so we keep the default.
 * Every kind also carries a distinct symbol so color isn't the only cue.
 */
const PALETTES: Record<Cvd, Record<FeedbackKind, FeedbackPalette>> = {
  none: {
    pass:    { badge: "bg-emerald-950 text-emerald-200", softBg: "bg-emerald-500/15", border: "border-emerald-400", text: "text-emerald-300", icon: "✓" },
    fail:    { badge: "bg-red-950 text-red-200",        softBg: "bg-rose-500/15",    border: "border-rose-400",    text: "text-rose-300",    icon: "✕" },
    partial: { badge: "bg-sky-950 text-sky-200",        softBg: "bg-sky-500/15",     border: "border-sky-400",     text: "text-sky-300",     icon: "◐" },
    info:    { badge: "bg-slate-800 text-slate-200",    softBg: "bg-slate-500/15",   border: "border-slate-500",   text: "text-slate-300",   icon: "•" }
  },
  deutan: {
    pass:    { badge: "bg-teal-950 text-teal-200",      softBg: "bg-teal-500/15",    border: "border-teal-400",    text: "text-teal-300",    icon: "✓" },
    fail:    { badge: "bg-orange-950 text-orange-200",  softBg: "bg-orange-500/15",  border: "border-orange-400",  text: "text-orange-300",  icon: "✕" },
    partial: { badge: "bg-blue-950 text-blue-200",      softBg: "bg-blue-500/15",    border: "border-blue-400",    text: "text-blue-300",    icon: "◐" },
    info:    { badge: "bg-slate-800 text-slate-200",    softBg: "bg-slate-500/15",   border: "border-slate-500",   text: "text-slate-300",   icon: "•" }
  },
  protan: {
    pass:    { badge: "bg-cyan-950 text-cyan-200",      softBg: "bg-cyan-500/15",    border: "border-cyan-400",    text: "text-cyan-300",    icon: "✓" },
    fail:    { badge: "bg-amber-950 text-amber-200",    softBg: "bg-amber-500/15",   border: "border-amber-400",   text: "text-amber-300",   icon: "✕" },
    partial: { badge: "bg-indigo-950 text-indigo-200",  softBg: "bg-indigo-500/15",  border: "border-indigo-400",  text: "text-indigo-300",  icon: "◐" },
    info:    { badge: "bg-slate-800 text-slate-200",    softBg: "bg-slate-500/15",   border: "border-slate-500",   text: "text-slate-300",   icon: "•" }
  },
  tritan: {
    pass:    { badge: "bg-emerald-950 text-emerald-200", softBg: "bg-emerald-500/15", border: "border-emerald-400", text: "text-emerald-300", icon: "✓" },
    fail:    { badge: "bg-rose-950 text-rose-200",       softBg: "bg-rose-500/15",    border: "border-rose-400",    text: "text-rose-300",    icon: "✕" },
    partial: { badge: "bg-cyan-950 text-cyan-200",       softBg: "bg-cyan-500/15",    border: "border-cyan-400",    text: "text-cyan-300",    icon: "◐" },
    info:    { badge: "bg-slate-800 text-slate-200",     softBg: "bg-slate-500/15",   border: "border-slate-500",   text: "text-slate-300",   icon: "•" }
  }
};

export function getFeedbackPalette(kind: FeedbackKind, cvd: Cvd): FeedbackPalette {
  return PALETTES[cvd][kind];
}
