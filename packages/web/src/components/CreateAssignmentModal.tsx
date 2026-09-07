import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { readFileAsMaterial } from "../domain/assignments/storage.ts";
import type { Material } from "../domain/assignments/types.ts";
import { PdfPreviewModal } from "./PdfPreviewModal.tsx";

interface Props {
  readonly onClose: () => void;
  readonly onCreate: (title: string, description: string, materials: ReadonlyArray<Material>) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CreateAssignmentModal({ onClose, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState<ReadonlyArray<Material>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<Material | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    titleRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleFiles(files: FileList | null) {
    if (files === null || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const added: Material[] = [];
      for (const file of Array.from(files)) {
        if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
          throw new Error(`"${file.name}" no es un PDF.`);
        }
        added.push(await readFileAsMaterial(file));
      }
      setMaterials((current) => [...current, ...added]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
      if (fileInputRef.current !== null) fileInputRef.current.value = "";
    }
  }

  function removeMaterial(id: string) {
    setMaterials((current) => current.filter((m) => m.id !== id));
  }

  function updateTags(id: string, raw: string) {
    const tags = raw
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    setMaterials((current) =>
      current.map((material) => (material.id === id ? { ...material, tags } : material))
    );
  }

  function submit() {
    if (title.trim().length === 0) return;
    onCreate(title, description, materials);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-assignment-title"
      onClick={onClose}
    >
      <div
        className="mx-auto flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-slate-800 border-b px-6 py-5">
          <div>
            <h2 id="create-assignment-title" className="m-0 font-bold text-slate-100 text-xl">
              Nueva tarea
            </h2>
            <p className="mt-1 text-slate-400 text-sm">
              Cada tarea guarda sus propios materiales, chat y progreso de estudio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-slate-100"
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-5">
          <label className="grid gap-1.5">
            <span className="font-semibold text-slate-300 text-sm">Título</span>
            <input
              ref={titleRef}
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              placeholder="ej. Programación POO"
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-400"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="font-semibold text-slate-300 text-sm">Objetivo o notas (opcional)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
              rows={2}
              placeholder="ej. Preparar el examen final sobre clases, herencia, polimorfismo"
              className="resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-sky-400"
            />
          </label>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 text-sm">Materiales PDF</span>
              <span className="text-slate-500 text-xs">{materials.length} adjuntos</span>
            </div>

            <label
              onDragEnter={(event) => {
                event.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                if (!busy && !dragging) setDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (!busy) void handleFiles(event.dataTransfer.files);
              }}
              className={`grid cursor-pointer place-items-center rounded-lg border border-dashed px-4 py-6 text-center transition ${
                busy
                  ? "border-slate-800 text-slate-600"
                  : dragging
                    ? "border-sky-400 bg-sky-500/10 text-sky-100"
                    : "border-slate-700 text-slate-400 hover:border-sky-400 hover:text-sky-200"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                onChange={(event) => void handleFiles(event.currentTarget.files)}
                className="sr-only"
                disabled={busy}
              />
              <span className="font-semibold">
                {busy ? "Leyendo…" : dragging ? "Suelta para añadir" : "Arrastra PDFs aquí o haz clic para elegir"}
              </span>
              <span className="mt-1 text-slate-500 text-xs">Solo archivos .pdf. Se guardan localmente en tu navegador.</span>
            </label>

            {materials.length > 0 && (
              <ul className="grid gap-1.5">
                {materials.map((material) => (
                  <li
                    key={material.id}
                    className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreview(material)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-slate-100 text-sm underline-offset-2 hover:underline">{material.name}</p>
                        <p className="text-slate-500 text-xs">{formatSize(material.sizeBytes)} · Vista previa</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMaterial(material.id)}
                        title="Quitar"
                        className="grid size-7 shrink-0 place-items-center rounded-full border border-slate-700 text-slate-400 transition hover:border-rose-400 hover:bg-rose-500/15 hover:text-rose-300"
                        aria-label={`Quitar ${material.name}`}
                      >
                        <X size={14} strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                    <input
                      value={material.tags.join(", ")}
                      onChange={(event) => updateTags(material.id, event.currentTarget.value)}
                      placeholder="Etiquetas (separadas por comas) — ej. POO, herencia"
                      className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-slate-100 text-xs outline-none focus:border-sky-400"
                    />
                    {material.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {material.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-sky-500/15 px-2 py-0.5 font-medium text-sky-200 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error !== null && <p className="m-0 text-rose-300 text-sm">{error}</p>}
        </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-slate-800 border-t bg-slate-900 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700 px-4 py-2 text-slate-300 hover:border-slate-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={title.trim().length === 0 || busy}
              className="rounded-full bg-sky-500 px-6 py-2.5 font-bold text-slate-950 tracking-wide shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
            >
              Crear tarea
            </button>
          </div>
        </form>
      </div>
      {preview !== null && (
        <PdfPreviewModal material={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
