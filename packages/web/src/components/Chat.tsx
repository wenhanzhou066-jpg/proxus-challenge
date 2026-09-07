import { useAtomRefresh } from "@effect/atom-react";
import type { AgentMessage } from "@proxus/shared";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { materialsQuery } from "../domain/materials/atoms.ts";
import { applyInvalidations, invalidationsForToolCall } from "../domain/tutor/invalidation.ts";
import { tagArtifactWithAssignment } from "../domain/artifacts/scope.ts";
import { streamTutorMessage } from "../domain/tutor/stream.ts";
import { clearMessages, loadMessages, saveMessages } from "../domain/assignments/storage.ts";
import type { Assignment } from "../domain/assignments/types.ts";
import { getStrategy } from "../domain/personality/strategy.ts";
import type { Profile } from "../domain/personality/types.ts";
import { useSettings } from "../domain/settings/hooks.ts";
import { Files, Loader2, Send } from "lucide-react";
import { MaterialsLibrary } from "./MaterialsLibrary.tsx";
import { SpeakButton } from "./SpeakButton.tsx";
import { StudyMenu } from "./StudyMenu.tsx";
import { VoiceInputButton } from "./VoiceInputButton.tsx";

interface ChatProps {
  readonly profile?: Profile | null;
  readonly assignments?: ReadonlyArray<Assignment>;
  readonly currentAssignment?: Assignment | null;
  readonly onOpenCreateAssignment?: () => void;
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [typingIndex, setTypingIndex] = useState<number | null>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isSending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el === null) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const [settings] = useSettings();
  const strategy = useMemo(
    () => getStrategy(profile, settings.disablePersonalityAdaptation),
    [profile, settings.disablePersonalityAdaptation]
  );

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

  const scopedInput = (raw: string) => {
    const parts: string[] = [];
    parts.push(`[Voz: ${strategy.tutorVoice}]`);
    if (currentAssignment !== null) {
      const desc = currentAssignment.description.length > 0 ? ` — ${currentAssignment.description}` : "";
      parts.push(`[Tarea: ${currentAssignment.title}${desc}]`);
    }
    parts.push(raw);
    return parts.join("\n\n");
  };

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
        maxSteps: estimateMaxSteps(trimmed)
      })) {
        if (event.type === "done") {
          continue;
        }

        const message = event.message;
        setMessages((current) => {
          const next = [...current, message];
          if (message.role === "assistant") setTypingIndex(next.length - 1);
          return next;
        });

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
      const raw = cause instanceof Error ? cause.message : String(cause);
      setError(mapErrorMessage(raw));
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
        {messages.length === 0
          ? <StudyMenu
              profile={profile}
              currentAssignment={currentAssignment}
              hasAssignments={assignments.length > 0}
              onPick={(prompt) => void submit(prompt)}
              {...(onOpenCreateAssignment !== undefined ? { onOpenCreateAssignment } : {})}
              {...(onOpenMaterialPreview !== undefined ? { onOpenMaterialPreview } : {})}
            />
          : (
            <>
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message}
                  animate={index === typingIndex}
                  onAnimationDone={() => setTypingIndex((cur) => (cur === index ? null : cur))}
                />
              ))}
              {isSending && (messages.length === 0 || messages[messages.length - 1]?.role !== "assistant") && (
                <ThinkingBubble />
              )}
              <div ref={scrollAnchorRef} aria-hidden />
            </>
          )}
      </section>

      {error === undefined ? null : (
        <div className="mx-6 mb-3">
          <p
            className={`m-0 rounded-xl border px-4 py-3 text-sm ${
              isQuotaMessage(error)
                ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                : "border-rose-500/40 bg-rose-500/10 text-rose-100"
            }`}
            role="alert"
          >
            {error}
          </p>
        </div>
      )}

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

const SCOPE_PREFIX = /^(?:\[(?:Voz|Tarea):[^\]]*\]\n\n)+/;

function stripAssignmentScope(content: string): string {
  return content.replace(SCOPE_PREFIX, "");
}

const QUOTA_PATTERNS = [
  /429/,
  /quota/i,
  /rate.?limit/i,
  /RESOURCE_EXHAUSTED/,
  /too many requests/i
];
const OVERLOAD_PATTERNS = [
  /503/,
  /UNAVAILABLE/,
  /high demand/i,
  /overload/i
];

const QUOTA_MESSAGE = "Has alcanzado tu uso diario del tutor. Inténtalo de nuevo más tarde.";
const OVERLOAD_MESSAGE = "El tutor está temporalmente saturado. Inténtalo de nuevo en unos segundos.";

