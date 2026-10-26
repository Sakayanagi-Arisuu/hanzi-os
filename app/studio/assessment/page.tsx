import { authorizeStudio } from '../../../src/server/contentStudioHttp';
import { ContentStudioRepository } from '../../../src/server/contentStudioRepository';
import { loadStudioAssessmentBank } from '../../../src/server/studioAssessmentRepository';
import { ASSESSMENT_SKILLS } from '../../../src/content/studioAssessment';
import { STUDIO_WORKFLOW_LABELS } from '../../../src/content/studioContent';
import { FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT, isIssuableAuthoritativeAssessmentItem } from '../../../src/server/authoritativeAssessmentItemBank';
import { hasPermission } from '../../../src/auth/authorization';
import { AssessmentEditor } from './AssessmentEditor';
export const dynamic='force-dynamic';
export default async function AssessmentStudioPage({searchParams}:{searchParams:Promise<{create?:string}>}) {
  const auth=await authorizeStudio('content:workspace:read');
  if(!auth.ok)return <main className="studio-state"><h1>Ngân hàng khảo nghiệm đang khóa</h1><a href="/signin?returnTo=%2Fstudio%2Fassessment">Đăng nhập tài khoản biên tập</a></main>;
  const query=await searchParams;
  const repository=new ContentStudioRepository(auth.context.database);
  const revisions=(await repository.list({itemType:'exam_item',limit:500})).filter(item=>item.content.contentKind==='assessment-item');
  const {selectionBank}=await loadStudioAssessmentBank(auth.context.database);
  const active=selectionBank.filter(item=>isIssuableAuthoritativeAssessmentItem(item,FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT));
  return <main className="studio-page"><div className="studio-shell"><header className="studio-topbar"><h1>Khảo Nghiệm Căn Cơ</h1><a className="studio-secondary-link" href="/studio/assessment">Ngân hàng câu hỏi đầu vào</a></header>
    {query.create&&hasPermission(auth.context.account.authorization,'content:drafts:write')?<section className="studio-compose-section"><AssessmentEditor/></section>:<>
    <header className="tv-hero"><h2>Đúng điểm khởi hành</h2><p>Soạn câu hỏi, duyệt độc lập và phát hành cho những lượt khảo nghiệm mới. Phiên đang làm giữ câu hỏi và đáp án theo phiên bản đã nhận.</p><a className="studio-button" href="/studio/assessment?create=1">Soạn câu khảo nghiệm</a></header>
    <section className="studio-section"><h2>Độ phủ ngân hàng đã phát hành</h2><div className="tv-catalog-grid">{Object.entries(ASSESSMENT_SKILLS).map(([skill,label])=><article className="tv-catalog-card" key={skill}><h3>{label}</h3><p>{active.filter(item=>item.skill===skill).length} câu khả dụng · mỗi đề cần {FOUNDATION_AUTHORITATIVE_ASSESSMENT_BLUEPRINT.skillTargets[skill as keyof typeof ASSESSMENT_SKILLS]}</p></article>)}</div><p>Đề cần đủ 10 câu đúng tỷ lệ kỹ năng và chưa bị lộ cho người làm. Chưa đủ ngân hàng thì hệ thống không cấp đề. Âm tổng hợp không tính là bằng chứng nghe độc lập.</p></section>
    <section className="studio-section"><h2>Bản nháp & phiên bản</h2>{revisions.length?revisions.map(item=><a className="tv-content-row" key={item.id} href={`/studio/items/${item.id}`}><strong>{item.title}</strong><span>{STUDIO_WORKFLOW_LABELS[item.workflowState]} · bản {item.revision}</span></a>):<p>Chưa có câu hỏi biên tập. Bắt đầu bằng “Soạn câu khảo nghiệm”.</p>}</section></>}
  </div></main>;
}
