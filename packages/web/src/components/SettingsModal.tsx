import { useState } from "react";
import { createPortal } from "react-dom";
import { useSettings } from "../domain/settings/hooks.ts";
import { CVD_LABEL, type Cvd } from "../domain/settings/types.ts";

const CVD_OPTIONS: ReadonlyArray<Cvd> = ["none", "deutan", "protan", "tritan"];

interface Props {
  readonly onClose: () => void;
  readonly onRetakeTest?: () => void;
  readonly hasProfile?: boolean;
}

export function SettingsModal({ onClose, onRetakeTest, hasProfile = false }: Props) {
  const [settings, setSettings] = useSettings();
  const [name, setName] = useState(settings.name);
  const [cvd, setCvd] = useState<Cvd>(settings.cvd);
  const [disablePersonalityAdaptation, setDisablePersonalityAdaptation] = useState(
    settings.disablePersonalityAdaptation
  );

  const save = () => {
    setSettings({ name: name.trim(), cvd, disablePersonalityAdaptation });
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Ajustes de perfil"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 font-bold text-slate-100 text-lg">Perfil y accesibilidad</h2>
        <p className="mb-5 text-slate-400 text-sm">Se guarda solo en este navegador.</p>

        <label className="mb-4 block">
          <span className="mb-1.5 block font-semibold text-slate-300 text-sm">Nombre</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Tu nombre"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 text-sm outline-none focus:border-sky-400"
            maxLength={40}
          />
        </label>

        <fieldset className="mb-6">
          <legend className="mb-2 font-semibold text-slate-300 text-sm">Modo daltónico</legend>
          <div className="grid gap-1.5">
            {CVD_OPTIONS.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition ${
                  cvd === option
                    ? "border-sky-500 bg-sky-950/40 text-slate-100"
                    : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="cvd"
                  value={option}
                  checked={cvd === option}
                  onChange={() => setCvd(option)}
                  className="accent-sky-500"
                />
                <span>{CVD_LABEL[option]}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-slate-500 text-xs">
            Cambia la paleta de personalidad para separar mejor los colores. Además cada color añade un símbolo (▲ ● ■ ◆).
          </p>
        </fieldset>

        <fieldset className="mb-6">
          <legend className="mb-2 font-semibold text-slate-300 text-sm">Adaptación por personalidad</legend>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
              disablePersonalityAdaptation
                ? "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600"
                : "border-sky-500 bg-sky-950/40 text-slate-100"
            }`}
          >
            <input
              type="checkbox"
              checked={!disablePersonalityAdaptation}
              onChange={(e) => setDisablePersonalityAdaptation(!e.currentTarget.checked)}
              className="mt-0.5 accent-sky-500"
            />
            <span>
              <span className="block font-semibold">Adaptar tutor y sesiones a mi color</span>
              <span className="mt-0.5 block text-slate-400 text-xs">
                Ajusta el tono del tutor (más directo, socrático, riguroso, etc.), la duración del cronómetro y el número de tarjetas de repaso según tu resultado en el test de personalidad. Desactívalo para usar valores neutros.
              </span>
            </span>
          </label>
        </fieldset>

        {onRetakeTest !== undefined && (
          <fieldset className="mb-6">
            <legend className="mb-2 font-semibold text-slate-300 text-sm">Test de personalidad</legend>
            <button
              type="button"
              onClick={onRetakeTest}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-left text-sm transition hover:border-sky-500 hover:bg-slate-950"
            >
              <span>
                <span className="block font-semibold text-slate-100">
                  {hasProfile ? "Rehacer el test" : "Hacer el test"}
                </span>
                <span className="mt-0.5 block text-slate-400 text-xs">
                  {hasProfile
                    ? "Reinicia tu color de personalidad y recalcula la adaptación del tutor."
                    : "Contesta 3 minutos de preguntas para desbloquear la adaptación por color."}
                </span>
              </span>
              <span className="shrink-0 text-sky-300">→</span>
            </button>
          </fieldset>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 text-sm transition hover:border-slate-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-sky-500 px-5 py-2 font-bold text-slate-950 text-sm transition hover:bg-sky-400"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
