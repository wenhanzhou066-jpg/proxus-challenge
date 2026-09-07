import { FileText, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Material } from "../domain/assignments/types.ts";

interface Props {
  readonly assignmentTitle: string;
  readonly materials: ReadonlyArray<Material>;
  readonly onOpen: (materialId: string) => void;
  readonly onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Grid of material cards. Click → close library and open PDF in the side panel.
 * Cards intentionally show a stylized cover instead of rendering real PDF thumbnails
 * to keep the modal instant even with many/large PDFs.
 */
export function MaterialsLibrary({ assignmentTitle, materials, onOpen, onClose }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return materials;
    return materials.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      m.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [materials, query]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Biblioteca de materiales"
      onClick={onClose}
    >
      <div
        className="mx-auto flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-slate-800 border-b px-6 py-5">
          <div className="min-w-0">
            <p className="text-slate-500 text-xs uppercase tracking-widest">{assignmentTitle}</p>
            <h2 className="mt-1 font-bold text-slate-100 text-xl">Materiales de la tarea</h2>
            <p className="mt-1 text-slate-400 text-sm">
              {materials.length} PDF{materials.length === 1 ? "" : "s"} · click en uno para abrirlo en el panel lateral
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-slate-100"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </header>

        {materials.length > 3 && (
          <div className="shrink-0 border-slate-800 border-b px-6 py-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder="Buscar por nombre o tag…"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 text-sm outline-none focus:border-sky-400"
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {materials.length === 0 ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 text-sm">Sin resultados para "{query}".</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((material) => (
                <li key={material.id}>
                  <button
                    type="button"
                    onClick={() => { onOpen(material.id); onClose(); }}
                    className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70 text-left transition hover:-translate-y-0.5 hover:border-sky-500 hover:bg-slate-950 hover:shadow-lg hover:shadow-sky-500/10 focus-visible:border-sky-400 focus-visible:outline-none"
                  >
                    <PdfCover />
                    <div className="flex flex-1 flex-col gap-1 px-3 pt-2.5 pb-3">
                      <p className="line-clamp-2 font-semibold text-slate-100 text-sm leading-snug group-hover:text-sky-100">
                        {material.name}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {formatSize(material.sizeBytes)}
                      </p>
                      {material.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {material.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-sky-500/15 px-2 py-0.5 font-medium text-sky-200 text-[10px]"
                            >
                              {tag}
                            </span>
                          ))}
                          {material.tags.length > 3 && (
                            <span className="text-slate-500 text-[10px]">+{material.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function PdfCover() {
  return (
    <div className="relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{
        backgroundImage: "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(139,92,246,0.25), transparent 55%)"
      }} />
      <svg viewBox="0 0 48 48" fill="none" className="relative size-14 text-rose-400 drop-shadow-lg" aria-hidden>
        <path d="M12 4h18l10 10v26a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" fill="currentColor" opacity="0.15" />
        <path d="M12 4h18l10 10v26a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" stroke="currentColor" strokeWidth={1.5} />
        <path d="M30 4v10h10" stroke="currentColor" strokeWidth={1.5} />
        <text x="24" y="34" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">PDF</text>
      </svg>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center gap-2 py-10 text-center">
      <FileText size={40} strokeWidth={1.4} className="text-slate-600" aria-hidden />
      <p className="text-slate-400 text-sm">Esta tarea aún no tiene PDFs.</p>
    </div>
  );
}
