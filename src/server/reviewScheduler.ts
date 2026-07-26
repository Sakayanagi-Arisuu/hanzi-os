import {
  State,
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card,
  type Grade,
} from "ts-fsrs";
import {
  REVIEW_SCHEDULER_VERSION,
  type ReviewRating,
} from "../learning/reviewProtocol";
import { canonicalStringify } from "../sync/document";

export type AuthoritativeReviewCardState = {
  schedulerVersion: typeof REVIEW_SCHEDULER_VERSION;
  dueAt: number;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: State;
  lastReviewAt: number | null;
  revision: number;
};

const scheduler = fsrs(generatorParameters({
  request_retention: 0.9,
  enable_fuzz: false,
}));

const safeNonNegativeNumber = (value: number) =>
  Number.isFinite(value) && value >= 0;

const safeNonNegativeInteger = (value: number) =>
  Number.isSafeInteger(value) && value >= 0;

const assertValidCardState = (card: AuthoritativeReviewCardState) => {
  if (
    card.schedulerVersion !== REVIEW_SCHEDULER_VERSION
    || !safeNonNegativeInteger(card.dueAt)
    || !safeNonNegativeNumber(card.stability)
    || !safeNonNegativeNumber(card.difficulty)
    || !safeNonNegativeInteger(card.elapsedDays)
    || !safeNonNegativeInteger(card.scheduledDays)
    || !safeNonNegativeInteger(card.learningSteps)
    || !safeNonNegativeInteger(card.reps)
    || !safeNonNegativeInteger(card.lapses)
    || ![State.New, State.Learning, State.Review, State.Relearning]
      .includes(card.state)
    || (
      card.lastReviewAt !== null
      && !safeNonNegativeInteger(card.lastReviewAt)
    )
    || !Number.isSafeInteger(card.revision)
    || card.revision < 1
  ) {
    throw new Error("Authoritative FSRS card state is invalid.");
  }
};

const fromCard = (
  card: Card,
  revision: number,
): AuthoritativeReviewCardState => {
  const state: AuthoritativeReviewCardState = {
    schedulerVersion: REVIEW_SCHEDULER_VERSION,
    dueAt: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReviewAt: card.last_review?.getTime() ?? null,
    revision,
  };
  assertValidCardState(state);
  return state;
};

const toCard = (card: AuthoritativeReviewCardState): Card => {
  assertValidCardState(card);
  return {
    due: new Date(card.dueAt),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    ...(card.lastReviewAt === null
      ? {}
      : { last_review: new Date(card.lastReviewAt) }),
  };
};

export const createAuthoritativeReviewCard = (
  activatedAt: number,
): AuthoritativeReviewCardState => {
  if (!safeNonNegativeInteger(activatedAt)) {
    throw new Error("Review-card activation timestamp is invalid.");
  }
  return fromCard(createEmptyCard(new Date(activatedAt)), 1);
};

export const advanceAuthoritativeReviewCard = (
  current: AuthoritativeReviewCardState,
  reviewedAt: number,
  rating: ReviewRating,
): AuthoritativeReviewCardState => {
  assertValidCardState(current);
  if (
    !safeNonNegativeInteger(reviewedAt)
    || ![1, 2, 3, 4].includes(rating)
  ) {
    throw new Error("Review scheduling input is invalid.");
  }
  return fromCard(
    scheduler.next(
      toCard(current),
      new Date(reviewedAt),
      rating as Grade,
    ).card,
    current.revision + 1,
  );
};

export const canonicalReviewCardState = (
  card: AuthoritativeReviewCardState,
) => {
  assertValidCardState(card);
  return canonicalStringify(card);
};
