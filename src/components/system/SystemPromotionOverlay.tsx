import { Award, ChevronRight, FastForward, Orbit } from "lucide-react";
import { useEffect, useId, useMemo, useRef } from "react";
import { useLocation } from "react-router";
import { deriveSystemCeremonies } from "../../system/systemProgression";
import { emitSystemSignal } from "../../system/systemSignals";
import { useSystemUi } from "../../system/systemUiPreferences";
import { useLearning } from "../../store/LearningStore";

export function SystemPromotionOverlay() {
  const location = useLocation();
  const { state } = useLearning();
  const {
    preferences,
    hydrated,
    markCeremoniesSeen,
    resolvedMotion,
  } = useSystemUi();
  const dialogRef = useRef<HTMLElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const ceremonies = useMemo(() => deriveSystemCeremonies(state), [state]);
  const ceremony = useMemo(() => ceremonies.find(
    (item) => !preferences.seenCeremonies.includes(item.id),
  ) ?? null, [ceremonies, preferences.seenCeremonies]);
  const onAwakeningHall = location.pathname === "/";

  useEffect(() => {
    if (!onAwakeningHall || !hydrated || !ceremony) return;
    const previous = document.activeElement;
    emitSystemSignal({
      type: "journey.promoted",
      sourceId: `ceremony:${ceremony.id}`,
      eventId: `journey-promoted:${ceremony.id}`,
      message: `Chúc mừng. ${ceremony.title}. ${ceremony.subtitle}`,
    });
    skipRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        markCeremoniesSeen(ceremonies.map((item) => item.id));
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLButtonElement>("button:not([disabled])")];
      if (!focusable.length) return;
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [ceremonies, ceremony, hydrated, markCeremoniesSeen, onAwakeningHall]);

  if (!onAwakeningHall || !hydrated || !ceremony) return null;

  const close = () => markCeremoniesSeen(ceremonies.map((item) => item.id));
  return (
    <div className="sys-promotion-scrim" data-motion={resolvedMotion}>
      <section
        ref={dialogRef}
        className="sys-promotion"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="sys-promotion-beam" aria-hidden="true" />
        <div className="sys-promotion-sigil" aria-hidden="true">
          <span><Award size={38} /></span>
          <i /><b />
        </div>
        <span className="system-kicker"><Orbit size={15} /> {ceremony.eyebrow}</span>
        <h2 id={titleId}>{ceremony.title}</h2>
        <p className="sys-promotion-subtitle">{ceremony.subtitle}</p>
        <p className="sys-promotion-disclosure" id={descriptionId}>{ceremony.disclosure}</p>
        <div className="sys-promotion-actions">
          <button ref={skipRef} className="secondary-button" type="button" onClick={close}>
            <FastForward size={17} /> Bỏ qua hiệu ứng
          </button>
          <button className="primary-button" type="button" onClick={close}>
            Xác nhận trạng thái <ChevronRight size={17} />
          </button>
        </div>
      </section>
    </div>
  );
}
