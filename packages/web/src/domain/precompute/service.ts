import type { MaterialAnalysis } from "@proxus/shared";
import { apiClientConfig } from "../../api-client/config.ts";
import type { Material } from "../assignments/types.ts";
import { loadAnalysis, loadStatus, saveAnalysis, setStatus } from "./storage.ts";

const inflight = new Set<string>();
const queue: Array<{ readonly material: Material; readonly force: boolean }> = [];
let processing = false;

// Free-tier Gemini is 5 requests/min per model → keep well under it.
const MIN_GAP_MS = 15_000;
const MAX_RETRIES = 2;
let lastRequestAt = 0;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function extractRetryDelayMs(text: string): number | null {
  const m = /"retryDelay"\s*:\s*"?(\d+)s"?/.exec(text);
  if (m === null) return null;
  const seconds = m[1];
  return seconds !== undefined ? parseInt(seconds, 10) * 1000 : null;
}

async function runOne(material: Material): Promise<void> {
  setStatus(material.id, { kind: "running" });
  let attempt = 0;
  while (true) {
    const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastRequestAt));
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();

    try {
      const res = await fetch(`${apiClientConfig.apiUrl}/api/materials/precompute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dataUrl: material.dataUrl, fileName: material.name })
      });
      if (res.status === 429 && attempt < MAX_RETRIES) {
        const text = await res.text().catch(() => "");
        const retryMs = extractRetryDelayMs(text) ?? 35_000;
        attempt++;
        await sleep(retryMs + 500);
        continue;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Server ${res.status}: ${text.slice(0, 200)}`);
      }
      const analysis = (await res.json()) as MaterialAnalysis;
      saveAnalysis(material.id, analysis);
      return;
    } catch (cause) {
      if (attempt < MAX_RETRIES) {
        attempt++;
        await sleep(2000 * attempt);
        continue;
      }
      const message = cause instanceof Error ? cause.message : String(cause);
      setStatus(material.id, { kind: "failed", error: message });
      return;
    }
  }
}

async function drainQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift();
      if (job === undefined) break;
      if (inflight.has(job.material.id)) continue;
      inflight.add(job.material.id);
      try { await runOne(job.material); }
      finally { inflight.delete(job.material.id); }
    }
  } finally {
    processing = false;
  }
}

/**
 * Enqueue precompute for a material. Idempotent + deduped, serial execution with
 * per-request pacing + 429 back-off to stay under Gemini free-tier rate limits.
 */
export function precomputeMaterial(material: Material, opts: { force?: boolean } = {}): void {
  const force = opts.force === true;

  if (!force) {
    const existing = loadAnalysis(material.id);
    if (existing !== null) {
      setStatus(material.id, { kind: "ready", generatedAt: existing.generatedAt });
      return;
    }
    const status = loadStatus(material.id);
    if (status.kind === "running") return;
  }

  if (inflight.has(material.id)) return;
  if (queue.some((j) => j.material.id === material.id)) return;

  queue.push({ material, force });
  setStatus(material.id, { kind: "running" });
  void drainQueue();
}

/** Enqueue precompute for a list of materials (serialized + rate-limited) */
export function precomputeMaterials(materials: ReadonlyArray<Material>): void {
  for (const material of materials) precomputeMaterial(material);
}
