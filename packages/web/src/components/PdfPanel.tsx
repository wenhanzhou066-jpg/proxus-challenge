import { useEffect, useMemo, useRef, useState } from "react";
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
}

const ZOOM_STEPS = [0.6, 0.75, 1, 1.25, 1.5] as const;
const ZOOM_DEFAULT_INDEX = 2;
const COMPACT_WIDTH = 380; // hide zoom controls below this panel width

export function PdfPanel({ materials, selectedId, onSelectId, onClose, style }: PdfPanelProps) {
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

  // Track panel + canvas widths for responsive rendering
  useEffect(() => {
    const aside = asideRef.current;
    const canvas = canvasRef.current;
    if (aside === null || canvas === null) return;
    const obs = new ResizeObserver(() => {
      setPanelWidth(aside.clientWidth);
      setCanvasWidth(canvas.clientWidth);
    });
    obs.observe(aside);
    obs.observe(canvas);
    return () => obs.disconnect();
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
  const pageWidth = Math.max(160, canvasWidth - 32) * scale;
  const canPrev = currentPage > 1;
  const canNext = numPages > 0 && currentPage < numPages;
  const showZoomControls = panelWidth >= COMPACT_WIDTH;

  return (
    <aside
      ref={asideRef}
      className="relative flex min-w-0 shrink-0 flex-col overflow-hidden border-slate-800 border-l bg-slate-950"
      style={{ height: "100vh", ...style }}
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
      <div className="flex shrink-0 items-center gap-1 border-slate-800 border-b bg-slate-900 px-2 py-1.5">
        <IconButton onClick={onClose} title="Close">
          <path fillRule="evenodd" clipRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
        </IconButton>

        <svg className="size-3.5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" clipRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" />
        </svg>
        <span className="min-w-0 flex-1 truncate text-slate-400 text-xs">{selected.name}</span>

        {numPages > 0 && viewMode === "single" && (
          <div className="flex shrink-0 items-center gap-0.5">
            <SmallIconButton onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={!canPrev} title="Previous page">
              <path fillRule="evenodd" clipRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </SmallIconButton>
            <span className="min-w-[44px] text-center text-slate-400 text-xs tabular-nums">
              {currentPage} / {numPages}
            </span>
            <SmallIconButton onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))} disabled={!canNext} title="Next page">
              <path fillRule="evenodd" clipRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
            </SmallIconButton>
          </div>
        )}

        {numPages > 0 && viewMode === "continuous" && (
          <span className="shrink-0 text-slate-400 text-xs tabular-nums">{numPages} pages</span>
        )}

        <button
          type="button"
          onClick={() => setViewMode((v) => (v === "single" ? "continuous" : "single"))}
          title={viewMode === "single" ? "Scroll all pages" : "Single page view"}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
            viewMode === "continuous"
              ? "bg-sky-500/15 text-sky-400 hover:bg-sky-500/25"
              : "text-slate-500 hover:bg-slate-800 hover:text-slate-100"
          }`}
        >
          <svg className="size-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <rect x="5" y="2.5" width="10" height="4" rx="0.5" />
            <rect x="5" y="8" width="10" height="4" rx="0.5" />
            <rect x="5" y="13.5" width="10" height="4" rx="0.5" />
          </svg>
        </button>


        {showZoomControls && (
          <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-slate-800 bg-slate-950 p-0.5">
            <SmallIconButton onClick={() => setZoomIndex((i) => Math.max(0, i - 1))} disabled={zoomIndex === 0} title="Zoom out">
              <path fillRule="evenodd" clipRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" />
            </SmallIconButton>
            <span className="min-w-[32px] text-center text-slate-400 text-xs tabular-nums">
              {Math.round(scale * 100)}%
            </span>
            <SmallIconButton onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))} disabled={zoomIndex === ZOOM_STEPS.length - 1} title="Zoom in">
              <path fillRule="evenodd" clipRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
            </SmallIconButton>
          </div>
        )}

        <button
          type="button"
          onClick={() => setRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270)}
          title="Rotate 90°"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-800 hover:text-slate-100"
        >
          <svg className="size-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 4v4h-4M15 8a6 6 0 10-1.8 4.3" />
          </svg>
        </button>

        <a
          href={selected.dataUrl}
          download={selected.name}
          title="Download"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-800 hover:text-slate-100"
        >
          <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" clipRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
          </svg>
        </a>
      </div>

      {/* Page canvas — scrolls independently */}
      <div
        ref={canvasRef}
        className="flex min-h-0 flex-1 justify-center overflow-auto bg-neutral-700 p-4"
      >
        <div className={viewMode === "single" ? "my-auto flex-shrink-0" : "flex flex-shrink-0 flex-col gap-4"}>
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
                <p className="font-medium text-neutral-100">Could not load PDF</p>
                {loadError !== null && <p className="mt-1 text-neutral-400 text-xs break-all">{loadError}</p>}
              </div>
            }
          >
            {numPages > 0 && viewMode === "single" && (
              <Page
                pageNumber={currentPage}
                width={pageWidth}
                rotate={rotation}
                renderAnnotationLayer
                renderTextLayer
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
                    renderAnnotationLayer
                    renderTextLayer
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
            title="Previous page"
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
            title="Next page"
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

// ── Toolbar helpers ──
function IconButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-800 hover:text-slate-100"
    >
      <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>{children}</svg>
    </button>
  );
}

function SmallIconButton({ onClick, disabled, title, children }: { onClick: () => void; disabled?: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-5 w-5 items-center justify-center rounded text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 disabled:pointer-events-none disabled:opacity-30"
    >
      <svg className="size-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>{children}</svg>
    </button>
  );
}
