import {
  parseAbandonReaderSessionCommand,
  type AbandonReaderSessionCommandV1,
  type AbandonReaderSessionReceiptV1,
} from "../../../../../src/reader/readerAbandonmentProtocol";
import { READER_SESSION_ABANDON_MUTATION_POLICY } from "../../../../../src/server/mutationRateLimit";
import { handleReaderMutation } from "../../../../../src/server/readerRouteHandler";

export const dynamic = "force-dynamic";

export const POST = (request: Request) => handleReaderMutation<
  AbandonReaderSessionCommandV1,
  AbandonReaderSessionReceiptV1
>(request, {
  operationName: "reader_session_abandon",
  authMessage: "Sign in before abandoning a cloud Reader session.",
  invalidCode: "INVALID_READER_ABANDONMENT_COMMAND",
  payloadTooLargeCode: "READER_ABANDONMENT_PAYLOAD_TOO_LARGE",
  policy: READER_SESSION_ABANDON_MUTATION_POLICY,
  parse: parseAbandonReaderSessionCommand,
  execute: (repository, userId, command) =>
    repository.abandonSession(userId, command),
});
