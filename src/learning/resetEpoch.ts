export const MAX_LEARNING_RESET_EPOCH = 2_147_483_647;

export const isValidLearningResetEpoch = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isSafeInteger(value)
  && value >= 0
  && value <= MAX_LEARNING_RESET_EPOCH;
