# T06/T07 · graph và đơn vị pilot · 21/10/2026

**IN-REVIEW**, chưa giao diện/runner/publish hoặc USER-ACCEPTED.

competencyGraph.ts giữ bốn stable IDs T00: số/lượng, hiểu giá, tạo lời hỏi-đáp,
vận dụng mua sắm. DAG/alias/dimension/teaches-practices-measures tách rõ.
Policy vẫn requires-human-review; minDistinct/delay/threshold/reviewRef null,
humanReviewed:false và authority mapping-only. Completion/XP không là input
để cấp mastery/skip/unlock. Mỗi mapping ghim source item và hash toàn ngữ cảnh.

Server/tooling pilotCompetencyGraph đọc source HSK1 thật: numbers grammar011,
daily-1 grammar063/dialogue/task09 và daily-3 dialogue. Không lấy Git draft làm
published source; graph không cấp quyền truy cập. Source lesson/item trùng hoặc
thiếu bị từ chối. Test graphv1 đã fail1 vì chỉ kiểm duplicate lesson trong pilot;
đã sửa chặn toàn catalog duplicate, v2 3test exit0. Không bỏ assertion.

T07 extractor server-only tạo6unit nguyên ngữ cảnh từ source có sẵn: number rule,
price dialogue/rule, role-play, shop dialogue, typed alternative của task09.
Typed alternative yêu cầu viết thật và ghi nhận IME, không tạo điểm nói/viết.
Source task giữ nguyên; derivative instruction nằm trong versioned unit binding,
humanReviewed:false. Không import bank private vào learner bundle. Mẫu/dialogue
đủ Hanzi/Pinyin/Việt, trợ giúp/priorExposure/time budget/difficulty assumption
tường minh; no native audio. Exposure/self-review, measurementEligible:false,
completionLessonIds rỗng. Unit giữ source-lesson-policy-required và offline
exact-prepared-version-required; đây chưa phải server eligibility hoặc release.

Unitsv1/v2 **2file/6test exit0**, typecheckv43/v44 exit0 tại source tương ứng;
lint graph-writingv1 exit0, lint unitsv1 cần đọc exit; typed variant/validator
refinement sau cùng còn gate tiếp. Tests pin model/context; mutation đổi binding;
orphan/source substitution/private answer keys/fake grants bị từ chối; không
nhận text như phép đo nghe hoặc self-review như independent production.

Không sửa học liệu/IDs hiện hành, policy hoặc pinned scoring hashes. HSK0 4/4
rich0/4; HSK1–4 40/40/55/78=213/213rich giữ. Next T08 draft gaps và T09/T10,
server eligibility/runner/consumer/UI nối theo dependency; pilot audio/policy/
unseen recall/human review/cohort vẫn thiếu. Chưa kết luận toàn T06/T07 xong.
