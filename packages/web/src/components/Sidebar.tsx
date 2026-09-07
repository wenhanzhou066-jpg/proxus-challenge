import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { getArtifactAssignmentMap, subscribeArtifactScope } from "../domain/artifacts/scope.ts";
import { deleteArtifactAction, renameArtifactAction } from "../domain/artifacts/atoms.ts";
import { RowMenu } from "./RowMenu.tsx";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { CheckCircle2, ClipboardList, FileText, Folder, ListChecks, MoreHorizontal, Network, PanelLeft, Plus, Settings, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import type { Assignment } from "../domain/assignments/types.ts";
import { useSettings } from "../domain/settings/hooks.ts";

interface SidebarProps {
  readonly selectedArtifactId: string | null;
  readonly onSelectArtifact: (artifactId: string) => void;
  readonly assignments?: ReadonlyArray<Assignment>;
  readonly currentAssignmentId?: string | null;
  readonly onSelectAssignment?: (id: string | null) => void;
  readonly onOpenCreateAssignment?: () => void;
  readonly onDeleteAssignment?: (id: string) => void;
  readonly onRenameAssignment?: (id: string, newTitle: string) => void;
  readonly collapsed?: boolean;
  readonly width?: number;
  readonly onToggleCollapse?: () => void;
  readonly onOpenSettings?: () => void;
}

export function Sidebar({
  selectedArtifactId,
  onSelectArtifact,
  assignments = [],
  currentAssignmentId = null,
  onSelectAssignment,
  onOpenCreateAssignment,
  onDeleteAssignment,
  onRenameAssignment,
  collapsed = false,
  width = 300,
  onToggleCollapse,
  onOpenSettings
}: SidebarProps) {
  const artifacts = useAtomValue(artifactsQuery);
  const [settings] = useSettings();
  const [animatingCollapse, setAnimatingCollapse] = useState(false);
  const firstRenderRef = useRef(true);
  useEffect(() => {
    if (firstRenderRef.current) { firstRenderRef.current = false; return; }
    setAnimatingCollapse(true);
    const t = setTimeout(() => setAnimatingCollapse(false), 300);
    return () => clearTimeout(t);
  }, [collapsed]);
  const displayName = settings.name.trim().length > 0 ? settings.name.trim() : "Estudiante";
  const initials = displayName
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
  const showAssignments = onSelectAssignment !== undefined && onOpenCreateAssignment !== undefined;
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const toggleSelected = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const renameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (renamingId !== null) renameRef.current?.focus();
  }, [renamingId]);

  function startRename(assignment: Assignment) {
    setRenamingId(assignment.id);
    setRenameValue(assignment.title);
  }

  function commitRename(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed.length > 0 && onRenameAssignment !== undefined) onRenameAssignment(id, trimmed);
    setRenamingId(null);
  }

  const deletingAssignment = deletingId !== null ? assignments.find((a) => a.id === deletingId) ?? null : null;

  return (
    <>
    <aside
      className={`flex h-screen shrink-0 flex-col overflow-hidden border-slate-800 border-r bg-slate-950 max-md:h-auto max-md:max-h-[45vh] max-md:border-r-0 max-md:border-b ${
        collapsed ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{
        width: collapsed ? 0 : width,
        transition: animatingCollapse
          ? "width 260ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease-out"
          : "opacity 200ms ease-out"
      }}
      aria-hidden={collapsed}
    >
    <div className="flex-1 overflow-y-auto px-3 py-5">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <img
            src="/proxus-mark.webp"
            alt=""
            aria-hidden
            className="h-7 w-auto shrink-0"
          />
          <span
            className="font-bold text-2xl text-slate-50 leading-none"
            style={{ fontFamily: "var(--font-brand)", letterSpacing: "0.14em" }}
          >
            PROXUS
          </span>
        </div>
        <div className="min-w-0 flex-1" />
        {onToggleCollapse !== undefined && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Ocultar barra lateral"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-slate-700 text-slate-400 transition hover:border-sky-400 hover:bg-sky-500/15 hover:text-sky-300"
          >
            <PanelLeft size={18} aria-hidden />
          </button>
        )}
      </div>

      {showAssignments && (
        <section className="mb-6 px-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-widest">Tareas</h2>
            {selectionMode ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
                  title="Salir de selección"
                  aria-label="Salir de selección"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-sky-500/60 bg-sky-500/15 px-1.5 text-sky-200 text-xs transition hover:bg-sky-500/25"
                >
                  <CheckCircle2 size={14} strokeWidth={2.4} aria-hidden />
                  <span className="font-mono tabular-nums">{selectedIds.size}</span>
                </button>
                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={() => setBulkDeleteOpen(true)}
                  title="Borrar seleccionadas"
                  aria-label="Borrar seleccionadas"
                  className="grid size-7 shrink-0 place-items-center rounded-full border border-slate-700 text-slate-400 transition hover:border-rose-400 hover:bg-rose-500/15 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-700 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                >
                  <X size={14} strokeWidth={2} aria-hidden />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {assignments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectionMode(true)}
                    title="Seleccionar varias"
                    aria-label="Seleccionar varias"
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-slate-700 text-slate-300 transition hover:border-sky-400 hover:bg-sky-500/15 hover:text-sky-300 focus-visible:border-sky-400 focus-visible:outline-none"
                  >
                    <CheckCircle2 size={14} strokeWidth={1.8} aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenCreateAssignment}
                  title="Nueva tarea"
                  aria-label="Nueva tarea"
                  className="grid size-7 shrink-0 place-items-center rounded-full border border-slate-700 text-slate-300 transition hover:border-sky-400 hover:bg-sky-500/15 hover:text-sky-300 focus-visible:border-sky-400 focus-visible:outline-none"
                >
                  <Plus size={16} strokeWidth={2.2} aria-hidden />
                </button>
              </div>
            )}
          </div>
          {assignments.length === 0 ? (
            <p className="text-slate-400 text-sm">Crea una para iniciar un chat centrado en una asignatura.</p>
          ) : (
            <ul className="grid gap-0.5">
              {assignments.map((assignment) => {
                const active = assignment.id === currentAssignmentId;
                const isRenaming = renamingId === assignment.id;
                return (
                  <li
                    key={assignment.id}
                    className={`group relative flex min-w-0 items-center overflow-hidden rounded-xl border transition ${
                      active
                        ? "border-sky-500 bg-sky-950/40"
                        : "border-transparent bg-slate-950/70 hover:border-sky-500 hover:bg-slate-950"
                    }`}
                    data-assignment-menu
                  >
                    {isRenaming ? (
                      <form
                        className="flex flex-1 px-3 py-2.5"
                        onSubmit={(e) => { e.preventDefault(); commitRename(assignment.id); }}
                      >
                        <input
                          ref={renameRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.currentTarget.value)}
                          onBlur={() => commitRename(assignment.id)}
                          onKeyDown={(e) => { if (e.key === "Escape") setRenamingId(null); }}
                          className="min-w-0 flex-1 bg-transparent text-slate-100 text-sm outline-none"
                        />
                      </form>
                    ) : selectionMode ? (
                      <label className="flex flex-1 cursor-pointer items-center gap-3 py-2.5 pl-4 pr-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(assignment.id)}
                          onChange={() => toggleSelected(assignment.id)}
                          className="size-4 shrink-0 accent-sky-500"
                        />
                        <span className="min-w-0 flex-1 truncate text-slate-100 text-sm font-medium">{assignment.title}</span>
                      </label>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelectAssignment(assignment.id)}
                          className="min-w-0 flex-1 py-2.5 pl-4 text-left"
                        >
                          <span className="block truncate text-slate-100 text-sm font-medium">{assignment.title}</span>
                        </button>

                        <div className="shrink-0 pr-2.5">
                          <RowMenu
                            ariaLabel="Opciones de la tarea"
                            items={[
                              { label: "Renombrar", onClick: () => startRename(assignment) },
                              ...(onDeleteAssignment !== undefined
                                ? [{ label: "Eliminar", danger: true, onClick: () => setDeletingId(assignment.id) }]
                                : [])
                            ]}
                            renderTrigger={({ onClick, ref, ariaExpanded, ariaLabel, menuOpen: mo }) => (
                              <button
                                type="button"
                                ref={ref}
                                onClick={onClick}
                                className={`flex h-6 w-6 items-center justify-center rounded-full transition focus-visible:outline-none ${
                                  mo
                                    ? "bg-slate-700 text-slate-100 opacity-100"
                                    : "text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-slate-700 hover:text-slate-100 focus-visible:opacity-100"
                                }`}
                                aria-label={ariaLabel}
                                aria-haspopup="true"
                                aria-expanded={ariaExpanded}
                              >
                                <MoreHorizontal size={14} aria-hidden />
                              </button>
                            )}
                          />
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}


      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-widest">Artefactos</h2>
        </div>
        {AsyncResult.matchWithError(artifacts, {
          onInitial: () => <p className="text-slate-400">Cargando artefactos…</p>,
          onError: (error) => <p className="text-red-200">{String(error)}</p>,
          onDefect: (defect) => <p className="text-red-200">{String(defect)}</p>,
          onSuccess: ({ value }) => value.artifacts.length === 0
            ? <p className="text-slate-400">Aún no hay notas, cuestionarios ni exámenes.</p>
            : (
                <ArtifactFolders
                  artifacts={value.artifacts}
                  assignments={assignments}
                  selectedId={selectedArtifactId}
                  onSelect={onSelectArtifact}
                />
              )
        })}
      </section>
    </div>

    {onOpenSettings !== undefined && (
      <button
        type="button"
        onClick={onOpenSettings}
        title="Perfil y ajustes"
        aria-label="Abrir ajustes de perfil"
        className="group flex items-center gap-3 border-slate-800 border-t bg-slate-950 px-4 py-3 text-left transition hover:bg-slate-900"
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 font-bold text-white text-sm ring-2 ring-transparent transition group-hover:ring-sky-400/50">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-slate-100 text-sm">{displayName}</span>
          <span className="block text-slate-400 text-xs transition group-hover:text-slate-300">Perfil · Accesibilidad</span>
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-900 text-slate-500 ring-1 ring-slate-800 transition group-hover:rotate-90 group-hover:bg-sky-500/15 group-hover:text-sky-300 group-hover:ring-sky-400/60">
          <Settings size={16} strokeWidth={1.8} aria-hidden />
        </span>
      </button>
    )}
    </aside>

    {onToggleCollapse !== undefined && (
      <button
        type="button"
        onClick={onToggleCollapse}
        title="Mostrar barra lateral"
        aria-label="Mostrar barra lateral"
        className={`fixed top-4 left-4 z-40 grid size-10 place-items-center rounded-full border border-slate-700 bg-slate-900/90 text-slate-300 shadow-lg backdrop-blur transition-all duration-200 hover:border-sky-400 hover:bg-sky-500/15 hover:text-sky-300 ${
          collapsed
            ? "pointer-events-auto scale-100 opacity-100 delay-150"
            : "pointer-events-none -translate-x-3 scale-90 opacity-0"
        }`}
      >
        <PanelLeft size={18} aria-hidden />
      </button>
    )}

    {deletingAssignment !== null && createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        onClick={() => setDeletingId(null)}
      >
        <div
          className="w-full max-w-[320px] rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="font-bold text-slate-100 text-base">¿Eliminar tarea?</h2>
          <p className="mt-2 text-slate-400 text-sm">
            "<span className="font-semibold text-slate-200">{deletingAssignment.title}</span>"
          </p>
          <p className="mt-1 text-rose-400 text-xs font-medium">Esta acción es irreversible.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setDeletingId(null)}
              className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 text-sm transition hover:border-slate-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (onDeleteAssignment !== undefined) onDeleteAssignment(deletingAssignment.id);
                setDeletingId(null);
              }}
              className="rounded-full bg-rose-600 px-5 py-2 font-bold text-white text-sm ring-2 ring-rose-500/60 shadow-lg shadow-rose-700/40 transition hover:bg-rose-500 hover:ring-rose-400/70"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {bulkDeleteOpen && createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        onClick={() => setBulkDeleteOpen(false)}
      >
        <div
          className="w-full max-w-[340px] rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="font-bold text-slate-100 text-base">
            ¿Borrar {selectedIds.size} tarea{selectedIds.size === 1 ? "" : "s"}?
          </h2>
          <p className="mt-2 text-slate-400 text-sm">Se eliminarán todos sus chats y materiales asociados.</p>
          <p className="mt-1 text-rose-400 text-xs font-medium">Esta acción es irreversible.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" onClick={() => setBulkDeleteOpen(false)} className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 text-sm transition hover:border-slate-500">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                if (onDeleteAssignment !== undefined) {
                  for (const id of selectedIds) onDeleteAssignment(id);
                }
                setBulkDeleteOpen(false);
                setSelectedIds(new Set());
                setSelectionMode(false);
              }}
              className="rounded-full bg-rose-600 px-5 py-2 font-bold text-white text-sm ring-2 ring-rose-500/60 shadow-lg shadow-rose-700/40 transition hover:bg-rose-500 hover:ring-rose-400/70"
            >
              Borrar {selectedIds.size}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}

// Group artifacts by title so multiple types (note/quiz/test) that share a name
// live inside the same collapsible "folder".
type ArtifactSummary = { readonly id: string; readonly kind: string; readonly title: string };

const KIND_META: Record<string, { readonly Icon: typeof FileText; readonly label: string; readonly color: string }> = {
  note: { Icon: FileText, label: "Nota", color: "text-sky-300" },
  quiz: { Icon: ListChecks, label: "Cuestionario", color: "text-amber-300" },
  test: { Icon: ClipboardList, label: "Examen", color: "text-fuchsia-300" },
  diagram: { Icon: Network, label: "Diagrama", color: "text-emerald-300" }
};

function ArtifactFolders({
  artifacts,
  assignments,
  selectedId,
  onSelect
}: {
  readonly artifacts: ReadonlyArray<ArtifactSummary>;
  readonly assignments: ReadonlyArray<Assignment>;
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
}) {
  const [scopeMap, setScopeMap] = useState<Readonly<Record<string, string>>>(() => getArtifactAssignmentMap());
  useEffect(() => subscribeArtifactScope(() => setScopeMap(getArtifactAssignmentMap())), []);
  const renameArtifact = useAtomSet(renameArtifactAction, { mode: "promise" });
  const deleteArtifact = useAtomSet(deleteArtifactAction, { mode: "promise" });
  const [renamingArtifactId, setRenamingArtifactId] = useState<string | null>(null);
  const [renameArtifactValue, setRenameArtifactValue] = useState("");
  const [deletingArtifactId, setDeletingArtifactId] = useState<string | null>(null);
  const renameArtifactInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (renamingArtifactId !== null) renameArtifactInputRef.current?.focus();
  }, [renamingArtifactId]);

  const startRenameArtifact = (a: ArtifactSummary) => {
    setRenamingArtifactId(a.id);
    setRenameArtifactValue(a.title);
  };

  const commitRenameArtifact = async (id: string) => {
    const trimmed = renameArtifactValue.trim();
    setRenamingArtifactId(null);
    if (trimmed.length > 0) {
      await renameArtifact({ id, title: trimmed }).catch(() => undefined);
    }
  };

  const confirmDeleteArtifact = async () => {
    if (deletingArtifactId === null) return;
    const id = deletingArtifactId;
    setDeletingArtifactId(null);
    await deleteArtifact(id).catch(() => undefined);
  };

  const deletingArtifact = deletingArtifactId !== null
    ? artifacts.find((a) => a.id === deletingArtifactId) ?? null
    : null;

  const assignmentTitle = new Map(assignments.map((a) => [a.id, a.title]));
  const groups = new Map<string, ArtifactSummary[]>();
  for (const a of artifacts) {
    const assignmentId = scopeMap[a.id];
    const key = assignmentId !== undefined && assignmentTitle.has(assignmentId)
      ? `assignment:${assignmentId}`
      : "unassigned";
    const arr = groups.get(key) ?? [];
    arr.push(a);
    groups.set(key, arr);
  }
  const entries = Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === "unassigned") return 1;
    if (b === "unassigned") return -1;
    return 0;
  });

  const folderLabel = (key: string) =>
    key === "unassigned"
      ? "Sin tarea"
      : assignmentTitle.get(key.slice("assignment:".length)) ?? "Tarea eliminada";

  return (
    <>
    <ul className="grid gap-1">
      {entries.map(([key, items]) => {
        const containsSelected = items.some((i) => i.id === selectedId);
        const title = folderLabel(key);
        return (
          <li key={key} className="min-w-0 overflow-hidden">
            <details open={containsSelected} className="group rounded-xl border border-slate-800 bg-slate-950/70 open:bg-slate-900">
              <summary className="flex min-w-0 cursor-pointer items-center gap-2 overflow-hidden px-3 py-2 marker:hidden [&::-webkit-details-marker]:hidden">
                <Folder size={14} className="shrink-0 text-slate-400 group-open:text-sky-300" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium text-slate-100 text-sm">{title}</span>
                <span className="shrink-0 rounded-full bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 tabular-nums">
                  {items.length}
                </span>
              </summary>
              <ul className="grid gap-0.5 border-slate-800/60 border-t px-2 py-2">
                {items.map((artifact) => {
                  const meta = KIND_META[artifact.kind] ?? { Icon: FileText, label: artifact.kind, color: "text-slate-300" };
                  const active = selectedId === artifact.id;
                  const isRenaming = renamingArtifactId === artifact.id;
                  return (
                    <li key={artifact.id} className="group flex min-w-0 items-center overflow-hidden">
                      {isRenaming ? (
                        <form
                          className="flex flex-1 px-2 py-1.5"
                          onSubmit={(e) => { e.preventDefault(); void commitRenameArtifact(artifact.id); }}
                        >
                          <input
                            ref={renameArtifactInputRef}
                            value={renameArtifactValue}
                            onChange={(e) => setRenameArtifactValue(e.currentTarget.value)}
                            onBlur={() => void commitRenameArtifact(artifact.id)}
                            onKeyDown={(e) => { if (e.key === "Escape") setRenamingArtifactId(null); }}
                            className="min-w-0 flex-1 bg-transparent text-slate-100 text-sm outline-none"
                          />
                        </form>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onSelect(artifact.id)}
                            className={`flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5 text-left text-sm transition ${
                              active ? "bg-sky-500/15 text-sky-100" : "text-slate-300 hover:bg-slate-800/70"
                            }`}
                          >
                            <meta.Icon size={14} className={`shrink-0 ${active ? "text-sky-300" : meta.color}`} aria-hidden />
                            <span className="min-w-0 flex-1 truncate">
                              <span className={`mr-1.5 font-semibold ${meta.color}`}>{meta.label}</span>
                              <span className="text-slate-400">{artifact.title}</span>
                            </span>
                          </button>
                          <div className="shrink-0 pl-1 pr-1">
                            <RowMenu
                              ariaLabel="Opciones del artefacto"
                              items={[
                                { label: "Renombrar", onClick: () => startRenameArtifact(artifact) },
                                { label: "Eliminar", danger: true, onClick: () => setDeletingArtifactId(artifact.id) }
                              ]}
                              renderTrigger={({ onClick, ref, ariaExpanded, ariaLabel, menuOpen: mo }) => (
                                <button
                                  type="button"
                                  ref={ref}
                                  onClick={onClick}
                                  className={`flex h-6 w-6 items-center justify-center rounded-full transition focus-visible:outline-none ${
                                    mo
                                      ? "bg-slate-700 text-slate-100 opacity-100"
                                      : "text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-slate-700 hover:text-slate-100 focus-visible:opacity-100"
                                  }`}
                                  aria-label={ariaLabel}
                                  aria-haspopup="true"
                                  aria-expanded={ariaExpanded}
                                >
                                  <MoreHorizontal size={12} aria-hidden />
                                </button>
                              )}
                            />
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          </li>
        );
      })}
    </ul>
    {deletingArtifact !== null && createPortal(
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur"
        role="dialog"
        aria-modal="true"
        onClick={() => setDeletingArtifactId(null)}
      >
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="font-bold text-slate-100 text-base">¿Eliminar artefacto?</h2>
          <p className="mt-2 text-slate-400 text-sm">
            Se eliminará <strong className="text-slate-100">{deletingArtifact.title}</strong> y sus intentos. Esta acción no se puede deshacer.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeletingArtifactId(null)}
              className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 text-sm hover:border-slate-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmDeleteArtifact()}
              className="rounded-full bg-rose-500 px-5 py-2 font-bold text-slate-950 text-sm hover:bg-rose-400"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
