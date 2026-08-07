import {
  parseOpenAssessmentSessionCommand,
  type OpenAssessmentSessionCommandV1,
  type OpenAssessmentSessionReceiptV1,
} from "../../../../../../src/assessment/assessmentSessionProtocol";
import { handleAssessmentMutation } from "../../../../../../src/server/assessmentRouteHandler";
import { AssessmentIdempotencyConflictError } from "../../../../../../src/server/assessmentRepository";
import { getHskMockExamDefinition } from "../../../../../../src/server/hskMockExamBank";
import { authorizeMockExamLearner, mockExamError } from "../../../../../../src/server/hskMockExamHttp";
import {
  HskMockExamRepository,
  hskMockExamRepositoryOptions,
  publicHskMockExamDefinition,
} from "../../../../../../src/server/hskMockExamRepository";
import { ASSESSMENT_SESSION_OPEN_MUTATION_POLICY } from "../../../../../../src/server/mutationRateLimit";
import { noStoreJsonHeaders } from "../../../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ level: string; form: string }> };

export async function GET(_request: Request, context: Context) {
  const { level, form } = await context.params;
  const definition = getHskMockExamDefinition(level, form);
  if (!definition) return mockExamError(404, "MOCK_EXAM_NOT_FOUND", "Không tìm thấy form Mock Exam.");
  const authorized = await authorizeMockExamLearner();
  if (!authorized.ok) return authorized.response;
  try {
    const session = await new HskMockExamRepository(
      authorized.database,
    ).resume(authorized.userId, definition);
    return Response.json({ session }, { headers: noStoreJsonHeaders });
  } catch {
    return mockExamError(409, "MOCK_EXAM_RESUME_FAILED", "Phiên Mock Exam không còn khớp form bất biến.");
  }
}

export async function POST(request: Request, context: Context) {
  const { level, form } = await context.params;
  const definition = getHskMockExamDefinition(level, form);
  if (!definition) return mockExamError(404, "MOCK_EXAM_NOT_FOUND", "Không tìm thấy form Mock Exam.");
  return handleAssessmentMutation<
    OpenAssessmentSessionCommandV1,
    OpenAssessmentSessionReceiptV1 & {
      definition: ReturnType<typeof publicHskMockExamDefinition>;
      expiresAt: string;
    }
  >(request, {
    operationName: "hsk_mock_exam_session_open",
    authMessage: "Sign in before opening a server-scored HSK Mock Exam.",
    invalidCode: "INVALID_MOCK_EXAM_SESSION_COMMAND",
    payloadTooLargeCode: "MOCK_EXAM_SESSION_PAYLOAD_TOO_LARGE",
    policy: ASSESSMENT_SESSION_OPEN_MUTATION_POLICY,
    parse: parseOpenAssessmentSessionCommand,
    repositoryOptions: hskMockExamRepositoryOptions(definition),
    execute: async (repository, userId, command) => {
      const receipt = await repository.openSession(userId, command);
      if (
        receipt.blueprintId !== definition.blueprint.id
        || receipt.formVersion !== definition.blueprint.formVersion
      ) throw new AssessmentIdempotencyConflictError(
        "Mock Exam idempotency key belongs to another form.",
      );
      return {
        ...receipt,
        definition: publicHskMockExamDefinition(definition),
        expiresAt: new Date(
          Date.parse(receipt.startedAt) + definition.timeLimitMinutes * 60_000,
        ).toISOString(),
      };
    },
  });
}
