import {
  parseRecordAssessmentAttemptCommand,
  type RecordAssessmentAttemptCommandV1,
  type RecordAssessmentAttemptReceiptV1,
} from "../../../../../../src/assessment/assessmentAttemptProtocol";
import { handleAssessmentMutation } from "../../../../../../src/server/assessmentRouteHandler";
import { getHskMockExamDefinition } from "../../../../../../src/server/hskMockExamBank";
import { mockExamError } from "../../../../../../src/server/hskMockExamHttp";
import { hskMockExamRepositoryOptions } from "../../../../../../src/server/hskMockExamRepository";
import { ASSESSMENT_ATTEMPT_MUTATION_POLICY } from "../../../../../../src/server/mutationRateLimit";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ level: string; form: string }> };

export async function POST(request: Request, context: Context) {
  const { level, form } = await context.params;
  const definition = getHskMockExamDefinition(level, form);
  if (!definition) return mockExamError(404, "MOCK_EXAM_NOT_FOUND", "Không tìm thấy form Mock Exam.");
  return handleAssessmentMutation<
    RecordAssessmentAttemptCommandV1,
    RecordAssessmentAttemptReceiptV1
  >(request, {
    operationName: "hsk_mock_exam_attempt_record",
    authMessage: "Sign in before recording an HSK Mock Exam answer.",
    invalidCode: "INVALID_MOCK_EXAM_ATTEMPT_COMMAND",
    payloadTooLargeCode: "MOCK_EXAM_ATTEMPT_PAYLOAD_TOO_LARGE",
    policy: ASSESSMENT_ATTEMPT_MUTATION_POLICY,
    parse: parseRecordAssessmentAttemptCommand,
    repositoryOptions: hskMockExamRepositoryOptions(definition),
    execute: (repository, userId, command) =>
      repository.recordAttempt(userId, command),
  });
}
