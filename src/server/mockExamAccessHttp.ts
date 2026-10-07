import type { HskMockExamDefinition } from './hskMockExamBank';
import type { D1Database } from './d1';
import { getD1Database } from './d1';
import { MockExamAccessRepository } from './mockExamAccessRepository';
import { requestPremiumAccess } from './premiumAccess';
import { mockExamError } from './hskMockExamHttp';

export async function requireMockExamAccess(request: Request, definition: HskMockExamDefinition, database?: D1Database) {
  try {
    const db = database ?? await getD1Database();
    const tier = await new MockExamAccessRepository(db).tierFor(definition.examLevel,definition.formKey,definition.accessTier);
    if (tier === 'free' || await requestPremiumAccess(request,db)) return null;
    return mockExamError(403,'PREMIUM_REQUIRED','Cửa luyện đề này dành cho Premium. Chọn một cửa miễn phí hoặc mở gói Premium.');
  } catch {
    return mockExamError(503,'EXAM_ACCESS_UNAVAILABLE','Chưa xác minh được quyền đề. Hãy kết nối lại và thử lại.');
  }
}
