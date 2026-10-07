import { authorizeStudio } from '../../../src/server/contentStudioHttp';
import { MockExamAccessRepository } from '../../../src/server/mockExamAccessRepository';
import { mockExamTier } from '../../../src/assessment/mockExamAccess';
import { HSK_EXAM_LEVELS, HSK_BUILT_IN_EXAM_FORM_KEYS, HSK_STANDARD_EXAM_STRUCTURE, hskStandardItemCount, isHskExamLevel, isHskExamFormKey } from '../../../src/assessment/hskExamStructure';
import { hasPermission } from '../../../src/auth/authorization';

export const dynamic = 'force-dynamic';
export default async function ExamAccessPage({ searchParams }: { searchParams: Promise<{notice?:string;error?:string}> }) {
  const authorized = await authorizeStudio('content:workspace:read');
  if (!authorized.ok) return <main className="studio-state"><section className="studio-state-card"><h1>Đăng nhập Xưởng Biên Tập</h1><a href="/signin?returnTo=%2Fstudio%2Fexams">Đăng nhập tài khoản biên tập</a></section></main>;
  const {database,account} = authorized.context;
  const rules = await new MockExamAccessRepository(database).rules();
  // This page only needs metadata. Do not import private question banks into HTML rendering.
  const { ContentStudioRepository } = await import('../../../src/server/contentStudioRepository');
  const runtime = await new ContentStudioRepository(database).publishedRuntime({itemType:'exam_form'});
  const definitions = HSK_EXAM_LEVELS.flatMap(examLevel=>HSK_BUILT_IN_EXAM_FORM_KEYS.map(formKey=>({
    examLevel,formKey:String(formKey),title:`Mô phỏng thi ${examLevel.toUpperCase()}`,
    timeLimitMinutes:HSK_STANDARD_EXAM_STRUCTURE[examLevel].timeLimitMinutes,
    itemCount:hskStandardItemCount(examLevel),accessTier:undefined as 'free'|'premium'|undefined,
  })));
  for (const item of runtime.items) {
    const level=item.content.examLevel;const key=item.content.formKey;
    if (!isHskExamLevel(level) || !isHskExamFormKey(key) || definitions.some(form=>form.examLevel===level && form.formKey===key)) continue;
    definitions.push({examLevel:level,formKey:key,title:item.title,timeLimitMinutes:HSK_STANDARD_EXAM_STRUCTURE[level].timeLimitMinutes,itemCount:hskStandardItemCount(level),accessTier:item.content.accessTier==='free'?'free':'premium'});
  }
  definitions.sort((left,right)=>left.examLevel.localeCompare(right.examLevel)||left.formKey.localeCompare(right.formKey));
  const canChange = hasPermission(account.authorization,'content:publish');
  const query = await searchParams;
  return <main className="studio-page"><div className="studio-shell">
    <nav className="studio-topbar"><a className="studio-brand" href="/studio">← Xưởng Biên Tập</a><a href="/exams">Xem Phòng Luyện Đề</a></nav>
    <header className="studio-section-heading"><div><h1>Bộ đề và quyền truy cập</h1><p>A, B, C miễn phí mặc định ở mỗi HSK; các cửa khác mặc định dành cho Premium. Bạn có thể đổi riêng từng đề.</p></div></header>
    {query.notice && <p className="studio-alert" role="status">{query.notice}</p>}{query.error && <p className="studio-alert error" role="alert">{query.error}</p>}
    {!canChange && <p className="studio-alert">Biên tập viên chọn quyền trong bản nháp bộ đề. Thay quyền của đề đang phát hành cần tài khoản có quyền phát hành nội dung.</p>}
    <section className="studio-section"><h2>Soạn bộ đề bằng biểu mẫu</h2><p>Soạn câu hỏi, kiểm định và phát hành vào ngân hàng; sau đó ghép câu theo kỹ năng vào cửa G–L. Bộ đề chỉ đến người học sau khi được duyệt và phát hành.</p><div className="studio-two-columns"><a className="studio-button" href="/studio?create=exam_item">Soạn câu hỏi</a><a className="studio-button" href="/studio?create=exam_form">Soạn bộ đề G–L</a></div></section>
    {HSK_EXAM_LEVELS.map(level=><section className="studio-section" key={level}><h2>{level.toUpperCase()}</h2><div className="studio-repeat-stack">{definitions.filter(item=>item.examLevel===level).map(item=>{
      const tier = mockExamTier(item.formKey,rules.get(`${level}:${item.formKey}`) ?? item.accessTier);
      return <form className="studio-two-columns" key={item.formKey} action="/studio/exams/access" method="post">
        <input type="hidden" name="examLevel" value={level}/><input type="hidden" name="formKey" value={item.formKey}/>
        <div><strong>Cửa {item.formKey.toUpperCase()} · {item.title}</strong><p>{item.itemCount} câu · {item.timeLimitMinutes} phút</p></div>
        <label><span>Quyền truy cập</span><select name="tier" defaultValue={tier} disabled={!canChange}><option value="free">Miễn phí</option><option value="premium">Premium</option></select><button className="studio-button" type="submit" disabled={!canChange}>Lưu quyền cửa {item.formKey.toUpperCase()}</button></label>
      </form>;
    })}</div></section>)}
  </div></main>;
}
