import {
  parseRecordReaderAttemptCommand,
  type RecordReaderAttemptCommandV1,
  type RecordReaderAttemptReceiptV1,
} from "../../../../src/reader/readerAttemptProtocol";
import { READER_ATTEMPT_MUTATION_POLICY } from "../../../../src/server/mutationRateLimit";
import { handleReaderMutation } from "../../../../src/server/readerRouteHandler";

export const dynamic = "force-dynamic";

export const POST = (request: Request) => handleReaderMutation<
  RecordReaderAttemptCommandV1,
  RecordReaderAttemptReceiptV1
>(request, {
  operationName: "reader_attempt_record",
  authMessage: "Sign in before recording a cloud Reader response.",
  invalidCode: "INVALID_READER_ATTEMPT_COMMAND",
  payloadTooLargeCode: "READER_ATTEMPT_PAYLOAD_TOO_LARGE",
  policy: READER_ATTEMPT_MUTATION_POLICY,
  parse: parseRecordReaderAttemptCommand,
  execute: (repository, userId, command) =>
    repository.recordAttempt(userId, command),
});
