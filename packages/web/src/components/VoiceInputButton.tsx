import { Mic, MicOff } from "lucide-react";
import { useSpeechRecognition } from "../lib/useSpeechRecognition.ts";

interface Props {
  readonly lang?: string;
  readonly onFinalTranscript: (text: string) => void;
  readonly onInterimTranscript?: (text: string) => void;
  readonly title?: string;
  readonly size?: "sm" | "md";
}

/**
 * Reusable mic button that pushes recognized text upward.
 * Hidden if Web Speech API not supported (Firefox, older Safari).
 */
export function VoiceInputButton({
  lang,
  onFinalTranscript,
  onInterimTranscript,
  title = "Dictar por voz",
  size = "md"
}: Props) {
  const { supported, listening, error, toggle } = useSpeechRecognition({
    ...(lang !== undefined ? { lang } : {}),
    onTranscript: (text, isFinal) => {
      if (isFinal) onFinalTranscript(text);
      else onInterimTranscript?.(text);
    }
  });

  if (!supported) return null;

  const dim = size === "sm" ? "size-7" : "size-9";
  const iconSize = size === "sm" ? 14 : 18;
  const Icon = listening ? MicOff : Mic;

  return (
    <button
      type="button"
      onClick={toggle}
      title={error !== null ? `Error: ${error}` : listening ? "Detener dictado" : title}
      aria-label={listening ? "Detener dictado por voz" : "Iniciar dictado por voz"}
      aria-pressed={listening}
      className={`${dim} grid shrink-0 place-items-center rounded-full border transition ${
        listening
          ? "animate-pulse border-rose-400 bg-rose-500/20 text-rose-300"
          : "border-slate-700 bg-slate-900 text-slate-400 hover:border-sky-400 hover:text-sky-300"
      }`}
    >
      <Icon size={iconSize} strokeWidth={1.8} aria-hidden />
    </button>
  );
}
