/**
 * Kept outside the durable outbox implementation so bootstrap listeners do
 * not download and evaluate every command protocol before identity is known.
 */
export const LEARNING_COMMAND_QUEUE_CHANGED_EVENT =
  "hanzi-learning-command-queue-changed";
