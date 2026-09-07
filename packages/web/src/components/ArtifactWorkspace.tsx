import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type {
  Artifact,
  ArtifactAttempt,
  MultipleChoiceQuestion,
  QuestionCorrection,
  QuizQuestion,
  SubmitAttemptInput,
  TestQuestion
} from "@proxus/shared";
import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { ArrowLeft } from "lucide-react";
import { artifactQuery, submitArtifactAttemptAction } from "../domain/artifacts/atoms.ts";
import { useSettings } from "../domain/settings/hooks.ts";
import { getFeedbackPalette } from "../domain/settings/feedback.ts";
import { FeedbackBadge } from "./FeedbackBadge.tsx";

type Answers = Record<string, string>;

interface ArtifactWorkspaceProps {
  readonly artifactId: string | null;
  readonly onClose?: () => void;
}

export function ArtifactWorkspace({ artifactId, onClose }: ArtifactWorkspaceProps) {
  if (artifactId === null) {
    return <EmptyWorkspace />;
  }

  return <ArtifactDetail artifactId={artifactId} {...(onClose !== undefined ? { onClose } : {})} />;
}

function EmptyWorkspace() {
  return (
    <main className="h-screen min-w-0 overflow-y-auto border-slate-800 border-r bg-slate-950/60 p-6 max-md:h-auto max-md:border-r-0 max-md:border-b">
      <div className="grid h-full place-items-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
        <div>
          <p className="mb-2 font-bold text-sky-400 text-xs uppercase tracking-widest">Espacio de práctica</p>
          <h2 className="text-balance font-bold text-3xl text-slate-100">Selecciona una nota, cuestionario o examen en la barra lateral.</h2>
          <p className="mt-3 max-w-xl text-slate-400">Los cuestionarios y exámenes se pueden resolver directamente aquí. El chat del tutor sigue disponible para pistas y explicaciones.</p>
        </div>
      </div>
    </main>
  );
}

function ArtifactDetail({ artifactId, onClose }: { readonly artifactId: string; readonly onClose?: () => void }) {
  const artifact = useAtomValue(artifactQuery(artifactId));

  return (
    <main className="h-screen min-w-0 overflow-y-auto bg-slate-950/60 p-6 max-md:h-auto max-md:border-b">
      {onClose !== undefined && (
        <div className="mx-auto mb-4 flex max-w-4xl">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-700 px-3 text-slate-300 text-sm transition hover:border-sky-400 hover:bg-sky-500/10 hover:text-sky-200"
          >
            <ArrowLeft size={14} strokeWidth={1.8} aria-hidden />
            Volver al chat
          </button>
        </div>
      )}
      {AsyncResult.matchWithError(artifact, {
        onInitial: () => <p className="text-slate-400">Cargando artefacto…</p>,
        onError: (error) => <p className="text-red-200">{String(error)}</p>,
        onDefect: (defect) => <p className="text-red-200">{String(defect)}</p>,
        onSuccess: ({ value }) => <ArtifactContent artifact={value} />
      })}
    </main>
  );
}

function ArtifactContent({ artifact }: { readonly artifact: Artifact }) {
  switch (artifact.kind) {
    case "note":
      return <NoteViewer artifact={artifact} />;
    case "quiz":
    case "test":
      return <ExerciseSolver artifact={artifact} />;
  }
}

function NoteViewer({ artifact }: { readonly artifact: Extract<Artifact, { readonly kind: "note" }> }) {
  return (
    <article className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/30">
      <p className="mb-2 font-bold text-sky-400 text-xs uppercase tracking-widest">Nota</p>
      <h2 className="mb-6 font-bold text-3xl text-slate-100">{artifact.title}</h2>
      <div className="prose prose-invert max-w-none">
        <Streamdown>{artifact.markdown}</Streamdown>
      </div>
    </article>
  );
}

