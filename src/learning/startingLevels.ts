export const STARTING_LEVEL_IDS = [
  "zero",
  "basic",
  "hsk1",
  "hsk2",
  "hsk3",
  "hsk4",
] as const;

export type StartingLevel = (typeof STARTING_LEVEL_IDS)[number];

export const isStartingLevel = (value: unknown): value is StartingLevel =>
  typeof value === "string"
  && (STARTING_LEVEL_IDS as readonly string[]).includes(value);
