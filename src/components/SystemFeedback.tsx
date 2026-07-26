import { CheckCircle2, Info, ShieldAlert, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "success" | "info" | "warning";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  notify: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function SystemFeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="system-toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "warning" ? ShieldAlert : Info;
          return (
            <div className={`system-toast ${toast.tone}`} key={toast.id}>
              <Icon size={19} />
              <span>{toast.message}</span>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Đóng thông báo"><X size={16} /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useSystemFeedback() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useSystemFeedback must be used inside SystemFeedbackProvider");
  return value;
}

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  eyebrow?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Hủy thao tác",
  eyebrow = "IRREVERSIBLE PROTOCOL",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = [...modal.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) =>
        element.getAttribute("aria-hidden") !== "true"
        && !element.hidden
      );
      if (focusable.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const activeElement = document.activeElement;
      if (event.shiftKey) {
        if (activeElement === first || !modal.contains(activeElement)) {
          event.preventDefault();
          last.focus();
        }
      } else if (
        activeElement === last
        || !modal.contains(activeElement)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (
        previouslyFocused instanceof HTMLElement
        && previouslyFocused.isConnected
      ) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-scrim" onMouseDown={onCancel}>
      <section
        ref={modalRef}
        className="system-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-sigil"><ShieldAlert size={28} /><span /></div>
        <span className="system-kicker">{eyebrow}</span>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div>
          <button
            ref={cancelButtonRef}
            className="secondary-button"
            type="button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="danger-button"
            disabled={busy}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