function ExerciseSolver({ artifact }: { readonly artifact: Extract<Artifact, { readonly kind: "quiz" | "test" }> }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [attempt, setAttempt] = useState<ArtifactAttempt | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitAttempt = useAtomSet(submitArtifactAttemptAction, { mode: "promise" });

  const unansweredQuestions = useMemo(
    () => artifact.questions.filter((question) => (answers[question.id] ?? "").trim().length === 0),
    [answers, artifact.questions]
  );

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const submit = async () => {
    if (unansweredQuestions.length > 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(undefined);

    try {
      const payload = buildSubmitInput(artifact, answers);
      const result = await submitAttempt(payload);
      setAttempt(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article className="mx-auto max-w-4xl">
      <header className="mb-5 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <p className="mb-2 font-bold text-sky-400 text-xs uppercase tracking-widest">{artifact.kind}</p>
        <h2 className="font-bold text-3xl text-slate-100">{artifact.title}</h2>
        <p className="mt-2 text-slate-400">Responde cada pregunta, envía y revisa tus correcciones.</p>
      </header>

      <div className="grid gap-4">
        {artifact.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            index={index}
            question={question}
            value={answers[question.id] ?? ""}
            correction={attempt?.status === "graded" ? attempt.corrections.find((item) => item.questionId === question.id) : undefined}
            disabled={attempt !== null}
            onChange={(value) => setAnswer(question.id, value)}
          />
        ))}
      </div>

      {error !== undefined && <p className="mt-4 rounded-2xl border border-red-900 bg-red-950/50 p-4 text-red-100">{error}</p>}

      {attempt?.status === "graded" && <AttemptSummary attempt={attempt} />}

      <footer className="sticky bottom-0 mt-6 rounded-3xl border border-slate-800 bg-slate-950/95 p-4 backdrop-blur">
        {attempt === null
          ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-slate-400 text-sm">
                  {unansweredQuestions.length === 0
                    ? "Listo para enviar."
                    : `${unansweredQuestions.length} pregunta${unansweredQuestions.length === 1 ? "" : "s"} sin responder.`}
                </p>
                <button
                  className="rounded-full bg-sky-400 px-5 py-2 font-semibold text-slate-950 hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  disabled={unansweredQuestions.length > 0 || isSubmitting}
                  onClick={submit}
                >
                  {isSubmitting ? "Enviando…" : `Enviar ${artifact.kind === "quiz" ? "cuestionario" : "examen"}`}
                </button>
              </div>
            )
          : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-emerald-200">Intento corregido.</p>
                <button
                  className="rounded-full border border-slate-700 px-5 py-2 text-slate-200 hover:border-sky-400"
                  type="button"
                  onClick={() => {
                    setAnswers({});
                    setAttempt(null);
                    setError(undefined);
                  }}
                >
                  Intentar de nuevo
                </button>
              </div>
            )}
      </footer>
    </article>
  );
}

function QuestionCard({
  index,
  question,
  value,
  correction,
  disabled,
  onChange
}: {
  readonly index: number;
  readonly question: QuizQuestion | TestQuestion;
  readonly value: string;
  readonly correction: QuestionCorrection | undefined;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-slate-400 text-sm">Pregunta {index + 1} · {question.type}</p>
          <h3 className="font-semibold text-lg text-slate-100">{question.prompt}</h3>
        </div>
        {correction !== undefined && <CorrectionBadge correction={correction} />}
      </div>

      {question.type === "multiple-choice" && (
        <MultipleChoiceInput question={question} value={value} disabled={disabled} onChange={onChange} />
      )}
      {question.type === "true-false" && (
        <TrueFalseInput value={value} disabled={disabled} onChange={onChange} />
      )}
      {question.type === "short-answer" && (
        <textarea
          className="min-h-32 w-full rounded-2xl border border-slate-700 bg-slate-950 p-3 text-slate-100 outline-none focus:border-sky-400 disabled:opacity-70"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder="Escribe tu respuesta…"
        />
      )}

      {correction !== undefined && <CorrectionDetails correction={correction} question={question} />}
    </section>
  );
}

