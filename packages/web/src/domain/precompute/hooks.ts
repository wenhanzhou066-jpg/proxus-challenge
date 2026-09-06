import { useEffect, useState } from "react";
import type { MaterialAnalysis } from "@proxus/shared";
import { loadAnalysis, loadStatus, subscribe } from "./storage.ts";
import type { PrecomputeStatus } from "./types.ts";

/** Reactive precompute status for a material — updates on service writes */
export function usePrecomputeStatus(materialId: string | null): PrecomputeStatus {
  const [status, setStatusState] = useState<PrecomputeStatus>(() =>
    materialId === null ? { kind: "idle" } : loadStatus(materialId)
  );

  useEffect(() => {
    if (materialId === null) {
      setStatusState({ kind: "idle" });
      return;
    }
    setStatusState(loadStatus(materialId));
    return subscribe((changed) => {
      if (changed === materialId) setStatusState(loadStatus(materialId));
    });
  }, [materialId]);

  return status;
}

/** Reactive analysis payload — null until precompute completes */
export function usePrecomputeAnalysis(materialId: string | null): MaterialAnalysis | null {
  const [analysis, setAnalysis] = useState<MaterialAnalysis | null>(() =>
    materialId === null ? null : loadAnalysis(materialId)
  );

  useEffect(() => {
    if (materialId === null) {
      setAnalysis(null);
      return;
    }
    setAnalysis(loadAnalysis(materialId));
    return subscribe((changed) => {
      if (changed === materialId) setAnalysis(loadAnalysis(materialId));
    });
  }, [materialId]);

  return analysis;
}
