import type { Assignment } from "../domain/assignments/types.ts";
import type { Profile } from "../domain/personality/types.ts";
import { COLOR_LABEL, COLOR_METHODS, getColorGradient } from "../domain/personality/types.ts";
import { useSettings } from "../domain/settings/hooks.ts";
import { getStrategy } from "../domain/personality/strategy.ts";


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
}

export function StudyMenu({ profile, currentAssignment = null, hasAssignments = true, onPick, onOpenCreateAssignment }: Props) {
  const [{ cvd, disablePersonalityAdaptation }] = useSettings();

  const strategy = getStrategy(profile, disablePersonalityAdaptation);

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
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950">
          <img src="/proxus-mark.webp" alt="" aria-hidden className="h-7 w-7 object-contain" />
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
