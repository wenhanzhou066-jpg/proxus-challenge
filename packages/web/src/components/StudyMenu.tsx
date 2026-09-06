import { useState } from "react";
import type { Assignment, Material } from "../domain/assignments/types.ts";
import type { Profile } from "../domain/personality/types.ts";
import { COLOR_GRADIENT, COLOR_LABEL, COLOR_METHODS } from "../domain/personality/types.ts";
import { PdfPreviewModal } from "./PdfPreviewModal.tsx";


interface StudyOption {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly prompt: string;
}

const CORE_OPTIONS: ReadonlyArray<StudyOption> = [
  {
    id: "schema",
    title: "Schema / Diagram",
    description: "Visual map of the key concepts and how they connect.",
    prompt: "Build a schema-style diagram of the main concepts from my materials. Use an ASCII/markdown tree or table format that shows the hierarchy and relationships clearly."
  },
  {
    id: "summary",
    title: "Summary",
    description: "Compact overview of the essentials.",
    prompt: "Write a compact summary of my materials. Cover the key ideas, structure it with headings, and highlight what's essential vs. supporting detail."
  },
  {
    id: "quiz",
    title: "Quiz me",
    description: "Test yourself with generated questions.",
    prompt: "Generate a short quiz (5 questions) covering the most important concepts in my materials. Mix multiple-choice and short-answer."
  },
  {
    id: "flashcards",
    title: "Flashcards",
    description: "Bite-sized Q/A pairs for spaced repetition.",
    prompt: "Create 10 flashcards from my materials in Q → A format. Keep each answer under two sentences."
  },
  {
    id: "concept-map",
    title: "Concept map",
    description: "Structured tree of ideas and dependencies.",
    prompt: "Draw a concept map (as an indented tree) of the topics in my materials, showing which ideas depend on which."
  },
  {
    id: "walkthrough",
    title: "Step-by-step",
    description: "Walk me through the hardest topic slowly.",
    prompt: "Pick the hardest concept in my materials and explain it step by step, from first principles. Assume I'm new to it."
  }
];

interface Props {
  readonly profile: Profile | null;
  readonly currentAssignment?: Assignment | null;
  readonly hasAssignments?: boolean;
  readonly onPick: (prompt: string) => void;
  readonly onOpenCreateAssignment?: () => void;
  readonly onOpenMaterialPreview?: (materialId: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function StudyMenu({ profile, currentAssignment = null, hasAssignments = true, onPick, onOpenCreateAssignment, onOpenMaterialPreview }: Props) {
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const openMaterial = (material: Material) => {
    if (onOpenMaterialPreview !== undefined) {
      onOpenMaterialPreview(material.id);
    } else {
      setPreviewMaterial(material);
    }
  };

  const allTags = currentAssignment === null
    ? []
    : Array.from(new Set(currentAssignment.materials.flatMap((material) => material.tags))).sort();

  const filteredMaterials = currentAssignment === null
    ? []
    : activeTag === null
      ? currentAssignment.materials
      : currentAssignment.materials.filter((material) => material.tags.includes(activeTag));
  const greeting = currentAssignment !== null
    ? `Ready to work on ${currentAssignment.title}?`
    : profile !== null
      ? `Welcome back, ${COLOR_LABEL[profile.primary]} learner.`
      : "Welcome.";

  const subtitle = currentAssignment !== null
    ? currentAssignment.description.length > 0
      ? currentAssignment.description
      : "Pick a study method below, or type your own question."
    : hasAssignments
      ? "Pick an assignment above to scope the session, then choose a method."
      : "Create an assignment above to get started. Each one keeps its own materials and progress.";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <article className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-rose-500 font-black text-white">
          P
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sky-400 text-xs uppercase tracking-widest">ProxusIA</p>
          <h2 className="mt-1 font-semibold text-2xl text-slate-100 leading-snug md:text-3xl">
            {greeting}
          </h2>
          <p className="mt-2 text-slate-300">{subtitle}</p>
          {!hasAssignments && onOpenCreateAssignment !== undefined && (
            <button
              type="button"
              onClick={onOpenCreateAssignment}
              className="mt-4 rounded-full bg-sky-500 px-6 py-2.5 font-bold text-slate-950 tracking-wide shadow-lg shadow-sky-500/20 transition hover:bg-sky-400"
            >
              Create your first assignment
            </button>
          )}
        </div>
      </article>

      {currentAssignment !== null && currentAssignment.materials.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Materials in this assignment
            </h3>
            <span className="text-slate-500 text-xs">
              {filteredMaterials.length} of {currentAssignment.materials.length}
            </span>
          </div>

          {allTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className={`rounded-full border px-3 py-0.5 text-xs transition ${
                  activeTag === null
                    ? "border-sky-400 bg-sky-500/15 text-sky-100"
                    : "border-slate-700 text-slate-400 hover:border-sky-500 hover:text-sky-200"
                }`}
              >
                All
              </button>
              {allTags.map((tag) => {
                const active = tag === activeTag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(active ? null : tag)}
                    className={`rounded-full border px-3 py-0.5 text-xs transition ${
                      active
                        ? "border-sky-400 bg-sky-500/15 text-sky-100"
                        : "border-slate-700 text-slate-400 hover:border-sky-500 hover:text-sky-200"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}

          <ul className="mt-3 grid gap-1.5">
            {filteredMaterials.map((material) => (
              <li key={material.id}>
                <button
                  type="button"
                  onClick={() => openMaterial(material)}
                  className="flex w-full items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-left transition hover:border-sky-400 focus-visible:border-sky-400 focus-visible:outline-none"
                >
                  <div className="min-w-0">
                    <p className="truncate text-slate-100 text-sm">{material.name}</p>
                    {material.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {material.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-800 px-1.5 py-0.5 text-slate-400 text-[10px]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-slate-500 text-xs">{formatSize(material.sizeBytes)}</span>
                    <span className="text-sky-400 text-xs">Preview →</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {filteredMaterials.length === 0 && (
            <p className="mt-3 text-slate-500 text-sm">No materials with that tag.</p>
          )}
        </section>
      )}

      {previewMaterial !== null && (
        <PdfPreviewModal material={previewMaterial} onClose={() => setPreviewMaterial(null)} />
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CORE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onPick(option.prompt)}
            className="group flex flex-col items-start gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left transition hover:border-sky-400 hover:bg-slate-900 focus-visible:border-sky-400 focus-visible:outline-none"
          >
            <span className="font-semibold text-slate-100">{option.title}</span>
            <span className="text-sm text-slate-400">{option.description}</span>
          </button>
        ))}
      </div>

      {profile !== null && (
        <section className="mt-10">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Tuned for your {COLOR_LABEL[profile.primary]} profile
          </h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {COLOR_METHODS[profile.primary].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => onPick(`Use "${method}" to help me study my materials. Design a short session that fits that method.`)}
                className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left transition hover:border-sky-400 focus-visible:border-sky-400 focus-visible:outline-none"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r opacity-10 transition group-hover:opacity-20 ${COLOR_GRADIENT[profile.primary]}`}
                />
                <span className="relative text-sm font-semibold text-slate-100">{method}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
