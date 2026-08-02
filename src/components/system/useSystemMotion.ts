import { useEffect, useState } from "react";
import { useSystemUi } from "../../system/systemUiPreferences";

export function useSystemMotion() {
  const { resolvedMotion } = useSystemUi();
  const [finePointer, setFinePointer] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updatePointer = () => setFinePointer(pointer.matches);
    const updateVisibility = () => setVisible(document.visibilityState === "visible");
    updatePointer();
    updateVisibility();
    pointer.addEventListener("change", updatePointer);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      pointer.removeEventListener("change", updatePointer);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  return {
    resolvedMotion,
    reduced: resolvedMotion === "reduced",
    cinematic: resolvedMotion === "cinematic",
    pointerDepth: finePointer && visible && resolvedMotion !== "reduced",
    visible,
  };
}