function MultipleChoiceInput({
  question,
  value,
  disabled,
  onChange
}: {
  readonly question: MultipleChoiceQuestion;
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {question.options.map((option) => (
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 hover:border-sky-500" key={option.id}>
          <input
            type="radio"
            name={question.id}
            value={option.id}
            checked={value === option.id}
            disabled={disabled}
            onChange={() => onChange(option.id)}
          />
          <span>{option.text}</span>
        </label>
      ))}
    </div>
  );
}

function TrueFalseInput({
  value,
  disabled,
  onChange
}: {
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
      {([
        ["true", "Verdadero"],
        ["false", "Falso"]
      ] as const).map(([nextValue, label]) => (
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 hover:border-sky-500" key={nextValue}>
          <input
            type="radio"
            name={`true-false-${label}`}
            value={nextValue}
            checked={value === nextValue}
            disabled={disabled}
            onChange={() => onChange(nextValue)}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

function AttemptSummary({ attempt }: { readonly attempt: Extract<ArtifactAttempt, { readonly status: "graded" }> }) {
  const [{ cvd }] = useSettings();
  const passed = attempt.score / Math.max(1, attempt.maxScore) >= 0.6;
  const palette = getFeedbackPalette(passed ? "pass" : "fail", cvd);
  return (
    <section className={`mt-6 rounded-3xl border p-5 ${palette.softBg} ${palette.border}`}>
      <p className={`flex items-center gap-2 font-bold text-xl ${palette.text}`}>
        <span aria-hidden>{palette.icon}</span>
        Puntuación: {attempt.score} / {attempt.maxScore}
      </p>
      <p className="mt-1 text-slate-200/90">{attempt.summary}</p>
    </section>
  );
}

function CorrectionBadge({ correction }: { readonly correction: QuestionCorrection }) {
  if (correction.questionType === "short-answer") {
    return <FeedbackBadge kind="partial">{correction.score}/{correction.maxScore}</FeedbackBadge>;
  }

  return correction.correct
    ? <FeedbackBadge kind="pass">Correcto</FeedbackBadge>
    : <FeedbackBadge kind="fail">Revisar</FeedbackBadge>;
}

function CorrectionDetails({
  correction,
  question
}: {
  readonly correction: QuestionCorrection;
  readonly question: QuizQuestion | TestQuestion;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm">
      {correction.questionType === "multiple-choice" && question.type === "multiple-choice" && (
        <>
          <p className="text-slate-300">Respuesta correcta: <strong>{optionText(question, correction.correctOptionId)}</strong></p>
          <p className="mt-2 text-slate-400">{correction.explanation}</p>
        </>
      )}
      {correction.questionType === "true-false" && (
        <>
          <p className="text-slate-300">Respuesta correcta: <strong>{correction.correctAnswer ? "Verdadero" : "Falso"}</strong></p>
          <p className="mt-2 text-slate-400">{correction.explanation}</p>
        </>
      )}
      {correction.questionType === "short-answer" && (
        <p className="text-slate-300">{correction.feedback}</p>
      )}
    </div>
  );
}

const optionText = (question: MultipleChoiceQuestion, optionId: string) =>
  question.options.find((option) => option.id === optionId)?.text ?? optionId;

function buildSubmitInput(
  artifact: Extract<Artifact, { readonly kind: "quiz" | "test" }>,
  answers: Answers
): SubmitAttemptInput {
  const builtAnswers = artifact.questions.map((question) => {
    const value = answers[question.id] ?? "";
    switch (question.type) {
      case "multiple-choice":
        return {
          questionType: "multiple-choice" as const,
          questionId: question.id,
          selectedOptionId: value
        };
      case "true-false":
        return {
          questionType: "true-false" as const,
          questionId: question.id,
          answer: value === "true"
        };
      case "short-answer":
        return {
          questionType: "short-answer" as const,
          questionId: question.id,
          answer: value
        };
    }
  });

  if (artifact.kind === "quiz") {
    return {
      artifactKind: "quiz",
      artifactId: artifact.id,
      answers: builtAnswers.filter((answer) => answer.questionType !== "short-answer")
    };
  }

  return {
    artifactKind: "test",
    artifactId: artifact.id,
    answers: builtAnswers
  };
}
