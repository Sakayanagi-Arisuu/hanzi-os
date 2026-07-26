type CommitDurableLearningStateOptions<T> = {
  nextState: T;
  enqueue: () => Promise<void>;
  apply: (state: T) => boolean;
};

/** Applies destructive/replacement state only after its outbox record commits. */
export const commitDurableLearningState = async <T>({
  nextState,
  enqueue,
  apply,
}: CommitDurableLearningStateOptions<T>): Promise<boolean> => {
  try {
    await enqueue();
  } catch {
    return false;
  }
  return apply(nextState);
};
