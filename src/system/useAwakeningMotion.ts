import { useEffect, type RefObject } from "react";
import { useSystemUi } from "./systemUiPreferences";
import { arrivalFrames, frameSampleIsSlow, motionAccentSelectors, motionFamilyForPath, motionSceneSelectors, type MotionQuality } from "./awakeningMotion";
import "./awakeningMotion.css";

/** Bounded, event-driven choreography: no particle canvas or perpetual RAF loop. */
export function useAwakeningMotion(mainRef: RefObject<HTMLElement | null>, path: string) {
  const { resolvedMotion, motionQuality, hydrated } = useSystemUi();
  // Measure real card content boxes before enabling native offscreen rendering.
  // No guessed heights, no removed links, and no scroll handler / per-frame work.
  useEffect(() => {
    const main = mainRef.current;
    if (!main || !path.startsWith("/path") || typeof ResizeObserver === "undefined" || !CSS.supports("content-visibility", "auto")) return;
    const cards = new Set<HTMLElement>();
    const pending = new Map<HTMLElement, number>();
    let frame = 0;
    const resize = new ResizeObserver(entries => {
      entries.forEach(entry => {
        if (entry.contentRect.height > 0) pending.set(entry.target as HTMLElement, entry.contentRect.height);
      });
      if (frame || !pending.size) return;
      // Layout writes must happen after observer delivery, not inside it.
      frame = requestAnimationFrame(() => {
        frame = 0;
        pending.forEach((height, card) => {
          if (!card.isConnected) return;
          const intrinsic = `auto ${height}px`;
          if (card.style.containIntrinsicBlockSize !== intrinsic) card.style.containIntrinsicBlockSize = intrinsic;
          if (card.style.contentVisibility !== "auto") card.style.contentVisibility = "auto";
        });
        pending.clear();
      });
    });
    const discover = () => {
      main.querySelectorAll<HTMLElement>(".lesson-node.locked").forEach(card => {
        if (!cards.has(card)) { cards.add(card); resize.observe(card); }
      });
      cards.forEach(card => { if (!card.isConnected) { resize.unobserve(card); cards.delete(card); } });
    };
    discover();
    const changes = new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element && (node.matches(".lesson-node") || node.querySelector(".lesson-node"))))) discover();
    });
    changes.observe(main, { childList: true, subtree: true });
    return () => { changes.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); pending.clear(); cards.forEach(card => { card.style.removeProperty("content-visibility"); card.style.removeProperty("contain-intrinsic-block-size"); }); };
  }, [mainRef, path]);

  useEffect(() => {
    const main = mainRef.current;
    const root = main?.closest<HTMLElement>(".app-frame");
    if (!main || !root || !hydrated) return;
    const family = motionFamilyForPath(path);
    root.dataset.awakeningFamily = family;
    root.dataset.motionQuality = motionQuality;
    if (resolvedMotion === "reduced" || typeof main.animate !== "function") return;

    let quality: MotionQuality = motionQuality;
    const running = new Map<Element, Animation>();
    const seen = new WeakSet<Element>();
    const observed = new Set<Element>();
    const accentSelector = motionAccentSelectors[family];
    const selector = `h1, ${motionSceneSelectors[family]}, ${accentSelector}`;
    let sampleFrame = 0;
    let sampled = false;
    let lastInteraction = 0;
    let disposed = false;
    const limit = () => quality === "light" ? 3 : resolvedMotion === "cinematic" ? 8 : 5;
    const startSample = () => {
      if (sampled || quality === "light") return;
      sampled = true;
      const samples: number[] = [];
      let previous = 0;
      const sample = (time: number) => {
        if (disposed || document.hidden) return;
        if (previous) samples.push(time - previous);
        previous = time;
        if (samples.length < 24) sampleFrame = requestAnimationFrame(sample);
        else if (frameSampleIsSlow(samples)) {
          quality = "light";
          root.dataset.motionQuality = "light";
          // Release excess composited layers immediately on a slow device.
          [...running.values()].slice(3).forEach(animation => animation.cancel());
        }
      };
      sampleFrame = requestAnimationFrame(sample);
    };
    const play = (target: Element, accent = false, delay = 0, press = false) => {
      if (disposed || document.hidden || !target.isConnected || running.size >= limit()) return;
      running.get(target)?.cancel();
      const frames = press
        ? [{ transform: "scale(1)" }, { transform: "scale(.975)", offset: .3 }, { transform: "scale(1)" }]
        : arrivalFrames(family, quality, accent).map(({ transform, offset }) => ({ transform, offset }));
      const animation = target.animate(frames, {
        duration: press ? 190 : quality === "light" ? 220 : accent ? 480 : 360,
        delay: quality === "light" ? 0 : Math.min(delay, 120),
        easing: "cubic-bezier(.2,.75,.25,1)",
        composite: "add",
      });
      running.set(target, animation);
      const release = () => { if (running.get(target) === animation) running.delete(target); };
      animation.onfinish = release;
      animation.oncancel = release;
      startSample();
    };
    const reveal = (target: Element, index = 0) => {
      if (seen.has(target)) return;
      seen.add(target);
      play(target, target.matches(accentSelector), index * 35);
    };
    const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
      let index = 0;
      for (const entry of entries) {
        entry.target.setAttribute("data-motion-visible", String(entry.isIntersecting));
        if (entry.isIntersecting) reveal(entry.target, index++);
        else running.get(entry.target)?.cancel();
      }
    }, { threshold: .12 }) : null;
    const register = (node: Element) => {
      if (node.closest(".awakening-vignette")) return;
      const candidates = [...(node.matches(selector) ? [node] : []), ...node.querySelectorAll(selector)];
      for (const target of candidates) {
        if (observed.has(target) || target.closest("[hidden], [data-motion-ignore]")) continue;
        if (!target.matches(accentSelector) && target.closest("[aria-hidden='true']")) continue;
        // Bounded observation even for full catalogs. Existing content stays visible.
        if (observed.size >= 280) break;
        observed.add(target);
        if (observer) observer.observe(target);
        else reveal(target);
      }
    };
    register(root);
    const mutations = new MutationObserver(records => {
      if (records.some(record => record.removedNodes.length)) for (const target of observed) {
        if (!target.isConnected) { observer?.unobserve(target); observed.delete(target); running.get(target)?.cancel(); }
      }
      const textChanges = new Set<Element>();
      for (const record of records) {
        if (record.type === "childList") {
          for (const node of record.addedNodes) if (node instanceof Element) register(node);
          if ([...record.addedNodes].some(node => node.nodeType === Node.TEXT_NODE) && record.target instanceof Element) {
            const title = record.target.closest("h1, h2, .jade-hanzi, .pronunciation-focus-word, .lex-large-hanzi, .memory-character, .prediction-glyph");
            if (title) textChanges.add(title);
          }
        } else if (record.type === "characterData") {
          const title = record.target.parentElement?.closest("h1, h2, .jade-hanzi, .pronunciation-focus-word, .lex-large-hanzi, .memory-character, .prediction-glyph");
          if (title) textChanges.add(title);
        } else if (record.target instanceof Element) {
          const target = record.target;
          if (record.attributeName === "hidden" && !target.hasAttribute("hidden")) register(target);
          if (target.matches("[aria-checked='true'], [aria-selected='true']")) {
            const glyph = target.querySelector("svg, [aria-hidden='true']");
            if (glyph) play(glyph, true);
            else play(target, false, 0, true);
          }
          else if (target.matches("[data-screen], [data-motion-scene], [data-phase], [data-tab]")) {
            target.querySelectorAll(selector).forEach((child, index) => play(child, child.matches(accentSelector), index * 35));
            root.dispatchEvent(new Event("hanzi:awakening"));
          } else if (target.matches(selector) && !target.closest("[hidden], [aria-hidden='true']")) play(target, target.matches(accentSelector));
        }
      }
      textChanges.forEach(target => play(target, target.matches(accentSelector)));
    });
    mutations.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-checked", "aria-selected", "hidden", "data-screen", "data-state", "data-motion-scene", "data-phase", "data-tab"] });
    const interact = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest("button, a, summary, label");
      if (!target || target.matches(":disabled, [aria-disabled='true']") || target.closest("[data-motion-ignore]")) return;
      const now = performance.now();
      if (now - lastInteraction < 100) return;
      lastInteraction = now;
      root.dispatchEvent(new Event("hanzi:awakening"));
      // Activate the icon with this area's motif; button bounds never move.
      const icon = target.querySelector("svg, .chapter-spirit-seal, .path-level-art");
      if (icon) play(icon, true);
      else play(target, false, 0, true);
    };
    const visibility = () => {
      root.dataset.motionIdle = String(document.hidden);
      if (document.hidden) { running.forEach(animation => animation.cancel()); cancelAnimationFrame(sampleFrame); }
    };
    root.addEventListener("click", interact, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    visibility();
    return () => {
      disposed = true;
      observer?.disconnect();
      observed.forEach(target => target.removeAttribute("data-motion-visible"));
      mutations.disconnect();
      running.forEach(animation => animation.cancel());
      cancelAnimationFrame(sampleFrame);
      root.removeEventListener("click", interact);
      document.removeEventListener("visibilitychange", visibility);
      delete root.dataset.motionIdle;
      delete root.dataset.awakeningFamily;
      delete root.dataset.motionQuality;
    };
  }, [hydrated, mainRef, motionQuality, path, resolvedMotion]);
}
