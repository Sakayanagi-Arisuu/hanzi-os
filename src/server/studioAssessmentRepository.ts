import { assessmentItemErrors, type StudioAssessmentItem } from '../content/studioAssessment';
import { canonicalStudioJson, studioSha256 } from '../content/studioContent';
import { CONTENT_VERSION } from '../data/curriculum';
import { ContentStudioRepository } from './contentStudioRepository';
import { CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS, FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT, type AuthoritativeAssessmentItem } from './authoritativeAssessmentItemBank';
import type { D1Database } from './d1';

/** Current heads issue new questions; immutable past releases still grade open sessions. */
export async function loadStudioAssessmentBank(database: D1Database) {
  const rows = await database.prepare(`SELECT DISTINCT p.revision_id AS revisionId, CASE WHEN h.package_id IS NULL THEN 0 ELSE 1 END AS active
    FROM content_release_packages p LEFT JOIN content_release_heads h ON h.package_id=p.id
    WHERE json_extract(p.package_json,'$.itemType')='exam_item' AND json_extract(p.package_json,'$.stableKey') LIKE 'assessment.item.%'`).all<{revisionId:string;active:number}>();
  if (!rows.success) throw new Error('Không đọc được ngân hàng khảo nghiệm.');
  const repository = new ContentStudioRepository(database);
  const bank: AuthoritativeAssessmentItem[] = [...CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS];
  const selectionBank: AuthoritativeAssessmentItem[] = [...CURRENT_AUTHORITATIVE_ASSESSMENT_ITEMS];
  for (const row of rows.results ?? []) {
    const release = await repository.releasedRuntimeRevision(row.revisionId);
    const source = await repository.getRevision(row.revisionId);
    if (!release || !['published','archived'].includes(source.workflowState) || source.contentSha256!==release.contentSha256 || await studioSha256(canonicalStudioJson(source.content))!==release.contentSha256) throw new Error('Nguồn khảo nghiệm không khớp phiên bản phát hành.');
    if (source.content.contentKind!=='assessment-item' || assessmentItemErrors(source.content).length) throw new Error('Câu khảo nghiệm phát hành không hợp lệ.');
    const content=source.content as unknown as StudioAssessmentItem;
    const item:AuthoritativeAssessmentItem={id:source.stableKey,itemVersion:`studio-assessment:${source.id}`,contentVersion:CONTENT_VERSION,skill:content.skill,construct:`foundation-${content.skill}-recognition`,modality:content.skill==='listening'?'synthetic-tts-selection':'visual-selection',equivalentGroupId:source.stableKey,exposureGroupId:source.stableKey,formFamilyId:FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT.formFamilyId,reviewStatus:'approved',calibrationStatus:'uncalibrated',answerExposure:'server-confidential',difficulty:null,discrimination:null,measurementEligible:content.skill!=='listening',prompt:content.prompt,meta:content.instruction,options:content.options,correctAnswer:content.options[content.answerIndex]!,...(content.skill==='listening'?{stimulusText:content.stimulusText}:{})};
    bank.push(item); if(row.active)selectionBank.push(item);
  }
  return {bank,selectionBank};
}
