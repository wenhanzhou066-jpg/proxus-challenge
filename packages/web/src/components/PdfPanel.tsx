import { ChevronLeft, ChevronRight, Columns, Download, FileText, Minus, Plus, RotateCcw, RotateCw, X } from "lucide-react";
import { memo, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
// @ts-expect-error — Vite ?url suffix
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { Material } from "../domain/assignments/types.ts";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfPanelProps {
  readonly materials: ReadonlyArray<Material>;
  readonly selectedId: string;
  readonly onSelectId: (id: string) => void;
  readonly onClose: () => void;
  readonly style?: CSSProperties;
  readonly className?: string;
}

const ZOOM_STEPS = [0.6, 0.75, 1, 1.25, 1.5] as const;
const ZOOM_DEFAULT_INDEX = 2;
const COMPACT_WIDTH = 380; // hide zoom controls below this panel width

export const PdfPanel = memo(_PdfPanel);

function _PdfPanel({ materials, selectedId, onSelectId, onClose, style, className = "" }: PdfPanelProps) {
  const selected = materials.find((m) => m.id === selectedId) ?? materials[0];
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomIndex, setZoomIndex] = useState<number>(ZOOM_DEFAULT_INDEX);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [viewMode, setViewMode] = useState<"single" | "continuous">("single");
  const [panelWidth, setPanelWidth] = useState(480);
  const [canvasWidth, setCanvasWidth] = useState(432);
  const [loadError, setLoadError] = useState<string | null>(null);
  const asideRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Stable file object per material — prevents react-pdf reload loop
  const fileProp = useMemo(
    () => (selected !== undefined ? { url: selected.dataUrl } : null),
    [selected?.id]
  );

  // Track panel + canvas widths for responsive rendering (rAF-throttled to avoid layout thrash while dragging)
  useEffect(() => {
    const aside = asideRef.current;
    const canvas = canvasRef.current;
    if (aside === null || canvas === null) return;
    let raf = 0;
    const obs = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setPanelWidth(aside.clientWidth);
        setCanvasWidth(canvas.clientWidth);
      });
    });
    obs.observe(aside);
    obs.observe(canvas);
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  // Reset on material change
  useEffect(() => {
    setNumPages(0);
    setCurrentPage(1);
    setZoomIndex(ZOOM_DEFAULT_INDEX);
    setRotation(0);
    setLoadError(null);
  }, [selected?.id]);

  // Keyboard navigation (single mode only)
  useEffect(() => {
    if (viewMode !== "single") return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target !== null && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key === "ArrowLeft") {
        setCurrentPage((p) => Math.max(1, p - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentPage((p) => (numPages > 0 ? Math.min(numPages, p + 1) : p));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [numPages, viewMode]);

  if (selected === undefined) return null;

  const scale = ZOOM_STEPS[zoomIndex] ?? 1;
  // Debounce the width we hand to react-pdf so react-pdf only re-rasters
  // once the drag settles, then keep the CSS transform in sync with the *actually
  // rendered* width — never with the requested one. This avoids the blink where
  // the wrapper snaps back to scale=1 before the new canvas is on screen.
  const [debouncedCanvasWidth, setDebouncedCanvasWidth] = useState(canvasWidth);
  const deferredCanvasWidth = useDeferredValue(debouncedCanvasWidth);
  const [renderedCanvasWidth, setRenderedCanvasWidth] = useState(canvasWidth);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCanvasWidth(canvasWidth), 120);
    return () => clearTimeout(t);
  }, [canvasWidth]);
  const pageWidth = Math.max(160, deferredCanvasWidth - 32) * scale;
  const visualScale = renderedCanvasWidth > 0 ? canvasWidth / renderedCanvasWidth : 1;
  // Skip text + annotation layers while the user is actively resizing so the
  // canvas re-render is faster and the layer redraw doesn't add its own flash.
  const isResizing = Math.abs(canvasWidth - renderedCanvasWidth) > 1;
  const canPrev = currentPage > 1;
  const canNext = numPages > 0 && currentPage < numPages;
  const showZoomControls = panelWidth >= COMPACT_WIDTH;

  return (
    <aside
      ref={asideRef}
      className={`relative flex h-full min-w-0 flex-1 flex-col overflow-hidden border-slate-800 border-l bg-slate-950 ${className}`}
      style={style}
    >
      {/* Tabs (multi-material) */}
      {materials.length > 1 && (
        <div className="flex shrink-0 overflow-x-auto border-slate-800/60 border-b bg-slate-900 px-2 pt-1.5">
          {materials.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectId(m.id)}
              title={m.name}
              className={`shrink-0 max-w-[150px] truncate rounded-t-md border-x border-t px-3 py-1 text-xs transition ${
                m.id === selected.id
                  ? "border-slate-700 bg-slate-950 font-medium text-slate-100"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-3 border-slate-800 border-b bg-slate-900 px-3 py-2">
        <button
          type="button"
          onClick={onClose}
          title="Cerrar"
          aria-label="Cerrar"
          className="grid size-7 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
        >
          <X size={14} />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <FileText size={14} className="shrink-0 text-rose-400" aria-hidden />
          <span className="min-w-0 truncate text-slate-300 text-xs">{selected.name}</span>
        </div>

        {numPages > 0 && viewMode === "single" && (
          <div className="flex h-7 shrink-0 items-center gap-0.5 rounded-full border border-slate-800 bg-slate-950 px-1">
            <ToolbarBtn onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={!canPrev} title="Página anterior">
              <ChevronLeft size={14} />
            </ToolbarBtn>
            <span className="min-w-[52px] px-1 text-center text-slate-300 text-xs tabular-nums">
              {currentPage} / {numPages}
            </span>
            <ToolbarBtn onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))} disabled={!canNext} title="Página siguiente">
              <ChevronRight size={14} />
            </ToolbarBtn>
          </div>
        )}

        {numPages > 0 && viewMode === "continuous" && (
          <span className="shrink-0 text-slate-400 text-xs tabular-nums">{numPages} páginas</span>
        )}

        <button
          type="button"
          onClick={() => setViewMode((v) => (v === "single" ? "continuous" : "single"))}
          title={viewMode === "single" ? "Ver todas las páginas" : "Ver una sola página"}
          className={`grid size-7 shrink-0 place-items-center rounded-full transition ${
            viewMode === "continuous"
              ? "bg-sky-500/15 text-sky-300 hover:bg-sky-500/25"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          }`}
        >
          <Columns size={14} />
        </button>

        {showZoomControls && (
          <div className="flex h-7 shrink-0 items-center gap-0.5 rounded-full border border-slate-800 bg-slate-950 px-1">
            <ToolbarBtn onClick={() => setZoomIndex((i) => Math.max(0, i - 1))} disabled={zoomIndex === 0} title="Alejar">
              <Minus size={14} />
            </ToolbarBtn>
            <span className="min-w-[40px] px-1 text-center text-slate-300 text-xs tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <ToolbarBtn onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))} disabled={zoomIndex === ZOOM_STEPS.length - 1} title="Acercar">
              <Plus size={14} />
            </ToolbarBtn>
          </div>
        )}

        <div className="flex h-7 shrink-0 items-center gap-0.5 rounded-full border border-slate-800 bg-slate-950 px-1">
          <ToolbarBtn onClick={() => setRotation((r) => ((r + 270) % 360) as 0 | 90 | 180 | 270)} title="Rotar −90°">
            <RotateCcw size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => setRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270)} title="Rotar +90°">
            <RotateCw size={14} />
          </ToolbarBtn>
        </div>

        <a
          href={selected.dataUrl}
          download={selected.name}
          title="Descargar"
          aria-label="Descargar PDF"
          className="grid size-7 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
        >
          <Download size={14} />
        </a>
      </div>

      {/* Page canvas — scrolls independently */}
      <div
        ref={canvasRef}
        className="flex min-h-0 flex-1 justify-center overflow-auto p-4"
        style={{ backgroundColor: "var(--pdf-canvas)" }}
      >
        <div
          className={viewMode === "single" ? "my-auto flex-shrink-0" : "flex flex-shrink-0 flex-col gap-4"}
          style={{ transform: `scale(${visualScale})`, transformOrigin: "top center", willChange: "transform" }}
        >
          <Document
            key={selected.id}
            file={fileProp}
            onLoadSuccess={({ numPages: n }) => { setNumPages(n); setLoadError(null); }}
            onLoadError={(err) => setLoadError(err.message)}
            loading={
              <div className="flex items-center justify-center py-16">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-500 border-t-white" />
              </div>
            }
            error={
              <div className="max-w-xs py-10 text-center text-neutral-300 text-sm">
                <p className="font-medium text-neutral-100">No se pudo cargar el PDF</p>
                {loadError !== null && <p className="mt-1 text-neutral-400 text-xs break-all">{loadError}</p>}
              </div>
            }
          >
            {numPages > 0 && viewMode === "single" && (
              <Page
                pageNumber={currentPage}
                width={pageWidth}
                rotate={rotation}
                renderAnnotationLayer={!isResizing}
                renderTextLayer={!isResizing}
                canvasBackground="#14121F"
                onRenderSuccess={() => setRenderedCanvasWidth(deferredCanvasWidth)}
                className="shadow-2xl"
              />
            )}
            {numPages > 0 && viewMode === "continuous" && (
              <div className="flex flex-col gap-4">
                {Array.from({ length: numPages }, (_, i) => (
                  <Page
                    key={i + 1}
                    pageNumber={i + 1}
                    width={pageWidth}
                    rotate={rotation}
                    renderAnnotationLayer={!isResizing}
                    renderTextLayer={!isResizing}
                    canvasBackground="#14121F"
                    {...(i === 0 ? { onRenderSuccess: () => setRenderedCanvasWidth(deferredCanvasWidth) } : {})}
                    className="shadow-2xl"
                  />
                ))}
              </div>
            )}
          </Document>
        </div>
      </div>

      {/* Floating page nav — single mode only */}
      {numPages > 1 && viewMode === "single" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={!canPrev}
            title="Página anterior"
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/85 text-slate-200 shadow-lg backdrop-blur-sm transition hover:bg-slate-800 hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" clipRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={!canNext}
            title="Página siguiente"
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/85 text-slate-200 shadow-lg backdrop-blur-sm transition hover:bg-slate-800 hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" clipRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
}

function ToolbarBtn({
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
      className="grid size-6 place-items-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
