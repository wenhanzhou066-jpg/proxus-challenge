import { ChevronLeft, ChevronRight, Download, Minus, Plus, RotateCcw, RotateCw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
// @ts-expect-error — Vite ?url suffix
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { Material } from "../domain/assignments/types.ts";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const ZOOM_STEPS = [0.6, 0.75, 1, 1.25, 1.5, 2] as const;
const ZOOM_DEFAULT_INDEX = 2;

interface Props {
  readonly material: Material;
  readonly onClose: () => void;
}

export function PdfPreviewModal({ material, onClose }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomIndex, setZoomIndex] = useState<number>(ZOOM_DEFAULT_INDEX);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(720);

  const fileProp = useMemo(() => ({ url: material.dataUrl }), [material.id]);
  const scale = ZOOM_STEPS[zoomIndex] ?? 1;
  const pageWidth = Math.max(320, canvasWidth - 48) * scale;
  const canPrev = currentPage > 1;
  const canNext = numPages > 0 && currentPage < numPages;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setCurrentPage((p) => Math.max(1, p - 1));
      else if (e.key === "ArrowRight") setCurrentPage((p) => numPages > 0 ? Math.min(numPages, p + 1) : p);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, numPages]);

  useEffect(() => {
    const el = canvasRef.current;
    if (el === null) return;
    const obs = new ResizeObserver(() => setCanvasWidth(el.clientWidth));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa de ${material.name}`}
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-4 border-slate-800 border-b bg-slate-900/90 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-100 text-sm">{material.name}</p>
            {numPages > 0 && (
              <p className="mt-0.5 text-slate-500 text-xs">
                {numPages} páginas · usa ← → para navegar
              </p>
            )}
          </div>

          {numPages > 0 && (
            <div className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-slate-800 bg-slate-950 px-1">
              <ToolbarIconButton onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={!canPrev} title="Página anterior">
                <ChevronLeft size={16} />
              </ToolbarIconButton>
              <span className="min-w-[60px] px-1 text-center text-slate-300 text-xs tabular-nums">
                {currentPage} / {numPages}
              </span>
              <ToolbarIconButton onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))} disabled={!canNext} title="Página siguiente">
                <ChevronRight size={16} />
              </ToolbarIconButton>
            </div>
          )}

          <div className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-slate-800 bg-slate-950 px-1">
            <ToolbarIconButton onClick={() => setZoomIndex((i) => Math.max(0, i - 1))} disabled={zoomIndex === 0} title="Alejar">
              <Minus size={16} />
            </ToolbarIconButton>
            <span className="min-w-[44px] px-1 text-center text-slate-300 text-xs tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <ToolbarIconButton onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))} disabled={zoomIndex === ZOOM_STEPS.length - 1} title="Acercar">
              <Plus size={16} />
            </ToolbarIconButton>
          </div>

          <div className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-slate-800 bg-slate-950 px-1">
            <ToolbarIconButton onClick={() => setRotation((r) => ((r + 270) % 360) as 0 | 90 | 180 | 270)} title="Rotar −90°">
              <RotateCcw size={16} />
            </ToolbarIconButton>
            <ToolbarIconButton onClick={() => setRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270)} title="Rotar +90°">
              <RotateCw size={16} />
            </ToolbarIconButton>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <a
              href={material.dataUrl}
              download={material.name}
              title="Descargar"
              aria-label="Descargar PDF"
              className="grid size-9 place-items-center rounded-full border border-slate-700 text-slate-400 transition hover:border-sky-400 hover:bg-sky-500/10 hover:text-sky-300"
            >
              <Download size={16} strokeWidth={1.8} />
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid size-9 place-items-center rounded-full border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-slate-100"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </header>

        <div
          ref={canvasRef}
          className="relative flex min-h-0 flex-1 justify-center overflow-auto p-6"
          style={{ backgroundColor: "var(--pdf-canvas)" }}
        >
          <div className="my-auto flex-shrink-0">
            <Document
              key={material.id}
              file={fileProp}
              onLoadSuccess={({ numPages: n }) => { setNumPages(n); setLoadError(null); setCurrentPage(1); }}
              onLoadError={(err) => setLoadError(err.message)}
              loading={
                <div className="flex items-center justify-center py-16">
                  <div className="size-8 animate-spin rounded-full border-2 border-neutral-500 border-t-white" />
                </div>
              }
              error={
                <div className="max-w-sm py-10 text-center text-neutral-300 text-sm">
                  <p className="font-semibold text-neutral-100">No se pudo cargar el PDF</p>
                  {loadError !== null && <p className="mt-1 break-all text-neutral-400 text-xs">{loadError}</p>}
                </div>
              }
            >
              {numPages > 0 && (
                <Page
                  pageNumber={currentPage}
                  width={pageWidth}
                  rotate={rotation}
                  renderAnnotationLayer
                  renderTextLayer
                  className="overflow-hidden rounded-md shadow-2xl"
                />
              )}
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarIconButton({
  onClick,
  disabled,
  title,
  children
}: {
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="grid size-7 place-items-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
