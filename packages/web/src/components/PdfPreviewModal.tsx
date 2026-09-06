import { useEffect } from "react";
import type { Material } from "../domain/assignments/types.ts";

interface Props {
  readonly material: Material;
  readonly onClose: () => void;
}

export function PdfPreviewModal({ material, onClose }: Props) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${material.name}`}
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-slate-800 border-b px-5 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-100">{material.name}</p>
            <p className="text-slate-500 text-xs">
              Local preview — uses your browser's built-in PDF viewer.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={material.dataUrl}
              download={material.name}
              className="rounded-full border border-slate-700 px-3 py-1 text-slate-300 text-sm hover:border-sky-400 hover:text-sky-200"
            >
              Download
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
              aria-label="Close preview"
            >
              ×
            </button>
          </div>
        </header>
        <iframe
          src={material.dataUrl}
          title={material.name}
          className="h-full w-full flex-1 bg-slate-950"
        />
      </div>
    </div>
  );
}
