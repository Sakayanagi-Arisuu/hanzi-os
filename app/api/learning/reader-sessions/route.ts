import {
  parseOpenReaderSessionCommand,
  type OpenReaderSessionCommandV1,
  type OpenReaderSessionReceiptV1,
} from "../../../../src/reader/readerSessionProtocol";
import { READER_SESSION_OPEN_MUTATION_POLICY } from "../../../../src/server/mutationRateLimit";
import { handleReaderMutation } from "../../../../src/server/readerRouteHandler";

export const dynamic = "force-dynamic";

export const POST = (request: Request) => handleReaderMutation<
  OpenReaderSessionCommandV1,
  OpenReaderSessionReceiptV1
>(request, {
  operationName: "reader_session_open",
  authMessage: "Sign in before opening a cloud Reader session.",
  invalidCode: "INVALID_READER_SESSION_COMMAND",
  payloadTooLargeCode: "READER_SESSION_PAYLOAD_TOO_LARGE",
  policy: READER_SESSION_OPEN_MUTATION_POLICY,
  parse: parseOpenReaderSessionCommand,
  execute: (repository, userId, command) =>
    repository.openSession(userId, command),
});
