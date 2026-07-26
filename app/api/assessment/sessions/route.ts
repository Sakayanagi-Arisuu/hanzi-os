import {
  parseOpenAssessmentSessionCommand,
  type OpenAssessmentSessionCommandV1,
  type OpenAssessmentSessionReceiptV1,
} from "../../../../src/assessment/assessmentSessionProtocol";
import { handleAssessmentMutation } from "../../../../src/server/assessmentRouteHandler";
import { ASSESSMENT_SESSION_OPEN_MUTATION_POLICY } from "../../../../src/server/mutationRateLimit";

export const dynamic = "force-dynamic";

export const POST = (request: Request) => handleAssessmentMutation<
  OpenAssessmentSessionCommandV1,
  OpenAssessmentSessionReceiptV1
>(request, {
  operationName: "assessment_session_open",
  authMessage: "Sign in before opening a cloud assessment session.",
  invalidCode: "INVALID_ASSESSMENT_SESSION_COMMAND",
  payloadTooLargeCode: "ASSESSMENT_SESSION_PAYLOAD_TOO_LARGE",
  policy: ASSESSMENT_SESSION_OPEN_MUTATION_POLICY,
  parse: parseOpenAssessmentSessionCommand,
  execute: (repository, userId, command) =>
    repository.openSession(userId, command),
});
