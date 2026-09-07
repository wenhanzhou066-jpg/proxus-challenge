import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface RowMenuItem {
  readonly label: string;
  readonly onClick: () => void;
  readonly danger?: boolean;
}

interface Props {
  readonly items: ReadonlyArray<RowMenuItem>;
  readonly ariaLabel: string;
  readonly renderTrigger: (props: {
    readonly onClick: (e: React.MouseEvent) => void;
    readonly ref: (el: HTMLButtonElement | null) => void;
    readonly ariaExpanded: boolean;
    readonly ariaLabel: string;
    readonly menuOpen: boolean;
  }) => React.ReactNode;
}

export function RowMenu({ items, ariaLabel, renderTrigger }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open || triggerRef.current === null) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 160;
    const top = rect.bottom + 4;
    const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      const t = e.target as Node;
      if (
        menuRef.current !== null && menuRef.current.contains(t)
      ) return;
      if (
        triggerRef.current !== null && triggerRef.current.contains(t)
      ) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {renderTrigger({
        onClick: (e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((prev) => !prev);
        },
        ref: (el) => { triggerRef.current = el; },
        ariaExpanded: open,
        ariaLabel,
        menuOpen: open
      })}
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[100] min-w-[160px] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
          style={{ top: pos.top, left: pos.left }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-slate-800 ${
                item.danger === true ? "text-rose-300" : "text-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
