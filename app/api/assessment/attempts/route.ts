import {
  parseRecordAssessmentAttemptCommand,
  type RecordAssessmentAttemptCommandV1,
  type RecordAssessmentAttemptReceiptV1,
} from "../../../../src/assessment/assessmentAttemptProtocol";
import { handleAssessmentMutation } from "../../../../src/server/assessmentRouteHandler";
import { ASSESSMENT_ATTEMPT_MUTATION_POLICY } from "../../../../src/server/mutationRateLimit";

export const dynamic = "force-dynamic";

export const POST = (request: Request) => handleAssessmentMutation<
  RecordAssessmentAttemptCommandV1,
  RecordAssessmentAttemptReceiptV1
>(request, {
  operationName: "assessment_attempt_record",
  authMessage: "Sign in before recording a cloud assessment response.",
  invalidCode: "INVALID_ASSESSMENT_ATTEMPT_COMMAND",
  payloadTooLargeCode: "ASSESSMENT_ATTEMPT_PAYLOAD_TOO_LARGE",
  policy: ASSESSMENT_ATTEMPT_MUTATION_POLICY,
  parse: parseRecordAssessmentAttemptCommand,
  execute: (repository, userId, command) =>
    repository.recordAttempt(userId, command),
});
