import { X } from "lucide-react";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
} from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function ReaderDialog({
  open,
  title,
  eyebrow,
  className = "",
  returnFocusRef,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  eyebrow: string;
  className?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const returnFocus = returnFocusRef?.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = panelRef.current
        ? [...panelRef.current.querySelectorAll<HTMLElement>(focusableSelector)]
        : [];
      const first = elements[0];
      const last = elements.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      window.setTimeout(() => returnFocus?.focus(), 0);
    };
  }, [open, returnFocusRef]);

  if (!open) return null;
  const closeFromScrim = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target) onClose();
  };
  return (
    <div className="reader-dialog-scrim" onMouseDown={closeFromScrim}>
      <div
        className={`reader-dialog ${className}`}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-dialog-title"
      >
        <header>
          <div>
            <small>{eyebrow}</small>
            <h2 id="reader-dialog-title">{title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={`Đóng ${title}`}>
            <X size={21} aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
