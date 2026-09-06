import type { MaterialAnalysis } from "@proxus/shared";
import type { PrecomputeStatus } from "./types.ts";

const ANALYSIS_PREFIX = "proxus.precompute.";
const STATUS_PREFIX = "proxus.precompute.status.";

/** Storage change event — components listen to re-render on write */
const CHANGE_EVENT = "proxus.precompute.change";

interface ChangeDetail {
  readonly materialId: string;
}

export function loadAnalysis(materialId: string): MaterialAnalysis | null {
  try {
    const raw = localStorage.getItem(ANALYSIS_PREFIX + materialId);
    return raw === null ? null : (JSON.parse(raw) as MaterialAnalysis);
  } catch {
    return null;
  }
}

export function saveAnalysis(materialId: string, analysis: MaterialAnalysis): void {
  try {
    localStorage.setItem(ANALYSIS_PREFIX + materialId, JSON.stringify(analysis));
    setStatus(materialId, { kind: "ready", generatedAt: analysis.generatedAt });
  } catch {
    // quota — status stays running until service marks failed
  }
}

export function loadStatus(materialId: string): PrecomputeStatus {
  try {
    const raw = localStorage.getItem(STATUS_PREFIX + materialId);
    if (raw !== null) return JSON.parse(raw) as PrecomputeStatus;
    // Legacy fallback: analysis present but status missing → ready
    const analysis = loadAnalysis(materialId);
    if (analysis !== null) return { kind: "ready", generatedAt: analysis.generatedAt };
    return { kind: "idle" };
  } catch {
    return { kind: "idle" };
  }
}

export function setStatus(materialId: string, status: PrecomputeStatus): void {
  try {
    localStorage.setItem(STATUS_PREFIX + materialId, JSON.stringify(status));
    emitChange({ materialId });
  } catch {
    // ignore
  }
}

export function clearAll(materialId: string): void {
  localStorage.removeItem(ANALYSIS_PREFIX + materialId);
  localStorage.removeItem(STATUS_PREFIX + materialId);
  emitChange({ materialId });
}

/* ── Change notification (in-tab) ── */

function emitChange(detail: ChangeDetail): void {
  window.dispatchEvent(new CustomEvent<ChangeDetail>(CHANGE_EVENT, { detail }));
}

export function subscribe(listener: (materialId: string) => void): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<ChangeDetail>).detail;
    listener(detail.materialId);
  };
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}
