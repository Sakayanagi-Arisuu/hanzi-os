import {
  parseSubmitAssessmentSessionCommand,
  type SubmitAssessmentSessionCommandV1,
  type SubmitAssessmentSessionReceiptV1,
} from "../../../../../src/assessment/assessmentSubmissionProtocol";
import { handleAssessmentMutation } from "../../../../../src/server/assessmentRouteHandler";
import { ASSESSMENT_SESSION_SUBMIT_MUTATION_POLICY } from "../../../../../src/server/mutationRateLimit";

export const dynamic = "force-dynamic";

export const POST = (request: Request) => handleAssessmentMutation<
  SubmitAssessmentSessionCommandV1,
  SubmitAssessmentSessionReceiptV1
>(request, {
  operationName: "assessment_session_submit",
  authMessage: "Sign in before submitting a cloud assessment session.",
  invalidCode: "INVALID_ASSESSMENT_SUBMISSION_COMMAND",
  payloadTooLargeCode: "ASSESSMENT_SUBMISSION_PAYLOAD_TOO_LARGE",
  policy: ASSESSMENT_SESSION_SUBMIT_MUTATION_POLICY,
  parse: parseSubmitAssessmentSessionCommand,
  execute: (repository, userId, command) =>
    repository.submitSession(userId, command),
});
