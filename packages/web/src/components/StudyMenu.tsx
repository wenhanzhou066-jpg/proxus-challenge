import { useState } from "react";
import type { Assignment, Material } from "../domain/assignments/types.ts";
import type { Profile } from "../domain/personality/types.ts";
import { COLOR_LABEL, COLOR_METHODS, getColorGradient } from "../domain/personality/types.ts";
import { useSettings } from "../domain/settings/hooks.ts";
import { getStrategy } from "../domain/personality/strategy.ts";
import { usePrecomputeAnalysis, usePrecomputeStatus } from "../domain/precompute/hooks.ts";
import { precomputeMaterial } from "../domain/precompute/service.ts";
import { PdfPreviewModal } from "./PdfPreviewModal.tsx";
import { ReviewQueue } from "./ReviewQueue.tsx";


interface StudyOption {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly prompt: string;
}

const CORE_OPTIONS: ReadonlyArray<StudyOption> = [
  {
    id: "schema",
    title: "Esquema / Diagrama",
    description: "Mapa visual de los conceptos clave y cómo se conectan.",
    prompt: "Construye un diagrama en formato esquema de los conceptos principales de mis materiales. Usa un árbol o tabla ASCII/markdown que muestre la jerarquía y las relaciones con claridad."
  },
  {
    id: "summary",
    title: "Resumen",
    description: "Visión compacta de lo esencial.",
    prompt: "Escribe un resumen compacto de mis materiales. Cubre las ideas clave, estructúralo con encabezados y destaca lo esencial frente al detalle de apoyo."
  },
  {
    id: "quiz",
    title: "Ponme un cuestionario",
    description: "Ponte a prueba con preguntas generadas.",
    prompt: "Genera un cuestionario corto (5 preguntas) que cubra los conceptos más importantes de mis materiales. Mezcla opción múltiple y respuesta corta."
  },
  {
    id: "flashcards",
    title: "Tarjetas",
    description: "Pares breves pregunta/respuesta para repetición espaciada.",
    prompt: "Crea 10 tarjetas a partir de mis materiales en formato P → R. Mantén cada respuesta en menos de dos frases."
  },
  {
    id: "concept-map",
    title: "Mapa conceptual",
    description: "Árbol estructurado de ideas y dependencias.",
    prompt: "Dibuja un mapa conceptual (como árbol indentado) de los temas de mis materiales, mostrando qué ideas dependen de cuáles."
  },
  {
    id: "walkthrough",
    title: "Paso a paso",
    description: "Explícame despacio el tema más difícil.",
    prompt: "Elige el concepto más difícil de mis materiales y explícamelo paso a paso, desde primeros principios. Asume que es nuevo para mí."
  }
];

