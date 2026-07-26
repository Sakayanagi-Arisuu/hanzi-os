import type { KeyboardEvent } from "react";

export type RadioNavigationKey =
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "End"
  | "Home";

export function getRadioNavigationIndex(
  key: string,
  currentIndex: number,
  itemCount: number,
): number | null {
  if (
    itemCount <= 0
    || currentIndex < 0
    || currentIndex >= itemCount
  ) return null;

  if (key === "Home") return 0;
  if (key === "End") return itemCount - 1;
  if (key === "ArrowRight" || key === "ArrowDown") {
    return (currentIndex + 1) % itemCount;
  }
  if (key === "ArrowLeft" || key === "ArrowUp") {
    return (currentIndex - 1 + itemCount) % itemCount;
  }
  return null;
}

export function handleRadioGroupKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  options: {
    currentIndex: number;
    itemCount: number;
    onSelect: (nextIndex: number) => void;
  },
) {
  const nextIndex = getRadioNavigationIndex(
    event.key,
    options.currentIndex,
    options.itemCount,
  );
  if (nextIndex === null) return;

  event.preventDefault();
  options.onSelect(nextIndex);
  const group = event.currentTarget.closest('[role="radiogroup"]');
  group
    ?.querySelector<HTMLElement>(
      `[role="radio"][data-radio-index="${nextIndex}"]:not([disabled])`,
    )
    ?.focus();
}
