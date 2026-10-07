import { isHskExamFormKey, type HskExamFormKey } from './hskExamStructure';

export type MockExamAccessTier = 'free' | 'premium';
export const defaultMockExamTier = (form: HskExamFormKey): MockExamAccessTier =>
  form === 'a' || form === 'b' || form === 'c' ? 'free' : 'premium';
export const isMockExamAccessTier = (tier: unknown): tier is MockExamAccessTier =>
  tier === 'free' || tier === 'premium';
export function mockExamTier(form: unknown, configured?: unknown): MockExamAccessTier {
  if (!isHskExamFormKey(form)) throw new TypeError('Cửa luyện đề không hợp lệ.');
  if (configured !== undefined && !isMockExamAccessTier(configured)) throw new TypeError('Quyền đề không hợp lệ.');
  return configured ?? defaultMockExamTier(form.toLowerCase() as HskExamFormKey);
}