interface Props {
  readonly profile: Profile | null;
  readonly currentAssignment?: Assignment | null;
  readonly hasAssignments?: boolean;
  readonly onPick: (prompt: string) => void;
  readonly onOpenCreateAssignment?: () => void;
  readonly onOpenMaterialPreview?: (materialId: string) => void;
  readonly onStartSession?: (materialId: string, questionIds?: ReadonlyArray<string>) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function StudyMenu({ profile, currentAssignment = null, hasAssignments = true, onPick, onOpenCreateAssignment, onOpenMaterialPreview, onStartSession }: Props) {
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [{ cvd, disablePersonalityAdaptation }] = useSettings();

  const strategy = getStrategy(profile, disablePersonalityAdaptation);

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
    ? `¿Listo para trabajar en ${currentAssignment.title}?`
    : profile !== null
      ? `Bienvenido de nuevo, perfil ${COLOR_LABEL[profile.primary]}.`
      : "Bienvenido.";

  const subtitle = currentAssignment !== null
    ? currentAssignment.description.length > 0
      ? currentAssignment.description
      : strategy.tagline
    : hasAssignments
      ? "Elige una tarea arriba para acotar la sesión y luego escoge un método."
      : "Crea una tarea arriba para empezar. Cada una guarda sus propios materiales y progreso.";

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
              Crea tu primera tarea
            </button>
          )}
        </div>
      </article>

      {currentAssignment !== null && currentAssignment.materials.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Materiales de esta tarea
            </h3>
            <span className="text-slate-500 text-xs">
              {filteredMaterials.length} de {currentAssignment.materials.length}
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
                Todos
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
              <MaterialRow
                key={material.id}
                material={material}
                onPreview={() => openMaterial(material)}
                ctaLabel={strategy.ctaLabel}
                {...(onStartSession !== undefined ? { onStartSession: () => onStartSession(material.id) } : {})}
              />
            ))}
          </ul>

          {filteredMaterials.length === 0 && (
            <p className="mt-3 text-slate-500 text-sm">No hay materiales con esa etiqueta.</p>
          )}
        </section>
      )}

      {/* ── Learn actively ── */}
      {currentAssignment !== null && currentAssignment.materials.length > 0 && onStartSession !== undefined && (
        <section className="mt-6 grid gap-3">
          <ReviewQueue
            materials={currentAssignment.materials}
            onStartReview={(materialId, questionIds) => onStartSession(materialId, questionIds)}
          />
        </section>
      )}

      {previewMaterial !== null && (
        <PdfPreviewModal material={previewMaterial} onClose={() => setPreviewMaterial(null)} />
      )}

      <div className="mt-8 grid gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Chat rápido</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>

      {profile !== null && (
        <section className="mt-10">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Ajustado para tu perfil {COLOR_LABEL[profile.primary]}
          </h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {COLOR_METHODS[profile.primary].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => onPick(`Usa "${method}" para ayudarme a estudiar mis materiales. Diseña una sesión corta que encaje con ese método.`)}
                className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-left transition hover:border-sky-400 focus-visible:border-sky-400 focus-visible:outline-none"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r opacity-10 transition group-hover:opacity-20 ${getColorGradient(profile.primary, cvd)}`}
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

/* ── Material row with precompute badge + start-session button ── */

interface MaterialRowProps {
  readonly material: Material;
  readonly onPreview: () => void;
  readonly onStartSession?: () => void;
  readonly ctaLabel: string;
}

function MaterialRow({ material, onPreview, onStartSession, ctaLabel }: MaterialRowProps) {
  const status = usePrecomputeStatus(material.id);
  const analysis = usePrecomputeAnalysis(material.id);
  const questionCount = analysis?.questions.length ?? 0;

  return (
    <li className="grid gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onPreview}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-slate-100 text-sm hover:underline">{material.name}</p>
          {material.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {material.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-800 px-1.5 py-0.5 text-slate-400 text-[10px]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </button>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-slate-500 text-xs">{formatSize(material.sizeBytes)}</span>
          <StatusBadge status={status.kind} onRetry={() => precomputeMaterial(material, { force: true })} />
        </span>
      </div>

      {onStartSession !== undefined && status.kind === "ready" && questionCount > 0 && (
        <div className="flex items-center justify-between border-slate-800 border-t pt-2">
          <span className="text-slate-500 text-xs">{questionCount} preguntas conceptuales listas</span>
          <button
            type="button"
            onClick={onStartSession}
            className="rounded-full bg-sky-500 px-3 py-1 font-semibold text-slate-950 text-xs transition hover:bg-sky-400"
          >
            {ctaLabel} →
          </button>
        </div>
      )}
    </li>
  );
}

function StatusBadge({ status, onRetry }: { status: "idle" | "running" | "ready" | "failed"; onRetry: () => void }) {
  if (status === "ready") {
    return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300 text-[10px] uppercase">Listo</span>;
  }
  if (status === "running") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 font-semibold text-sky-300 text-[10px] uppercase">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300" />
        Analizando
      </span>
    );
  }
  if (status === "failed") {
    return (
      <button
        type="button"
        onClick={onRetry}
        title="Reintentar análisis"
        className="rounded-full bg-rose-500/15 px-2 py-0.5 font-semibold text-rose-300 text-[10px] uppercase hover:bg-rose-500/25"
      >
        Reintentar
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onRetry}
      className="rounded-full bg-slate-800 px-2 py-0.5 font-semibold text-slate-400 text-[10px] uppercase hover:bg-slate-700"
    >
      Analizar
    </button>
  );
}
