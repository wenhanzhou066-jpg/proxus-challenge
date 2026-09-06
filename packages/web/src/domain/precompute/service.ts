import type { MaterialAnalysis } from "@proxus/shared";
import { apiClientConfig } from "../../api-client/config.ts";
import type { Material } from "../assignments/types.ts";
import { loadAnalysis, loadStatus, saveAnalysis, setStatus } from "./storage.ts";

const inflight = new Set<string>();

/**
 * Fire precompute for a material. Idempotent + deduped:
 * - No-op if analysis already cached
 * - No-op if a request is already in flight for this materialId
 * - Fire-and-forget (returns immediately; status updates via storage events)
 */
export function precomputeMaterial(material: Material, opts: { force?: boolean } = {}): void {
  if (inflight.has(material.id)) return;

  if (!opts.force) {
    const existing = loadAnalysis(material.id);
    if (existing !== null) {
      setStatus(material.id, { kind: "ready", generatedAt: existing.generatedAt });
      return;
    }
    const status = loadStatus(material.id);
    if (status.kind === "running") return;
  }

  inflight.add(material.id);
  setStatus(material.id, { kind: "running" });

  void (async () => {
    try {
      const res = await fetch(`${apiClientConfig.apiUrl}/api/materials/precompute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dataUrl: material.dataUrl, fileName: material.name })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Server ${res.status}: ${text.slice(0, 200)}`);
      }
      const analysis = (await res.json()) as MaterialAnalysis;
      saveAnalysis(material.id, analysis);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setStatus(material.id, { kind: "failed", error: message });
    } finally {
      inflight.delete(material.id);
    }
  })();
}

/** Fire precompute for a list of materials (fire-and-forget, deduped) */
export function precomputeMaterials(materials: ReadonlyArray<Material>): void {
  for (const material of materials) precomputeMaterial(material);
}
