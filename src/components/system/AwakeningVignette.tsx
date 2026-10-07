import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router";
import { motionFamilyForPath, type MotionFamily, type MotionQuality } from "../../system/awakeningMotion";
import { RealmIllustration } from "./RealmIllustration";
import type { SystemMotionMode } from "../../system/systemUiPreferences";

const hosts: Record<MotionFamily, string> = {
  awakening: ".hero-core-meter, .mission-sigil, .pillar-signal-core, .path-progress-core",
  path: ".path-realm-level-index, .lesson-node.current .lesson-node-icon",
  lesson: ".jade-seal, .result-sigil, .realm-emblem",
  memory: ".memory-glyph-orbit, .memory-completion-sigil, .realm-emblem",
  repair: ".rem-atlas-core, .rem-session-emblem",
  voice: ".jade-instrument",
  forge: ".guild-glyph-orbit, .realm-emblem",
  reader: ".realm-emblem",
  lexicon: ".realm-emblem",
  trial: ".dungeon-map-core, .dungeon-result-emblem, .result-sigil, .realm-emblem",
  oracle: ".realm-emblem",
  profile: ".realm-emblem",
  premium: ".realm-emblem",
};

function AnimatedDrawing({ family, light, reduced }: { family: MotionFamily; light: boolean; reduced: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const clearCenterId = useId();
  const clearCenter = family === "voice" || family === "repair";
  useEffect(() => {
    const svg = svgRef.current;
    const root = svg?.closest(".app-frame");
    if (!svg || !root || reduced) return;
    let animations: Animation[] = [];
    let previous = -2000;
    let visible = false;
    const stop = () => { animations.forEach(animation => animation.cancel()); animations = []; };
    const wake = () => {
      if (!visible || document.hidden || performance.now() - previous < 1800) return;
      previous = performance.now();
      stop();
      const groups = [...svg.querySelectorAll<SVGGElement>("g[data-act]")];
      const selected = (light || root.getAttribute("data-motion-quality") === "light") ? groups.filter(group => !["aura", "sparks"].includes(group.dataset.act!)).slice(0, 3) : groups;
      animations = selected.map((group, index) => {
        const act = group.dataset.act;
        const entry = act === "orbit" ? "rotate(-150deg) scale(.6)" : act === "swords" ? "rotate(70deg) scale(1.65)" : act === "gate-left" ? "translateX(45px)" : act === "gate-right" ? "translateX(-45px)" : act === "page-left" ? "rotateY(80deg)" : act === "page-right" ? "rotateY(-80deg)" : act === "cloud" ? "translateX(-55px)" : act === "stamp" ? "scale(2)" : act === "gather" ? "rotate(-45deg) scale(1.5)" : "scale(.25)";
        const burst = act === "shock" || act === "sparks";
        return group.animate([
          { opacity: 0, transform: entry },
          { opacity: 1, transform: "scale(1)", offset: .38 },
          { opacity: burst ? 0 : .55, transform: burst ? "scale(1.35)" : "none" },
        ], { duration: 1750, delay: burst ? 300 : index * 65, easing: "cubic-bezier(.16,.7,.25,1)" });
      });
      svg.dispatchEvent(new CustomEvent("hanzi:realm-sound", { bubbles: true, detail: { family } }));
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? false;
      if (visible) wake(); else stop();
    }, { threshold: .3 });
    observer.observe(svg);
    const visibility = () => { if (document.hidden) stop(); };
    root.addEventListener("hanzi:awakening", wake);
    document.addEventListener("visibilitychange", visibility);
    return () => { stop(); observer.disconnect(); root.removeEventListener("hanzi:awakening", wake); document.removeEventListener("visibilitychange", visibility); };
  }, [family, light, reduced]);
  return <svg ref={svgRef} className={`awakening-vignette awakening-vignette-${family}`} viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" focusable="false">{clearCenter ? <><defs><clipPath id={clearCenterId}><path clipRule="evenodd" d="M-50-50H250V250H-50Z M100 30A70 70 0 1 0 100 170A70 70 0 1 0 100 30Z" /></clipPath></defs><g clipPath={`url(#${clearCenterId})`}><RealmIllustration family={family} /></g></> : <RealmIllustration family={family} />}</svg>;
}

export function AwakeningVignette({ stageRef, mode, quality }: { stageRef: RefObject<HTMLElement | null>; mode: Exclude<SystemMotionMode,"auto">; quality: MotionQuality }) {
  const { pathname } = useLocation();
  const family = motionFamilyForPath(pathname);
  const [visibleHosts, setVisibleHosts] = useState<Element[]>([]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const candidates = new Set<Element>();
    const visible = new Set<Element>();
    const publish = () => setVisibleHosts(current => {
      const next = [...visible].filter(element => element.isConnected).sort((a, b) => Number(b.matches(".lesson-node.current .lesson-node-icon")) - Number(a.matches(".lesson-node.current .lesson-node-icon"))).slice(0, quality === "light" ? 1 : 2);
      return next.length === current.length && next.every((element, index) => element === current[index]) ? current : next;
    });
    const intersection = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target); });
      publish();
    }, { threshold: .25 });
    const discover = () => {
      candidates.forEach(element => { if (!element.isConnected) { intersection.unobserve(element); candidates.delete(element); visible.delete(element); } });
      [...stage.querySelectorAll(hosts[family])].slice(0, 24).forEach(element => {
        if (!candidates.has(element) && getComputedStyle(element).position !== "static") { candidates.add(element); intersection.observe(element); }
      });
      publish();
    };
    discover();
    const observer = new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element && !node.closest(".awakening-vignette") && (node.matches(hosts[family]) || node.querySelector(hosts[family]))))) discover();
    });
    observer.observe(stage, { childList: true, subtree: true });
    return () => { observer.disconnect(); intersection.disconnect(); };
  }, [family, pathname, quality, stageRef]);
  return <>{visibleHosts.map((host, index) => createPortal(<AnimatedDrawing key={`${pathname}:${index}`} family={family} light={quality === "light"} reduced={mode === "reduced"} />, host))}</>;
}
