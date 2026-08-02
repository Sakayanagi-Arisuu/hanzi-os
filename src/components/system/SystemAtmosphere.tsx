import { useEffect, useRef } from "react";
import { useSystemMotion } from "./useSystemMotion";

const GLYPHS = ["觉", "语", "音", "文", "忆", "境"] as const;

export function SystemAtmosphere() {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const { pointerDepth, cinematic, visible } = useSystemMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !pointerDepth || !visible) return;
    const handlePointer = (event: PointerEvent) => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const x = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
        const y = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
        root.style.setProperty("--sys-pointer-x", `${(x * 18).toFixed(2)}px`);
        root.style.setProperty("--sys-pointer-y", `${(y * 12).toFixed(2)}px`);
      });
    };
    window.addEventListener("pointermove", handlePointer, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointer);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [pointerDepth, visible]);

  return (
    <div
      ref={rootRef}
      className={`sys-atmosphere ${cinematic ? "is-cinematic" : ""}`}
      aria-hidden="true"
    >
      <span className="sys-void" />
      <span className="sys-perspective-grid" />
      <span className="sys-orbit sys-orbit-a" />
      <span className="sys-orbit sys-orbit-b" />
      <span className="sys-axis sys-axis-x" />
      <span className="sys-axis sys-axis-y" />
      <span className="sys-depth-flare" />
      <span className="sys-glyph-field">
        {GLYPHS.map((glyph, index) => (
          <i
            key={glyph}
            style={{
              "--sys-glyph-index": index,
              "--sys-glyph-x": `${61 + index * 6}%`,
              "--sys-glyph-y": `${8 + index * 14}%`,
              "--sys-glyph-z": `${(index + 1) * -18}px`,
            } as React.CSSProperties}
          >
            {glyph}
          </i>
        ))}
      </span>
    </div>
  );
}
