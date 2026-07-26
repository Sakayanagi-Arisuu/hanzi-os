import {
  parseAbandonAssessmentSessionCommand,
  type AbandonAssessmentSessionCommandV1,
  type AbandonAssessmentSessionReceiptV1,
} from "../../../../../src/assessment/assessmentAbandonmentProtocol";
import { handleAssessmentMutation } from "../../../../../src/server/assessmentRouteHandler";
import { ASSESSMENT_SESSION_ABANDON_MUTATION_POLICY } from "../../../../../src/server/mutationRateLimit";

export const dynamic = "force-dynamic";

export const POST = (request: Request) => handleAssessmentMutation<
  AbandonAssessmentSessionCommandV1,
  AbandonAssessmentSessionReceiptV1
>(request, {
  operationName: "assessment_session_abandon",
  authMessage: "Sign in before abandoning a cloud assessment session.",
  invalidCode: "INVALID_ASSESSMENT_ABANDONMENT_COMMAND",
  payloadTooLargeCode: "ASSESSMENT_ABANDONMENT_PAYLOAD_TOO_LARGE",
  policy: ASSESSMENT_SESSION_ABANDON_MUTATION_POLICY,
  parse: parseAbandonAssessmentSessionCommand,
  execute: (repository, userId, command) =>
    repository.abandonSession(userId, command),
});
