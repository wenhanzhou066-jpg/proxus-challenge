import type { MouseEvent } from "react";

interface ResizeHandleProps {
  readonly onResize: (clientX: number) => void;
}

export function ResizeHandle({ onResize }: ResizeHandleProps) {
  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    const move = (ev: globalThis.MouseEvent) => onResize(ev.clientX);
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="group relative z-10 w-px shrink-0 cursor-col-resize bg-slate-800 transition-colors hover:bg-sky-500/60"
      role="separator"
      aria-orientation="vertical"
    >
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
    </div>
  );
}
