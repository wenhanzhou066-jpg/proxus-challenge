import { useEffect, useRef, useState } from "react";

interface Props {
  readonly totalSeconds: number;
  /** If true, auto-fires onSubmit when timer hits zero */
  readonly hardStop: boolean;
  /** User can pause the countdown */
  readonly allowPause?: boolean;
  /** Called when user hits Done, or timer auto-submits (hardStop) */
  readonly onSubmit: (text: string) => void;
  readonly placeholder?: string;
}

function formatClock(totalMs: number): string {
  const s = Math.max(0, Math.ceil(totalMs / 1000));
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = (s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function FeynmanTimer({
  totalSeconds,
  hardStop,
  allowPause = true,
  onSubmit,
  placeholder = "Explain in your own words — as if teaching a curious 12-year-old."
}: Props) {
  const [text, setText] = useState("");
  const [remainingMs, setRemainingMs] = useState(totalSeconds * 1000);
  const [paused, setPaused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const lastTickRef = useRef<number | null>(null);
  const textRef = useRef(text);
  textRef.current = text;

  // Countdown loop (rAF-based, cheaper than setInterval)
  useEffect(() => {
    if (submitted || paused) {
      lastTickRef.current = null;
      return;
    }
    let raf = 0;
    const tick = (t: number) => {
      if (lastTickRef.current === null) lastTickRef.current = t;
      const dt = t - lastTickRef.current;
      lastTickRef.current = t;
      setRemainingMs((prev) => {
        const next = prev - dt;
        if (next <= 0 && hardStop && !submitted) {
          // fire on the next microtask so React state settles first
          queueMicrotask(() => {
            setSubmitted(true);
            onSubmit(textRef.current);
          });
          return 0;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, submitted, hardStop, onSubmit]);

  const clock = formatClock(Math.max(0, remainingMs));
  const overtime = remainingMs < 0;

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className={`font-mono text-sm tabular-nums ${overtime ? "text-amber-300" : "text-slate-300"}`}>
          {overtime ? `+${clock}` : clock}
        </span>
        <div className="flex items-center gap-1.5">
          {allowPause && !submitted && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="rounded-md border border-slate-700 px-2 py-0.5 text-slate-300 text-xs hover:border-sky-400"
            >
              {paused ? "Resume" : "Pause"}
            </button>
          )}
          <button
            type="button"
            disabled={submitted || text.trim().length === 0}
            onClick={() => {
              setSubmitted(true);
              onSubmit(text);
            }}
            className="rounded-md bg-sky-500 px-3 py-0.5 font-semibold text-slate-950 text-xs transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            Done
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        disabled={submitted}
        rows={5}
        placeholder={placeholder}
        className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 text-sm outline-none focus:border-sky-400 disabled:opacity-70"
      />
    </div>
  );
}
