import {
  parseSubmitAssessmentSessionCommand,
  type SubmitAssessmentSessionCommandV1,
  type SubmitAssessmentSessionReceiptV1,
} from "../../../../../../src/assessment/assessmentSubmissionProtocol";
import { handleAssessmentMutation } from "../../../../../../src/server/assessmentRouteHandler";
import {
  isHskMockExamFormKey,
  isHskMockExamLevel,
} from "../../../../../../src/server/hskMockExamBank";
import { mockExamError } from "../../../../../../src/server/hskMockExamHttp";
import {
  HskMockExamRepository,
  hskMockExamRepositoryOptionsForSession,
  type HskMockExamResult,
} from "../../../../../../src/server/hskMockExamRepository";
import { ASSESSMENT_SESSION_SUBMIT_MUTATION_POLICY } from "../../../../../../src/server/mutationRateLimit";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ level: string; form: string }> };

export async function POST(request: Request, context: Context) {
  const { level, form } = await context.params;
  if (!isHskMockExamLevel(level) || !isHskMockExamFormKey(form)) {
    return mockExamError(404, "MOCK_EXAM_NOT_FOUND", "Không tìm thấy form Mock Exam.");
  }
  return handleAssessmentMutation<
    SubmitAssessmentSessionCommandV1,
    SubmitAssessmentSessionReceiptV1 & { result: HskMockExamResult }
  >(request, {
    operationName: "hsk_mock_exam_session_submit",
    authMessage: "Sign in before submitting an HSK Mock Exam.",
    invalidCode: "INVALID_MOCK_EXAM_SUBMISSION_COMMAND",
    payloadTooLargeCode: "MOCK_EXAM_SUBMISSION_PAYLOAD_TOO_LARGE",
    policy: ASSESSMENT_SESSION_SUBMIT_MUTATION_POLICY,
    parse: parseSubmitAssessmentSessionCommand,
    repositoryOptions: ({ database, userId, command }) =>
      hskMockExamRepositoryOptionsForSession(
        database,
        userId,
        command.sessionId,
      ),
    execute: async (repository, userId, command, database) => {
      const receipt = await repository.submitSession(userId, command);
      const result = await new HskMockExamRepository(database).result(
        userId,
        receipt.sessionId,
      );
      if (!result) throw new Error("Submitted Mock Exam result is unavailable.");
      return { ...receipt, result };
    },
  });
}