function mapErrorMessage(raw: string): string {
  if (QUOTA_PATTERNS.some((re) => re.test(raw))) return QUOTA_MESSAGE;
  if (OVERLOAD_PATTERNS.some((re) => re.test(raw))) return OVERLOAD_MESSAGE;
  return raw;
}

function isQuotaMessage(msg: string): boolean {
  return msg === QUOTA_MESSAGE || msg === OVERLOAD_MESSAGE;
}

const ARTIFACT_INTENT = /\b(esquema|diagrama|diagram|mapa mental|mapa conceptual|flujo|grafo|quiz|cuestionario|test|examen|prueba|resumen|nota|apuntes|artefacto|art[ií]culo|preguntas r[aá]pidas|repaso|tarjetas?)\b/i;
const MULTI_STEP_INTENT = /\b(analiza|analizar|estudia|planifica|planificar|prep[aá]rame|prep[aá]rate|inspecciona|revisa|repasa|elabora|genera)\b/i;

/**
 * Chat responses are conversational most of the time — 4 steps is plenty.
 * Only bump to 8 when the user's request clearly requires tool use
 * (creating an artifact) or multi-step reasoning over materials.
 * Cuts perceived latency roughly in half for the common case.
 */
function estimateMaxSteps(input: string): number {
  if (ARTIFACT_INTENT.test(input) || MULTI_STEP_INTENT.test(input)) return 8;
  return 4;
}

/**
 * Fake token-by-token reveal. Data arrives whole (server sends complete messages
 * per stream event), so we can be generous with the pace. Short replies skip the
 * animation entirely — the cost/benefit of watching a 30-char reply crawl is bad.
 */
function useTypewriter(fullText: string, active: boolean, onDone?: () => void) {
  const shouldAnimate = active && fullText.length > 120;
  const [revealed, setRevealed] = useState(shouldAnimate ? 0 : fullText.length);
  // Stash the latest onDone in a ref so effect deps stay stable and the
  // animation doesn't restart every time the parent re-renders.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!shouldAnimate) {
      setRevealed(fullText.length);
      onDoneRef.current?.();
      return;
    }
    let cancelled = false;
    setRevealed(0);
    const cps = 800;
    const startedAt = performance.now();
    let raf = 0;
    const tick = () => {
      if (cancelled) return;
      const elapsed = (performance.now() - startedAt) / 1000;
      const next = Math.min(fullText.length, Math.floor(elapsed * cps));
      setRevealed(next);
      if (next >= fullText.length) {
        onDoneRef.current?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [fullText, shouldAnimate]);

  return shouldAnimate ? fullText.slice(0, revealed) : fullText;
}

function ThinkingBubble() {
  return (
    <article className="max-w-3xl self-start rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-2 flex items-center gap-3">
        <span
          className="block font-bold text-sky-400 text-xs uppercase tracking-wide"
          style={{ fontFamily: "var(--font-brand)", letterSpacing: "0.14em" }}
        >
          PROXUS
        </span>
      </div>
      <div className="flex items-center gap-2 text-slate-300 text-sm">
        <span className="italic">Pensando</span>
        <span className="inline-flex gap-0.5">
          <span className="thinking-dot" />
          <span className="thinking-dot [animation-delay:0.15s]" />
          <span className="thinking-dot [animation-delay:0.3s]" />
        </span>
      </div>
    </article>
  );
}

const MessageBubble = memo(function MessageBubble({
  message,
  animate = false,
  onAnimationDone
}: {
  readonly message: AgentMessage;
  readonly animate?: boolean;
  readonly onAnimationDone?: () => void;
}) {
  if (message.role === "tool-call" || message.role === "tool-result") {
    return null;
  }

  const isAssistant = message.role === "assistant";
  const fullContent = message.role === "user" ? stripAssignmentScope(message.content) : message.content;
  const displayContent = useTypewriter(fullContent, animate && isAssistant, onAnimationDone);
  const isTyping = animate && isAssistant && displayContent.length < fullContent.length;
  return (
    <article className={message.role === "user"
      ? "max-w-3xl self-end rounded-2xl border border-blue-700 bg-blue-950 p-4"
      : "max-w-3xl self-start rounded-2xl border border-slate-800 bg-slate-900 p-4"}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span
          className="block font-bold text-sky-400 text-xs uppercase tracking-wide"
          style={message.role === "user" ? undefined : { fontFamily: "var(--font-brand)", letterSpacing: "0.14em" }}
        >
          {message.role === "user" ? "Tú" : "PROXUS"}
        </span>
        {isAssistant && fullContent.trim().length > 0 && !isTyping && (
          <SpeakButton text={fullContent} />
        )}
      </div>
      <div className="text-slate-100 leading-7">
        <Streamdown>{displayContent}</Streamdown>
        {isTyping && <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse bg-sky-400" aria-hidden />}
      </div>
    </article>
  );
});
