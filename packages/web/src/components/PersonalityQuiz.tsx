import { useEffect, useMemo, useState } from "react";
import { TETRADS } from "../domain/personality/questions.ts";
import { score } from "../domain/personality/scoring.ts";
import { saveProfile } from "../domain/personality/storage.ts";
import {
  COLOR_GRADIENT,
  COLOR_HEX,
  COLOR_LABEL,
  COLOR_METHODS,
  COLOR_TRAIT,
  type Answer,
  type Color,
  type Profile
} from "../domain/personality/types.ts";

const COLORS: ReadonlyArray<Color> = ["R", "Y", "G", "B"];

function shuffle<T>(items: ReadonlyArray<T>, seed: number): Array<T> {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

interface Props {
  onComplete: (profile: Profile) => void;
  onSkip: () => void;
}

type Step = "most" | "least";

export function PersonalityQuiz({ onComplete, onSkip }: Props) {
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState<Step>("most");
  const [answers, setAnswers] = useState<Array<Answer>>(() =>
    TETRADS.map((t) => ({ blockId: t.id, most: null, least: null }))
  );
  const [result, setResult] = useState<Profile | null>(null);
  const [fade, setFade] = useState(true);

  const orderPerBlock = useMemo(
    () => TETRADS.map((t) => shuffle(COLORS, t.id * 17)),
    []
  );

  const tetrad = TETRADS[idx]!;
  const order = orderPerBlock[idx]!;
  const answer = answers[idx]!;

  function advance() {
    setFade(false);
    window.setTimeout(() => {
      if (step === "most") {
        setStep("least");
      } else if (idx < TETRADS.length - 1) {
        setIdx(idx + 1);
        setStep("most");
      } else {
        const profile = score(answers);
        saveProfile(profile);
        setResult(profile);
      }
      setFade(true);
    }, 140);
  }

  function pick(color: Color) {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx]!, [step]: color };
      return next;
    });
    advance();
  }

  function goBack() {
    setFade(false);
    window.setTimeout(() => {
      if (step === "least") {
        setStep("most");
      } else if (idx > 0) {
        setIdx(idx - 1);
        setStep("least");
      }
      setFade(true);
    }, 140);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (result !== null) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) {
        const visible = step === "most" ? order : order.filter((c) => c !== answer.most);
        const color = visible[n - 1];
        if (color !== undefined) pick(color);
      } else if (e.key === "Backspace" || e.key === "ArrowLeft") {
        if (idx > 0 || step === "least") goBack();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (result !== null) {
    return <ResultScreen profile={result} onContinue={() => onComplete(result)} />;
  }

  const visible = step === "most" ? order : order.filter((c) => c !== answer.most);
  const totalSteps = TETRADS.length * 2;
  const currentStep = idx * 2 + (step === "most" ? 0 : 1);
  const progressPct = Math.round((currentStep / totalSteps) * 100);
  const canGoBack = idx > 0 || step === "least";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="relative border-b border-slate-900 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={goBack}
            disabled={!canGoBack}
            className="text-sm text-slate-500 transition hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ← Back
          </button>
          <span className="font-mono text-xs uppercase tracking-widest text-slate-500">
            {idx + 1} / {TETRADS.length}
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-slate-500 underline transition hover:text-slate-200"
          >
            Skip
          </button>
        </div>
        <div className="h-1 bg-slate-900">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-6 py-10">
        <div
          className={`w-full max-w-2xl transition-all duration-150 ${
            fade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <p className="text-center text-xs uppercase tracking-[0.3em] text-slate-500">
            Scenario {idx + 1}
          </p>
          <h1 className="mt-4 text-center text-2xl font-semibold leading-snug text-slate-100 sm:text-3xl">
            {tetrad.prompt}
          </h1>
          <p className="mt-6 text-center text-base text-slate-400">
            {step === "most" ? (
              <>
                Which response is{" "}
                <span className="font-bold text-emerald-400">most</span> like you?
              </>
            ) : (
              <>
                Which is{" "}
                <span className="font-bold text-rose-400">least</span> like you?
              </>
            )}
          </p>
          <p className="mt-1 text-center text-xs text-slate-600">
            Tap a card — or press 1–4
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {visible.map((color, i) => {
              const accent = step === "most"
                ? "hover:border-emerald-500/60 hover:bg-emerald-500/5"
                : "hover:border-rose-500/60 hover:bg-rose-500/5";
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => pick(color)}
                  className={`group flex min-h-[7rem] items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-6 text-left transition hover:scale-[1.02] hover:shadow-xl ${accent}`}
                >
                  <span className="font-mono text-xs text-slate-600 group-hover:text-slate-400">
                    {i + 1}
                  </span>
                  <p className="text-base font-medium leading-snug text-slate-100 sm:text-lg">
                    {tetrad.options[color]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

interface ResultProps {
  profile: Profile;
  onContinue: () => void;
}

function ResultScreen({ profile, onContinue }: ResultProps) {
  return (
    <div className="relative min-h-screen overflow-y-auto bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b opacity-20 ${COLOR_GRADIENT[profile.primary]}`}
        />
        <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-slate-950/0 to-slate-950" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Your profile</p>
        <h1 className="mt-3 text-6xl font-black sm:text-7xl">
          <span
            className={`bg-gradient-to-r bg-clip-text text-transparent ${COLOR_GRADIENT[profile.primary]}`}
          >
            {COLOR_LABEL[profile.primary]}
          </span>
        </h1>
        <p className="mt-2 text-2xl font-semibold text-slate-200">
          {COLOR_TRAIT[profile.primary]}
          {profile.secondary !== null && (
            <>
              {" "}
              <span className="text-slate-500">with</span>{" "}
              <span style={{ color: COLOR_HEX[profile.secondary] }}>
                {COLOR_LABEL[profile.secondary]}
              </span>
            </>
          )}
        </p>

        <section className="mt-12">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            Your profile mix
          </h2>
          <div className="space-y-4">
            {COLORS.map((color) => (
              <div key={color}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-semibold" style={{ color: COLOR_HEX[color] }}>
                    {COLOR_LABEL[color]} · {COLOR_TRAIT[color]}
                  </span>
                  <span className="font-mono text-slate-400">{profile.percent[color]}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-800/80">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r transition-all ${COLOR_GRADIENT[color]}`}
                    style={{ width: `${profile.percent[color]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Recommended study methods
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Tuned for {COLOR_LABEL[profile.primary]} learners.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {COLOR_METHODS[profile.primary].map((method) => (
              <div
                key={method}
                className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r opacity-10 transition group-hover:opacity-20 ${COLOR_GRADIENT[profile.primary]}`}
                />
                <span className="relative text-sm font-semibold text-slate-100">{method}</span>
              </div>
            ))}
          </div>
          {profile.secondary !== null && (
            <p className="mt-4 text-xs text-slate-500">
              Also worth trying (from your {COLOR_LABEL[profile.secondary]} side):{" "}
              <span className="text-slate-300">
                {COLOR_METHODS[profile.secondary].slice(0, 2).join(" · ")}
              </span>
            </p>
          )}
        </section>

        <button
          type="button"
          onClick={onContinue}
          className="mt-10 w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500 px-6 py-4 text-base font-bold text-white shadow-2xl shadow-fuchsia-500/30 transition hover:scale-[1.02]"
        >
          Start studying →
        </button>
      </div>
    </div>
  );
}
