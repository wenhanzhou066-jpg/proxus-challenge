import { useAtomRefresh } from "@effect/atom-react";
import type { AgentMessage } from "@proxus/shared";
import { useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { materialsQuery } from "../domain/materials/atoms.ts";
import { applyInvalidations, invalidationsForToolCall } from "../domain/tutor/invalidation.ts";
import { streamTutorMessage } from "../domain/tutor/stream.ts";
import { clearMessages, loadMessages, saveMessages } from "../domain/assignments/storage.ts";
import type { Assignment } from "../domain/assignments/types.ts";
import type { Profile } from "../domain/personality/types.ts";
import { StudyMenu } from "./StudyMenu.tsx";

interface ChatProps {
  readonly profile?: Profile | null;
  readonly assignments?: ReadonlyArray<Assignment>;
  readonly currentAssignment?: Assignment | null;
  readonly onOpenCreateAssignment?: () => void;
  readonly onResetPreferences?: () => void;
  readonly onToggleSidebar?: () => void;
  readonly onOpenMaterialPreview?: (materialId: string) => void;
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
        <div className="flex shrink-0 items-center gap-1">
          {onToggleSidebar !== undefined && (
            <button
              type="button"
              onClick={onToggleSidebar}
              title="Toggle sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>
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
        {messages.length === 0
          ? <StudyMenu
              profile={profile}
              currentAssignment={currentAssignment}
              hasAssignments={assignments.length > 0}
              onPick={(prompt) => void submit(prompt)}
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
        <textarea
          className="w-full resize-y rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-transparent focus:ring-2 focus:ring-sky-400"
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void submit(input);
            }
          }}
          placeholder="Ask your tutor something… (Shift+Enter for newline)"
          rows={3}
        />
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
