"use client";

import { useEffect, useRef } from "react";

/** Progressive enhancement: content remains visible without JS or animations. */
export function GuildLandingMotion() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = marker.current?.closest(".guild-landing");
    if (!root || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver((entries) => {
      const entering = entries.filter((entry) => entry.isIntersecting);
      entering.forEach(({ target }, index) => {
        observer.unobserve(target);
        if (seen.has(target) || preference.matches) return;
        seen.add(target);
        const animation = target.animate(
          [{ opacity: 0.35, transform: "translateY(18px)" }, { opacity: 1, transform: "translateY(0)" }],
          { duration: 600, delay: Math.min(index, 3) * 70, easing: "cubic-bezier(.2,.7,.2,1)" },
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      });
    }, { threshold: 0.12 });
    root.querySelectorAll(".guild-section-heading, .guild-journey article, .guild-feature, .guild-directory-grid article, .guild-skills article, .guild-session article, .guild-faq details, .guild-closing>div").forEach((element) => observer.observe(element));
    const stop = () => { if (preference.matches) animations.forEach((animation) => animation.cancel()); };
    preference.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      preference.removeEventListener("change", stop);
    };
  }, []);

  return <span ref={marker} hidden aria-hidden="true" />;
}
