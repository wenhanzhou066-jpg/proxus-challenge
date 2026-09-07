import { useAtomRefresh } from "@effect/atom-react";
import type { AgentMessage, ConceptualQuestion, MaterialAnalysis } from "@proxus/shared";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { materialsQuery } from "../domain/materials/atoms.ts";
import { applyInvalidations, invalidationsForToolCall } from "../domain/tutor/invalidation.ts";
import { tagArtifactWithAssignment } from "../domain/artifacts/scope.ts";
import { streamTutorMessage } from "../domain/tutor/stream.ts";
import { clearMessages, loadMessages, saveMessages } from "../domain/assignments/storage.ts";
import type { Assignment, Material } from "../domain/assignments/types.ts";
import { getStrategy } from "../domain/personality/strategy.ts";
import type { Profile } from "../domain/personality/types.ts";
import { loadAnalysis } from "../domain/precompute/storage.ts";
import { Files, Loader2, Send } from "lucide-react";
import { MaterialsLibrary } from "./MaterialsLibrary.tsx";
import { SpeakButton } from "./SpeakButton.tsx";
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
  readonly sidebarCollapsed?: boolean;
}

function extractArtifactId(result: unknown): string | null {
  if (typeof result === "string") {
    try {
      const parsed = JSON.parse(result);
      if (parsed !== null && typeof parsed === "object" && "id" in parsed && typeof parsed.id === "string") {
        return parsed.id;
      }
    } catch {
      const match = /"id"\s*:\s*"([^"]+)"/.exec(result);
      return match?.[1] ?? null;
    }
  }
  if (result !== null && typeof result === "object" && "id" in result && typeof (result as { id: unknown }).id === "string") {
    return (result as { id: string }).id;
  }
  return null;
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
  onOpenMaterialPreview,
  sidebarCollapsed = false
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    const el = textareaRef.current;
    if (el === null) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

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
      : `[Tarea: ${currentAssignment.title}${currentAssignment.description.length > 0 ? ` — ${currentAssignment.description}` : ""}]\n\n${raw}`;

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
            // Tag any created artifact with the current assignment so the sidebar can group it.
            if (keys.includes("artifacts") && currentAssignment !== null) {
              const createdId = extractArtifactId(message.result);
              if (createdId !== null) tagArtifactWithAssignment(createdId, currentAssignment.id);
            }
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
      <header
        className="flex items-center justify-between gap-6 border-slate-800 border-b py-4 pr-6 transition-[padding-left] duration-200"
        style={{ paddingLeft: sidebarCollapsed ? 80 : 24 }}
      >
        <div className="min-w-0 flex-1">
          {currentAssignment !== null ? (
            <h1 className="m-0 truncate font-bold text-xl text-slate-100">
              {currentAssignment.title}
            </h1>
          ) : (
            <div className="flex items-center gap-1.5">
              <img src="/proxus-mark.webp" alt="" aria-hidden className="h-6 w-auto" />
              <span
                className="font-bold text-slate-50 text-xl leading-none"
                style={{ fontFamily: "var(--font-brand)", letterSpacing: "0.14em" }}
              >
                PROXUS
              </span>
            </div>
          )}
          <p className="mt-1 truncate text-slate-500 text-xs">
            {currentAssignment !== null
              ? currentAssignment.description.length > 0
                ? currentAssignment.description
                : "Sesión efímera — el chat se reinicia al recargar."
              : "Sesión efímera — el chat se reinicia al recargar."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {currentAssignment !== null && currentAssignment.materials.length > 0 && (
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              title="Ver PDFs de la tarea"
              aria-label="Ver PDFs de la tarea"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-700 pl-3 pr-2 text-slate-200 text-sm transition hover:border-sky-400 hover:bg-sky-500/10 hover:text-sky-200"
            >
              <Files size={16} strokeWidth={1.8} aria-hidden />
              <span className="hidden sm:inline">Materiales</span>
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-slate-800 px-1.5 font-mono text-[10px] text-slate-300 tabular-nums">
                {currentAssignment.materials.length}
              </span>
            </button>
          )}
          {onResetPreferences !== undefined && (
            <button
              className="hidden h-9 items-center rounded-full border border-slate-700 px-4 text-slate-200 text-sm transition hover:border-sky-400 hover:bg-sky-500/10 hover:text-sky-200 sm:inline-flex"
              type="button"
              onClick={onResetPreferences}
              title="Rehacer el test de personalidad"
            >
              Preferencias
            </button>
          )}
          <button
            className="inline-flex h-9 items-center rounded-full border border-slate-700 px-4 text-slate-200 text-sm transition hover:border-sky-400 hover:bg-sky-500/10 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={clearChat}
            disabled={messages.length === 0}
            title="Limpiar chat"
          >
            Limpiar
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
                  ? `\n\nEsto es lo que he intentado: ${userAttempt.trim()}`
                  : "";
                setInput(
                  `Me he atascado con esta pregunta sobre "${activeSession.material.name}":\n\n> ${question.prompt}${attemptSection}\n\nNo me des la respuesta directamente — guíame para pensar en ella.`
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
        className="mx-auto w-full max-w-3xl border-slate-800 bg-slate-950/90 px-4 pt-3 pb-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(input);
        }}
      >
        <div className="relative flex items-end gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 shadow-lg focus-within:border-transparent focus-within:ring-2 focus-within:ring-sky-400">
          <textarea
            ref={textareaRef}
            className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent py-1.5 text-slate-100 outline-none placeholder:text-slate-500"
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void submit(input);
              }
            }}
            placeholder="Pregunta a tu tutor…"
            rows={1}
          />
          <VoiceInputButton
            onFinalTranscript={(text) => setInput((prev) => appendTranscript(prev, text))}
          />
          <button
            type="submit"
            disabled={isSending || input.trim().length === 0}
            title="Enviar (Enter)"
            aria-label="Enviar"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-sky-500 text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isSending
              ? <Loader2 size={18} strokeWidth={2.4} className="animate-spin" aria-hidden />
              : <Send size={18} strokeWidth={2} aria-hidden />}
          </button>
        </div>
        <p className="mt-1.5 text-center text-slate-500 text-xs">Enter para enviar · Shift+Enter salto de línea</p>
      </form>

      {libraryOpen && currentAssignment !== null && (
        <MaterialsLibrary
          assignmentTitle={currentAssignment.title}
          materials={currentAssignment.materials}
          onOpen={(id) => onOpenMaterialPreview?.(id)}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </main>
  );
}

const MessageBubble = memo(function MessageBubble({ message }: { readonly message: AgentMessage }) {
  if (message.role === "tool-call" || message.role === "tool-result") {
    return (
      <details className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-slate-400">
        <summary className="cursor-pointer">
          {message.role === "tool-call" ? `Llamada a herramienta: ${message.name}` : `Resultado de herramienta: ${message.name}`}
        </summary>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-sm">
          {JSON.stringify(message.role === "tool-call" ? message.input : message.result, null, 2)}
        </pre>
      </details>
    );
  }

  const isAssistant = message.role === "assistant";
  return (
    <article className={message.role === "user"
      ? "max-w-3xl self-end rounded-2xl border border-blue-700 bg-blue-950 p-4"
      : "max-w-3xl self-start rounded-2xl border border-slate-800 bg-slate-900 p-4"}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="block font-bold text-sky-400 text-xs uppercase tracking-wide">
          {message.role === "user" ? "Tú" : "Tutor"}
        </span>
        {isAssistant && message.content.trim().length > 0 && (
          <SpeakButton text={message.content} />
        )}
      </div>
      <div className="text-slate-100 leading-7">
        <Streamdown>{message.content}</Streamdown>
      </div>
    </article>
  );
});
