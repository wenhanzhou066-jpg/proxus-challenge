import { Pause, Volume2 } from "lucide-react";
import { useSpeechSynthesis } from "../lib/useSpeechSynthesis.ts";

interface Props {
  readonly text: string;
  readonly lang?: string;
}

/**
 * Small speaker toggle. Hidden if browser lacks Web Speech Synthesis.
 */
export function SpeakButton({ text, lang }: Props) {
  const { supported, speaking, toggle } = useSpeechSynthesis({ ...(lang !== undefined ? { lang } : {}) });

  if (!supported) return null;

  const Icon = speaking ? Pause : Volume2;

  return (
    <button
      type="button"
      onClick={() => toggle(text)}
      title={speaking ? "Detener lectura" : "Leer en voz alta"}
      aria-label={speaking ? "Detener lectura" : "Leer respuesta en voz alta"}
      aria-pressed={speaking}
      className={`grid size-7 shrink-0 place-items-center rounded-full border transition ${
        speaking
          ? "animate-pulse border-sky-400 bg-sky-500/15 text-sky-300"
          : "border-slate-700 bg-slate-900 text-slate-400 hover:border-sky-400 hover:text-sky-300"
      }`}
    >
      <Icon size={14} strokeWidth={1.8} aria-hidden />
    </button>
  );
}
