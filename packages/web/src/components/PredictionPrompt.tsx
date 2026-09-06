import { useState } from "react";
import { VoiceInputButton } from "./VoiceInputButton.tsx";

interface Props {
  readonly prompt: string;
  readonly onCommit: (prediction: string) => void;
  readonly minChars?: number;
}

/**
 * Forces user to type a prediction before revealing the next content.
 * Small friction, big pedagogical win — activates prior knowledge.
 */
export function PredictionPrompt({ prompt, onCommit, minChars = 15 }: Props) {
  const [text, setText] = useState("");
  const ready = text.trim().length >= minChars;

  return (
    <section className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="font-semibold text-slate-200 text-sm">
        <span className="mr-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300 text-xs uppercase tracking-wider">Predict</span>
        {prompt}
      </p>
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          rows={3}
          placeholder="Take a guess — anything is fine. This isn't graded."
          className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-11 text-slate-100 text-sm outline-none focus:border-amber-400"
        />
        <div className="absolute right-1.5 bottom-1.5">
          <VoiceInputButton
            size="sm"
            onFinalTranscript={(chunk) => setText((prev) => prev.length === 0 ? chunk : `${prev}${prev.endsWith(" ") ? "" : " "}${chunk}`)}
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-xs">
          {ready ? "Ready" : `${minChars - text.trim().length} more chars`}
        </span>
        <button
          type="button"
          disabled={!ready}
          onClick={() => onCommit(text.trim())}
          className="rounded-full bg-amber-500 px-4 py-1.5 font-semibold text-slate-950 text-xs transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          Reveal question →
        </button>
      </div>
    </section>
  );
}
