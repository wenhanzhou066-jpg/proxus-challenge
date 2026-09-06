import { useMemo, useState } from "react";
import type { ConceptualQuestion } from "@proxus/shared";
import { gradeExplanation, type GradeResult } from "../domain/precompute/grade.ts";
import { recordOutcome } from "../domain/precompute/srs.ts";
import type { StudyStrategy } from "../domain/personality/strategy.ts";
import { FeynmanTimer } from "./FeynmanTimer.tsx";
import { PredictionPrompt } from "./PredictionPrompt.tsx";

interface Props {
  readonly materialId: string;
  readonly materialName: string;
  readonly questions: ReadonlyArray<ConceptualQuestion>;
  readonly strategy: StudyStrategy;
  readonly onEscape?: (question: ConceptualQuestion, userAttempt: string) => void;
  readonly onExit: () => void;
}

type Phase = "predict" | "question" | "feynman" | "graded";

export function StudySession({ materialId, materialName, questions, strategy, onEscape, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(strategy.requirePrediction ? "predict" : "question");
  const [revealedHints, setRevealedHints] = useState(strategy.hintsUpFront);
  const [prediction, setPrediction] = useState("");
  const [attempt, setAttempt] = useState("");
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [correctOverride, setCorrectOverride] = useState<boolean | null>(null);

  const question = questions[index];
  const totalHints = question?.guidingHints.length ?? 0;
  const passed = useMemo(() => {
    if (correctOverride !== null) return correctOverride;
    return (grade?.coverage ?? 0) >= strategy.passThreshold;
  }, [grade, strategy.passThreshold, correctOverride]);

  const goToQuestion = (nextIdx: number) => {
    setIndex(nextIdx);
    setPhase(strategy.requirePrediction ? "predict" : "question");
    setRevealedHints(strategy.hintsUpFront);
    setPrediction("");
    setAttempt("");
    setGrade(null);
    setCorrectOverride(null);
  };

  if (question === undefined) {
    return (
      <section className="mx-auto grid max-w-2xl gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
        <h3 className="font-bold text-slate-100 text-xl">Session complete</h3>
        <p className="text-slate-400 text-sm">All questions reviewed. Come back tomorrow — SRS will surface what's due.</p>
        <button
          type="button"
          onClick={onExit}
          className="mx-auto rounded-full bg-sky-500 px-6 py-2 font-bold text-slate-950 text-sm transition hover:bg-sky-400"
        >
          Back to menu
        </button>
      </section>
    );
  }

  const commitGrade = (result: GradeResult) => {
    setGrade(result);
    setPhase("graded");
    recordOutcome(materialId, question.id, result.coverage >= strategy.passThreshold);
  };

  const overrideOutcome = (correct: boolean) => {
    setCorrectOverride(correct);
    recordOutcome(materialId, question.id, correct);
  };

  return (
    <section className="mx-auto grid w-full max-w-2xl gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="font-bold text-sky-400 text-xs uppercase tracking-widest">Socratic session</p>
          <p className="truncate text-slate-400 text-xs">{materialName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300 text-xs tabular-nums">
            {index + 1} / {questions.length}
          </span>
          <button
            type="button"
            onClick={onExit}
            className="rounded-full border border-slate-700 px-3 py-1 text-slate-300 text-xs hover:border-slate-500"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Predict phase */}
      {phase === "predict" && (
        <PredictionPrompt
          prompt="Before you see the question, jot down what you already think you know about this topic."
          onCommit={(text) => {
            setPrediction(text);
            setPhase("question");
          }}
        />
      )}

      {/* Question + hints */}
      {phase !== "predict" && (
        <article className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="font-semibold text-slate-100 text-lg leading-snug">{question.prompt}</p>

          {prediction.length > 0 && (
            <details className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-400 text-xs">
              <summary className="cursor-pointer">Your prediction</summary>
              <p className="mt-2 whitespace-pre-wrap text-slate-300">{prediction}</p>
            </details>
          )}

          {revealedHints > 0 && (
            <ul className="grid gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              {question.guidingHints.slice(0, revealedHints).map((hint, i) => (
                <li key={i} className="text-amber-200 text-sm">
                  <span className="mr-1.5 font-bold text-amber-400">↳</span>{hint}
                </li>
              ))}
            </ul>
          )}

          {phase === "question" && (
            <div className="flex flex-wrap items-center gap-2">
              {revealedHints < totalHints && (
                <button
                  type="button"
                  onClick={() => setRevealedHints((n) => n + 1)}
                  className="rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-amber-200 text-xs hover:bg-amber-500/20"
                >
                  I'm stuck — hint {revealedHints + 1}/{totalHints}
                </button>
              )}
              <button
                type="button"
                onClick={() => setPhase("feynman")}
                className="rounded-full bg-sky-500 px-4 py-1.5 font-semibold text-slate-950 text-xs transition hover:bg-sky-400"
              >
                Explain it →
              </button>
              {onEscape !== undefined && (
                <button
                  type="button"
                  onClick={() => onEscape(question, attempt)}
                  className="rounded-full border border-slate-700 px-3 py-1 text-slate-400 text-xs hover:border-fuchsia-400 hover:text-fuchsia-300"
                >
                  I'm really stuck (ask tutor)
                </button>
              )}
            </div>
          )}

          {phase === "feynman" && (
            <div className="grid gap-2">
              <p className="text-slate-400 text-xs">
                Teach it back — explain in your own words. Timer is {strategy.feynmanHardStop ? "hard-stop" : "soft"}.
              </p>
              <FeynmanTimer
                totalSeconds={strategy.feynmanSeconds}
                hardStop={strategy.feynmanHardStop}
                onSubmit={(text) => {
                  setAttempt(text);
                  commitGrade(gradeExplanation(text, question.keyPoints));
                }}
              />
            </div>
          )}

          {phase === "graded" && grade !== null && (
            <div className="grid gap-3 border-slate-800 border-t pt-4">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-0.5 font-semibold text-xs ${
                    passed ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {Math.round(grade.coverage * 100)}% coverage — {passed ? "passed" : "review"}
                </span>
                <span className="text-slate-500 text-xs">
                  target ≥ {Math.round(strategy.passThreshold * 100)}%
                </span>
              </div>

              {grade.covered.length > 0 && (
                <div>
                  <p className="mb-1 font-semibold text-emerald-300 text-xs uppercase tracking-wider">Covered</p>
                  <ul className="grid gap-0.5 text-slate-300 text-sm">
                    {grade.covered.map((p, i) => <li key={i}>✓ {p}</li>)}
                  </ul>
                </div>
              )}

              {grade.missing.length > 0 && (
                <div>
                  <p className="mb-1 font-semibold text-rose-300 text-xs uppercase tracking-wider">Missed — go back to these</p>
                  <ul className="grid gap-0.5 text-slate-300 text-sm">
                    {grade.missing.map((p, i) => <li key={i}>✗ {p}</li>)}
                  </ul>
                </div>
              )}

              <details className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-slate-400 text-xs">
                <summary className="cursor-pointer">Your explanation</summary>
                <p className="mt-2 whitespace-pre-wrap text-slate-300">{attempt}</p>
              </details>

              <div className="flex flex-wrap items-center gap-2 border-slate-800 border-t pt-3">
                <span className="text-slate-500 text-xs mr-auto">Grader is approximate — override if needed:</span>
                <button
                  type="button"
                  onClick={() => overrideOutcome(false)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    correctOverride === false
                      ? "border-rose-400 bg-rose-500/15 text-rose-200"
                      : "border-slate-700 text-slate-400 hover:border-rose-500"
                  }`}
                >
                  I missed it
                </button>
                <button
                  type="button"
                  onClick={() => overrideOutcome(true)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    correctOverride === true
                      ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
                      : "border-slate-700 text-slate-400 hover:border-emerald-500"
                  }`}
                >
                  I got it
                </button>
                <button
                  type="button"
                  onClick={() => goToQuestion(index + 1)}
                  className="rounded-full bg-sky-500 px-4 py-1 font-semibold text-slate-950 text-xs transition hover:bg-sky-400"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </article>
      )}
    </section>
  );
}
