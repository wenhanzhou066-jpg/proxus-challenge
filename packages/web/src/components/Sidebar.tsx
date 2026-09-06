import { useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { CheckCircle2, MoreHorizontal, PanelLeft, Plus, Settings, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { artifactsQuery } from "../domain/artifacts/atoms.ts";
import { materialsQuery } from "../domain/materials/atoms.ts";
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
  const materials = useAtomValue(materialsQuery);
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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

  useEffect(() => {
    if (openMenuId === null) return;
    function close(e: MouseEvent) {
      if (!(e.target as Element).closest("[data-assignment-menu]")) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openMenuId]);

  function startRename(assignment: Assignment) {
    setOpenMenuId(null);
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
        <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 font-extrabold text-white">
          P
        </div>
        <div className="min-w-0 flex-1">
          <strong className="block text-slate-100">Proxus Tutor</strong>
          <span className="block text-slate-400 text-sm">Academic assistant</span>
        </div>
        {onToggleCollapse !== undefined && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Hide sidebar"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-slate-700 text-slate-400 transition hover:border-sky-400 hover:bg-sky-500/15 hover:text-sky-300"
          >
            <PanelLeft size={18} aria-hidden />
          </button>
        )}
      </div>

      {showAssignments && (
        <section className="mb-6 px-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-widest">Assignments</h2>
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
                  title="Nueva asignatura"
                  aria-label="Nueva asignatura"
                  className="grid size-7 shrink-0 place-items-center rounded-full border border-slate-700 text-slate-300 transition hover:border-sky-400 hover:bg-sky-500/15 hover:text-sky-300 focus-visible:border-sky-400 focus-visible:outline-none"
                >
                  <Plus size={16} strokeWidth={2.2} aria-hidden />
                </button>
              </div>
            )}
          </div>
          {assignments.length === 0 ? (
            <p className="text-slate-400 text-sm">Create one to start a chat scoped to a subject.</p>
          ) : (
            <ul className="grid gap-0.5">
              {assignments.map((assignment) => {
                const active = assignment.id === currentAssignmentId;
                const menuOpen = openMenuId === assignment.id;
                const isRenaming = renamingId === assignment.id;
                return (
                  <li
                    key={assignment.id}
                    className={`group relative flex items-center rounded-xl border transition ${
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

                        <div className="relative shrink-0 pr-1.5" data-assignment-menu>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : assignment.id); }}
                            className={`flex h-6 w-6 items-center justify-center rounded-full transition focus-visible:outline-none mr-1.5 ${
                              menuOpen
                                ? "bg-slate-700 text-slate-100 opacity-100"
                                : "text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-slate-700 hover:text-slate-100 focus-visible:opacity-100"
                            }`}
                            aria-label="Assignment options"
                            aria-haspopup="true"
                            aria-expanded={menuOpen}
                          >
                            <MoreHorizontal size={14} aria-hidden />
                          </button>

                          {menuOpen && (
                            <div
                              className="absolute right-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl"
                              data-assignment-menu
                            >
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); startRename(assignment); }}
                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-slate-200 text-sm transition hover:bg-slate-800"
                              >
                                Rename
                              </button>
                              {onDeleteAssignment !== undefined && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setDeletingId(assignment.id);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-rose-300 text-sm transition hover:bg-slate-800"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
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
          <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-widest">Materials</h2>
        </div>
        {AsyncResult.matchWithError(materials, {
          onInitial: () => <p className="text-slate-400">Loading materials…</p>,
          onError: (error) => <p className="text-red-200">{String(error)}</p>,
          onDefect: (defect) => <p className="text-red-200">{String(defect)}</p>,
          onSuccess: ({ value }) => value.materials.length === 0
            ? <p className="text-slate-400">No uploaded PDFs yet.</p>
            : (
                <details className="rounded-2xl border border-slate-800 bg-slate-900">
                  <summary className="cursor-pointer px-4 py-3 font-medium text-slate-100 marker:text-sky-400">
                    {value.materials.length} material{value.materials.length === 1 ? "" : "s"}
                  </summary>
                  <ul className="grid gap-2 border-slate-800 border-t p-3">
                    {value.materials.map((material) => (
                      <li className="rounded-xl bg-slate-950/70 p-3" key={material.id}>
                        <strong className="block text-slate-100">{material.title}</strong>
                        <span className="mt-1 block text-slate-400 text-sm">{material.pageCount} pages · {material.fileName}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )
        })}
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="font-semibold text-slate-300 text-sm uppercase tracking-widest">Artifacts</h2>
        </div>
        {AsyncResult.matchWithError(artifacts, {
          onInitial: () => <p className="text-slate-400">Loading artifacts…</p>,
          onError: (error) => <p className="text-red-200">{String(error)}</p>,
          onDefect: (defect) => <p className="text-red-200">{String(defect)}</p>,
          onSuccess: ({ value }) => value.artifacts.length === 0
            ? <p className="text-slate-400">No notes, quizzes, or tests yet.</p>
            : (
                <details className="rounded-2xl border border-slate-800 bg-slate-900">
                  <summary className="cursor-pointer px-4 py-3 font-medium text-slate-100 marker:text-sky-400">
                    {value.artifacts.length} artifact{value.artifacts.length === 1 ? "" : "s"}
                  </summary>
                  <ul className="grid gap-2 border-slate-800 border-t p-3">
                    {value.artifacts.map((artifact) => (
                      <li key={artifact.id}>
                        <button
                          className={`w-full rounded-xl p-3 text-left transition hover:border-sky-500 hover:bg-slate-950 ${
                            selectedArtifactId === artifact.id
                              ? "border border-sky-500 bg-sky-950/40"
                              : "border border-transparent bg-slate-950/70"
                          }`}
                          type="button"
                          onClick={() => onSelectArtifact(artifact.id)}
                        >
                          <strong className="block text-slate-100">{artifact.title}</strong>
                          <span className="mt-1 block text-slate-400 text-sm">{artifact.kind} · {artifact.id}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
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
          <h2 className="font-bold text-slate-100 text-base">Delete assignment?</h2>
          <p className="mt-2 text-slate-400 text-sm">
            "<span className="font-semibold text-slate-200">{deletingAssignment.title}</span>"
          </p>
          <p className="mt-1 text-rose-400 text-xs font-medium">This action is irreversible.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setDeletingId(null)}
              className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 text-sm transition hover:border-slate-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (onDeleteAssignment !== undefined) onDeleteAssignment(deletingAssignment.id);
                setDeletingId(null);
              }}
              className="rounded-full bg-rose-600 px-5 py-2 font-bold text-white text-sm ring-2 ring-rose-500/60 shadow-lg shadow-rose-700/40 transition hover:bg-rose-500 hover:ring-rose-400/70"
            >
              Delete
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
            ¿Borrar {selectedIds.size} asignatura{selectedIds.size === 1 ? "" : "s"}?
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
