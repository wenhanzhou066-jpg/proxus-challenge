export type { MaterialAnalysis, ConceptualQuestion, GlossaryTerm, Misconception, OutlineSection } from "@proxus/shared";

export type PrecomputeStatus =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "ready"; generatedAt: string }
  | { kind: "failed"; error: string };
