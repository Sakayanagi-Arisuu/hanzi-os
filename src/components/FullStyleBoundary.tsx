"use client";

import "../styles.css";

/**
 * Route-scoped stylesheet boundary. Rendering this zero-layout client marker
 * lets the server preload the full shell CSS for standalone routes without
 * hoisting it into the cold onboarding entry.
 */
export function FullStyleBoundary() {
  return null;
}
