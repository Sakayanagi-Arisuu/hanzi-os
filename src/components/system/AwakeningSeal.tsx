import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { motionFamilyForPath, type MotionFamily } from "../../system/awakeningMotion";
import type { SystemMotionMode } from "../../system/systemUiPreferences";
import type { MotionQuality } from "../../system/awakeningMotion";
import { JadeSeal } from "../JadeSeal";

// Original vector ornaments. The central identity seal is preserved; each module
// awakens a different halo: route, memory facets, acoustic waves, strokes, etc.
const ornaments: Record<MotionFamily, string[]> = {
  awakening: ["M32 2L45 10L58 18V46L45 54L32 62L19 54L6 46V18L19 10Z", "M2 32H12M52 32H62M32 2V12M32 52V62", "M12 12L18 18M46 46L52 52M52 12L46 18M18 46L12 52"],
  path: ["M8 49C8 15 24 51 32 18S55 38 56 9", "M3 12H18M3 12V27M61 52H46M61 52V37", "M8 49L12 45L16 49L12 53ZM48 13L52 9L56 13L52 17Z"],
  lesson: ["M5 13Q18 4 32 13Q46 4 59 13V52Q46 44 32 52Q18 44 5 52Z", "M32 13V52", "M10 17H23M10 21H19M41 43H54M45 47H54"],
  memory: ["M32 3L58 18V46L32 61L6 46V18Z", "M32 3V13M58 18L49 23M58 46L49 41M32 61V51M6 46L15 41M6 18L15 23", "M23 6L32 11L41 6M23 58L32 53L41 58"],
  repair: ["M32 4L57 14V33Q56 51 32 61Q8 51 7 33V14Z", "M5 32H15M49 32H59", "M20 6L24 11M40 53L44 58M44 6L40 11M24 53L20 58"],
  voice: ["M19 6Q-7 32 19 58M45 6Q71 32 45 58", "M14 15Q-1 32 14 49M50 15Q65 32 50 49", "M3 27V37M61 27V37M27 3H37M27 61H37"],
  forge: ["M6 10H58M10 6V58M54 6V58M6 54H58", "M4 24H14M50 40H60M24 4V14M40 50V60", "M8 8L18 18M46 46L56 56M56 8L46 18M18 46L8 56"],
  reader: ["M6 11Q18 4 32 12Q46 4 58 11V53Q46 46 32 54Q18 46 6 53Z", "M3 15V57Q18 50 32 58Q46 50 61 57V15", "M32 5V12M32 54V61"],
  lexicon: ["M8 4H56V60H8ZM12 8H52M12 56H52", "M3 14H13M3 23H13M3 41H13M3 50H13", "M50 12H60M50 52H60"],
  trial: ["M6 59V18L16 7H48L58 18V59M16 7V59M48 7V59", "M3 59H61M24 4H40M24 60H40", "M3 22H13M51 22H61M3 44H13M51 44H61"],
  oracle: ["M32 3A29 29 0 1 1 31.99 3", "M32 3V12M61 32H52M32 61V52M3 32H12", "M11 11L17 17M47 47L53 53M53 11L47 17M17 47L11 53"],
  profile: ["M8 8H24M8 8V24M56 8H40M56 8V24M8 56H24M8 56V40M56 56H40M56 56V40", "M3 32H12M52 32H61", "M26 3H38M26 61H38"],
  premium: ["M5 18L15 28L32 5L49 28L59 18L53 52H11Z", "M12 57H52", "M2 9L5 6L8 9L5 12ZM56 9L59 6L62 9L59 12Z"],
};

export function AwakeningSeal({ resolvedMotion, motionQuality, hydrated }: {
  resolvedMotion: Exclude<SystemMotionMode, "auto">;
  motionQuality: MotionQuality;
  hydrated: boolean;
}) {
  const { pathname } = useLocation();
  const family = motionFamilyForPath(pathname);
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = svgRef.current;
    const root = svg?.closest(".app-frame");
    if (!svg || !root || !hydrated || resolvedMotion === "reduced") return;
    let animations: Animation[] = [];
    let last = -1000;
    const wake = () => {
      if (document.hidden || performance.now() - last < 650) return;
      last = performance.now();
      animations.forEach(animation => animation.cancel());
      const light = motionQuality === "light" || root.getAttribute("data-motion-quality") === "light";
      const paths = [...svg.querySelectorAll("path")];
      animations = paths.slice(0, light ? 1 : 3).map((target, index) => target.animate([
        { strokeDashoffset: 1, opacity: .12 },
        { strokeDashoffset: 0, opacity: 1, offset: .65 },
        { strokeDashoffset: 0, opacity: .35 },
      ], { duration: light ? 380 : 800, delay: index * 55, easing: "cubic-bezier(.2,.7,.2,1)" }));
      if (!light) {
        const frames: Record<string, Keyframe[]> = {
          voice: [{ transform: "scale(.8)", opacity: .25 }, { transform: "scale(1.1)", opacity: 1 }, { transform: "scale(1)", opacity: .35 }],
          oracle: [{ transform: "rotate(-35deg)" }, { transform: "rotate(0deg)" }],
          forge: [{ transform: "translateY(-3px)" }, { transform: "translateY(1px)" }, { transform: "translateY(0)" }],
          memory: [{ transform: "rotateY(-65deg)" }, { transform: "rotateY(0deg)" }],
          trial: [{ transform: "scale(1.3)", opacity: 0 }, { transform: "scale(.98)", opacity: 1 }, { transform: "scale(1)", opacity: .35 }],
          path: [{ transform: "scaleX(.55)" }, { transform: "scaleX(1)" }],
          reader: [{ transform: "rotateY(40deg)" }, { transform: "rotateY(0deg)" }],
        };
        if (frames[family]) animations.push(svg.animate(frames[family], { duration: 650, easing: "cubic-bezier(.16,1,.3,1)" }));
      }
    };
    const stop = () => { if (document.hidden) animations.forEach(animation => animation.cancel()); };
    wake();
    root.addEventListener("hanzi:awakening", wake);
    document.addEventListener("visibilitychange", stop);
    return () => { animations.forEach(animation => animation.cancel()); root.removeEventListener("hanzi:awakening", wake); document.removeEventListener("visibilitychange", stop); };
  }, [family, hydrated, motionQuality, pathname, resolvedMotion]);
  return <button type="button" className="awakening-seal" aria-label="Phát lại hoạt cảnh thức tỉnh" title="Phát lại hoạt cảnh thức tỉnh" data-system-silent="true" onClick={event => event.currentTarget.closest(".app-frame")?.dispatchEvent(new CustomEvent("hanzi:awakening"))}>
    <JadeSeal />
    <svg ref={svgRef} className="awakening-seal-halo" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth=".8">
      {ornaments[family].map((d, index) => <path key={`${family}:${index}`} d={d} pathLength={1} strokeDasharray={1} />)}
    </svg>
  </button>;
}
