import { isHskExamLevel, isHskExamFormKey } from '../assessment/hskExamStructure';
import { isMockExamAccessTier, mockExamTier, type MockExamAccessTier } from '../assessment/mockExamAccess';
import type { D1Database } from './d1';

export class MockExamAccessRepository {
  constructor(private database: D1Database, private now = Date.now()) {}
  async rules() {
    const result = await this.database.prepare('SELECT exam_level AS examLevel,form_key AS formKey,tier FROM mock_exam_access_rules').all<{examLevel:string;formKey:string;tier:MockExamAccessTier}>();
    if (!result.success) throw new Error('Không đọc được quyền đề.');
    return new Map((result.results ?? []).map(row => {
      if (!isHskExamLevel(row.examLevel) || !isHskExamFormKey(row.formKey) || !isMockExamAccessTier(row.tier)) throw new Error('Quyền đề không hợp lệ.');
      return [`${row.examLevel}:${row.formKey}`,row.tier];
    }));
  }
  async tierFor(examLevel: unknown, formKey: unknown, configured?: unknown) {
    if (!isHskExamLevel(examLevel) || !isHskExamFormKey(formKey)) throw new TypeError('Tầng hoặc cửa luyện đề không hợp lệ.');
    const row = await this.database.prepare('SELECT tier FROM mock_exam_access_rules WHERE exam_level=? AND form_key=?')
      .bind(examLevel,formKey.toLowerCase()).first<{tier:MockExamAccessTier}>();
    return mockExamTier(formKey,row?.tier ?? configured);
  }
  async setTier(examLevel: unknown, formKey: unknown, tier: unknown, actorId: string, sessionId: string | null, requestId: string) {
    if (!isHskExamLevel(examLevel) || !isHskExamFormKey(formKey) || !isMockExamAccessTier(tier)) throw new TypeError('Quyền đề không hợp lệ.');
    const key = formKey.toLowerCase();
    const result = await this.database.batch([
      this.database.prepare(`INSERT INTO mock_exam_access_rules (exam_level,form_key,tier,updated_by,updated_at) VALUES (?,?,?,?,?)
        ON CONFLICT(exam_level,form_key) DO UPDATE SET tier=excluded.tier,updated_by=excluded.updated_by,updated_at=excluded.updated_at`).bind(examLevel,key,tier,actorId,this.now),
      this.database.prepare(`INSERT INTO audit_events (id,category,action,outcome,actor_user_id,actor_session_id,target_type,target_id,request_id,metadata_json,created_at)
        VALUES (?,'config','mock_exam_access_change','success',?,?,'mock_exam',?,?,?,?)`)
        .bind(crypto.randomUUID(),actorId,sessionId,`${examLevel}:${key}`,requestId,JSON.stringify({tier}),this.now),
    ]);
    if (result.some(item=>!item.success || item.meta?.changes !== 1)) throw new Error('Chưa lưu được quyền đề.');
    return tier;
  }
}
