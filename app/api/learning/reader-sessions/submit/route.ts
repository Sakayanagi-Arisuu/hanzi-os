import {
  parseSubmitReaderSessionCommand,
  type SubmitReaderSessionCommandV1,
  type SubmitReaderSessionReceiptV1,
} from "../../../../../src/reader/readerSubmissionProtocol";
import { READER_SESSION_SUBMIT_MUTATION_POLICY } from "../../../../../src/server/mutationRateLimit";
import { handleReaderMutation } from "../../../../../src/server/readerRouteHandler";

export const dynamic = "force-dynamic";

export const POST = (request: Request) => handleReaderMutation<
  SubmitReaderSessionCommandV1,
  SubmitReaderSessionReceiptV1
>(request, {
  operationName: "reader_session_submit",
  authMessage: "Sign in before submitting a cloud Reader session.",
  invalidCode: "INVALID_READER_SUBMISSION_COMMAND",
  payloadTooLargeCode: "READER_SUBMISSION_PAYLOAD_TOO_LARGE",
  policy: READER_SESSION_SUBMIT_MUTATION_POLICY,
  parse: parseSubmitReaderSessionCommand,
  execute: (repository, userId, command) =>
    repository.submitSession(userId, command),
});
