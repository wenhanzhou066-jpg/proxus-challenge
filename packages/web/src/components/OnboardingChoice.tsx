import type { UserMode } from "../domain/personality/types.ts";
import { useSettings } from "../domain/settings/hooks.ts";
import { CVD_LABEL, type Cvd } from "../domain/settings/types.ts";

const CVD_OPTIONS: ReadonlyArray<Cvd> = ["none", "deutan", "protan", "tritan"];

interface Props {
  onChoose: (mode: UserMode) => void;
}

export function OnboardingChoice({ onChoose }: Props) {
  const [settings, setSettings] = useSettings();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/95 p-6 backdrop-blur">
      <div className="relative w-full max-w-4xl">
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-fuchsia-500/20 to-emerald-500/20 blur-3xl" />
        <div className="relative rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl sm:p-12">
          <div className="mb-8 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">Bienvenida</p>
            <h1 className="mt-3 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
              ¿Cómo quieres estudiar?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Elige tu camino. Puedes cambiarlo cuando quieras desde ajustes.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <ModeCard
              title="Modo libre"
              subtitle="Explora por tu cuenta"
              description="Entra directamente en la app. Elige tú las herramientas: tarjetas, exámenes, resúmenes, chat con el tutor."
              gradient="from-slate-700 via-slate-600 to-slate-500"
              badge="Control total"
              onClick={() => onChoose("free")}
            />
            <ModeCard
              title="Guiado por personalidad"
              subtitle="Test rápido de 3 min"
              description="Haz un test de colores rápido. Te recomendaremos métodos de estudio que encajen con tu forma de aprender — exámenes, tarjetas, resúmenes y más."
              gradient="from-indigo-500 via-fuchsia-500 to-rose-500"
              badge="Recomendado"
              onClick={() => onChoose("guided")}
              highlight
            />
          </div>

          <section
            className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
            aria-labelledby="cvd-heading"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 id="cvd-heading" className="font-bold text-slate-100 text-base">
                  Accesibilidad · Filtro daltónico
                </h2>
                <p className="mt-1 text-slate-400 text-xs">
                  Ajusta la paleta si tienes daltonismo. Los símbolos ▲ ● ■ ◆ acompañan a cada color.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Opcional
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CVD_OPTIONS.map((option) => {
                const active = settings.cvd === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSettings({ ...settings, cvd: option })}
                    aria-pressed={active}
                    className={`rounded-full border px-4 py-1.5 text-sm transition ${
                      active
                        ? "border-sky-400 bg-sky-500/15 text-sky-200"
                        : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {CVD_LABEL[option]}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-slate-500 text-xs">
              Podrás cambiarlo luego desde tu perfil en la barra lateral.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

interface CardProps {
  title: string;
  subtitle: string;
  description: string;
  gradient: string;
  badge: string;
  onClick: () => void;
  highlight?: boolean;
}

function ModeCard({ title, subtitle, description, gradient, badge, onClick, highlight }: CardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border p-6 text-left transition hover:scale-[1.02] hover:shadow-xl ${
        highlight
          ? "border-fuchsia-500/40 bg-slate-900"
          : "border-slate-700 bg-slate-900/60"
      }`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br opacity-10 transition group-hover:opacity-25 ${gradient}`}
      />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {subtitle}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              highlight
                ? "bg-fuchsia-500/20 text-fuchsia-300"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {badge}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{description}</p>
        <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
          Elegir
          <span className="transition group-hover:translate-x-1">→</span>
        </div>
      </div>
    </button>
  );
}
