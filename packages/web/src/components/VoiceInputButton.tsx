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

  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconDim = size === "sm" ? "size-4" : "size-5";

  return (
    <button
      type="button"
      onClick={toggle}
      title={error !== null ? `Error: ${error}` : listening ? "Detener dictado" : title}
      aria-label={listening ? "Detener dictado por voz" : "Iniciar dictado por voz"}
      aria-pressed={listening}
      className={`${dim} flex shrink-0 items-center justify-center rounded-full border transition ${
        listening
          ? "animate-pulse border-red-400 bg-red-500/20 text-red-300"
          : "border-slate-700 bg-slate-900 text-slate-400 hover:border-sky-400 hover:text-sky-300"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={iconDim} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </button>
  );
}
