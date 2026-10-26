import type { AssessmentFormV1 } from './assessmentSessionProtocol';
import type { CatalogEntry, MockResult } from '../screens/MockExamsPage';

/** Device-timed practice; never a placement, mastery or certification receipt. */
export type OfflineMockPackage = {
  version: 1; definition: CatalogEntry; contentVersion: string;
  form: AssessmentFormV1; formHash: `sha256:${string}`;
};
export type OfflineMockAnswer = { position: number; itemId: string; itemVersion: string; answer: string; occurredAt: string };
export type OfflineMockRun = {
  version: 1; id: string; package: OfflineMockPackage; startedAt: string;
  answers: OfflineMockAnswer[]; submittedAt: string | null; result: MockResult | null;
};
export const MOCK_PRACTICE_CHANGED = 'hanzi-mock-practice-changed';
