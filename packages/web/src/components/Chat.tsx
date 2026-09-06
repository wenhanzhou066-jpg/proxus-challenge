import { useAtomRefresh } from "@effect/atom-react";
import type { AgentMessage, ConceptualQuestion, MaterialAnalysis } from "@proxus/shared";
import { useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { materialsQuery } from "../domain/materials/atoms.ts";
import { applyInvalidations, invalidationsForToolCall } from "../domain/tutor/invalidation.ts";
import { streamTutorMessage } from "../domain/tutor/stream.ts";
import { clearMessages, loadMessages, saveMessages } from "../domain/assignments/storage.ts";
import type { Assignment, Material } from "../domain/assignments/types.ts";
import { getStrategy } from "../domain/personality/strategy.ts";
import type { Profile } from "../domain/personality/types.ts";
import { loadAnalysis } from "../domain/precompute/storage.ts";
import { StudyMenu } from "./StudyMenu.tsx";
import { StudySession } from "./StudySession.tsx";
import { VoiceInputButton } from "./VoiceInputButton.tsx";

interface ChatProps {
  readonly profile?: Profile | null;
  readonly assignments?: ReadonlyArray<Assignment>;
  readonly currentAssignment?: Assignment | null;
  readonly onOpenCreateAssignment?: () => void;
  readonly onResetPreferences?: () => void;
  readonly onToggleSidebar?: () => void;
  readonly onOpenMaterialPreview?: (materialId: string) => void;
}

function appendTranscript(prev: string, chunk: string): string {
  const clean = chunk.trim();
  if (clean.length === 0) return prev;
  if (prev.length === 0) return clean;
  return `${prev}${prev.endsWith(" ") ? "" : " "}${clean}`;
}

export function Chat({
  profile = null,
  assignments = [],
  currentAssignment = null,
  onOpenCreateAssignment,
  onResetPreferences,
  onToggleSidebar,
  onOpenMaterialPreview
}: ChatProps) {
  const assignmentKey = currentAssignment?.id ?? null;
  const [messages, setMessages] = useState<readonly AgentMessage[]>(() => {
    if (assignmentKey === null) return [];
    const stored = loadMessages(assignmentKey);
    return Array.isArray(stored) ? (stored as AgentMessage[]) : [];
  });
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [activeSession, setActiveSession] = useState<{
    material: Material;
    questions: ReadonlyArray<ConceptualQuestion>;
  } | null>(null);

  const strategy = useMemo(() => getStrategy(profile), [profile]);

  // End active session when switching assignments
  useEffect(() => {
    setActiveSession(null);
  }, [assignmentKey]);

  const startSession = (materialId: string, questionIds?: ReadonlyArray<string>) => {
    if (currentAssignment === null) return;
    const material = currentAssignment.materials.find((m) => m.id === materialId);
    if (material === undefined) return;
    const analysis: MaterialAnalysis | null = loadAnalysis(materialId);
    if (analysis === null) return;
    const questions = questionIds === undefined
      ? analysis.questions
      : analysis.questions.filter((q) => questionIds.includes(q.id));
    if (questions.length === 0) return;
    setActiveSession({ material, questions });
  };

  useEffect(() => {
    if (assignmentKey === null) {
      setMessages([]);
      return;
    }
    const stored = loadMessages(assignmentKey);
    setMessages(Array.isArray(stored) ? (stored as AgentMessage[]) : []);
  }, [assignmentKey]);

  useEffect(() => {
    if (assignmentKey === null) return;
    saveMessages(assignmentKey, messages);
  }, [assignmentKey, messages]);
  const refreshArtifacts = useAtomRefresh(artifactsQuery);
  const refreshMaterials = useAtomRefresh(materialsQuery);
  const pendingInvalidations = useRef<Array<ReturnType<typeof invalidationsForToolCall>>>([]);

  const scopedInput = (raw: string) =>
    currentAssignment === null
      ? raw
      : `[Assignment: ${currentAssignment.title}${currentAssignment.description.length > 0 ? ` — ${currentAssignment.description}` : ""}]\n\n${raw}`;

  const submit = async (nextInput: string) => {
    const trimmed = nextInput.trim();
    if (trimmed.length === 0 || isSending) {
      return;
    }

    setIsSending(true);
    setError(undefined);
    pendingInvalidations.current = [];

    try {
      for await (const event of streamTutorMessage({
        input: scopedInput(trimmed),
        messages,
        maxSteps: 8
      })) {
        if (event.type === "done") {
          continue;
        }

        const message = event.message;
        setMessages((current) => [...current, message]);

        if (message.role === "tool-call") {
          pendingInvalidations.current.push(invalidationsForToolCall(message));
        }

        if (message.role === "tool-result") {
          const keys = pendingInvalidations.current.shift() ?? [];
          if (!message.isFailure) {
            applyInvalidations(keys, {
              refreshArtifacts,
              refreshMaterials
            });
          }
        }
      }

      setInput("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSending(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    if (assignmentKey !== null) clearMessages(assignmentKey);
  };

  return (
    <main className="grid h-screen max-h-screen min-w-0 flex-1 grid-rows-[auto_1fr_auto_auto] bg-slate-950 max-md:h-auto max-md:max-h-none">
      <header className="flex items-center justify-between gap-4 border-slate-800 border-b px-4 py-5">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 truncate font-bold text-2xl text-slate-100">
            {currentAssignment !== null ? currentAssignment.title : "Academic tutor"}
          </h1>
          <p className="mt-0.5 text-slate-500 text-sm">
            {currentAssignment !== null
              ? currentAssignment.description.length > 0
                ? currentAssignment.description
                : "Ephemeral session — chat resets on refresh."
              : "Ephemeral session — chat resets on refresh."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onResetPreferences !== undefined && (
            <button
              className="hidden rounded-full border border-slate-700 px-4 py-2 text-slate-200 text-sm transition hover:border-fuchsia-400 sm:inline-block"
              type="button"
              onClick={onResetPreferences}
              title="Redo the personality quiz and reset your mode"
            >
              Preferences
            </button>
          )}
          <button
            className="rounded-full border border-slate-700 px-3 py-1.5 text-slate-200 text-sm transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-2"
            type="button"
            onClick={clearChat}
            disabled={messages.length === 0}
            title="Clear chat"
          >
            Clear
          </button>
        </div>
      </header>

      <section className="flex flex-col gap-4 overflow-y-auto p-6" aria-live="polite">
        {activeSession !== null
          ? <StudySession
              materialId={activeSession.material.id}
              materialName={activeSession.material.name}
              questions={activeSession.questions}
              strategy={strategy}
              onEscape={(question, userAttempt) => {
                const attemptSection = userAttempt.trim().length > 0
                  ? `\n\nHere's what I tried: ${userAttempt.trim()}`
                  : "";
                setInput(
                  `I'm stuck on this question about "${activeSession.material.name}":\n\n> ${question.prompt}${attemptSection}\n\nDon't just give me the answer — walk me through how to think about it.`
                );
                setActiveSession(null);
              }}
              onExit={() => setActiveSession(null)}
            />
          : messages.length === 0
            ? <StudyMenu
                profile={profile}
                currentAssignment={currentAssignment}
                hasAssignments={assignments.length > 0}
                onPick={(prompt) => void submit(prompt)}
                onStartSession={startSession}
                {...(onOpenCreateAssignment !== undefined ? { onOpenCreateAssignment } : {})}
                {...(onOpenMaterialPreview !== undefined ? { onOpenMaterialPreview } : {})}
              />
            : messages.map((message, index) => <MessageBubble key={index} message={message} />)}
      </section>

      {error === undefined ? null : <p className="m-0 px-6 pb-3 text-red-200">{error}</p>}

      <form
        className="grid grid-cols-[1fr_auto] gap-3 border-slate-800 border-t bg-slate-950/90 px-6 pt-4 pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(input);
        }}
      >
        <div className="relative">
          <textarea
            className="w-full resize-y rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 pr-14 text-slate-100 outline-none focus:border-transparent focus:ring-2 focus:ring-sky-400"
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void submit(input);
              }
            }}
            placeholder="Pregunta a tu tutor… (Shift+Enter salto de línea, mic para dictar)"
            rows={3}
          />
          <div className="absolute right-2 bottom-2">
            <VoiceInputButton
              onFinalTranscript={(text) => setInput((prev) => appendTranscript(prev, text))}
            />
          </div>
        </div>
        <button
          className="self-end rounded-full bg-sky-500 px-6 py-3 font-bold text-slate-950 text-sm uppercase tracking-wider shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 hover:shadow-sky-400/30 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
          type="submit"
          disabled={isSending || input.trim().length === 0}
        >
          {isSending ? "Thinking…" : "Send"}
        </button>
      </form>
    </main>
  );
}

function MessageBubble({ message }: { readonly message: AgentMessage }) {
  if (message.role === "tool-call" || message.role === "tool-result") {
    return (
      <details className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
        <summary className="cursor-pointer">
          {message.role === "tool-call" ? `Tool call: ${message.name}` : `Tool result: ${message.name}`}
        </summary>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm">
          {JSON.stringify(message.role === "tool-call" ? message.input : message.result, null, 2)}
        </pre>
      </details>
    );
  }

  return (
    <article className={message.role === "user"
      ? "max-w-3xl self-end rounded-2xl border border-blue-700 bg-blue-950 p-4"
      : "max-w-3xl self-start rounded-2xl border border-slate-800 bg-slate-900 p-4"}
    >
      <span className="mb-2 block font-bold text-sky-400 text-xs uppercase tracking-wide">
        {message.role === "user" ? "You" : "Tutor"}
      </span>
      <div className="text-slate-100 leading-7">
        <Streamdown>{message.content}</Streamdown>
      </div>
    </article>
  );
}
