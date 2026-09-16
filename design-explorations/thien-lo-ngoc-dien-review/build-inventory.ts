import { writeFileSync } from 'node:fs';
import { RELEASED_LESSONS, RELEASED_WORD_BY_ID } from '../../src/data/curriculum';
import { getRichLessonContent } from '../../src/learning/richLessonContent';

const families = {
  sound: { name: 'Nghe và phát âm', pages: ['Nghe đối chiếu', 'Quan sát cách tạo âm', 'Phân biệt âm', 'Tự nghe và chọn', 'Thu âm tự đối chiếu', 'Kết quả và lịch ôn'], aid: 'Sơ đồ khẩu hình có kiểm duyệt, đường thanh và cặp âm; không chấm phát âm từ transcript' },
  reading: { name: 'Đọc hiểu và suy luận', pages: ['Mục đích đọc', 'Đọc toàn văn', 'Tìm bằng chứng', 'Giải thích cấu trúc khó', 'Tự đọc văn bản mới', 'Kết quả và lịch ôn'], aid: 'Văn bản có đánh dấu bằng chứng; sơ đồ ý thay ảnh trang trí' },
  writing: { name: 'Viết và trình bày', pages: ['Nhiệm vụ đầu ra', 'Phân tích mẫu', 'Lập dàn ý', 'Viết có hỗ trợ', 'Tự viết tình huống mới', 'Đối chiếu tiêu chí', 'Kết quả và lịch ôn'], aid: 'Dàn ý, bảng nối ý, cặp bản nháp và bản sửa' },
  grammar: { name: 'Ngữ pháp qua đối chiếu', pages: ['Hai tình huống đối chiếu', 'Rút ra quy tắc', 'Sửa lỗi có giải thích', 'Tự chọn và tạo câu', 'Đổi ngữ cảnh', 'Kết quả và lịch ôn'], aid: 'Sơ đồ trật tự câu hoặc trục thời gian theo điểm ngữ pháp' },
  dialogue: { name: 'Giao tiếp theo nhiệm vụ', pages: ['Gặp tình huống', 'Nghe và hiểu mẫu', 'Luyện có gợi ý', 'Tự làm', 'Đổi vai và vận dụng', 'Kết quả và lịch ôn'], aid: 'Tranh ngữ cảnh riêng theo mục tiêu; bản đồ, thực đơn hoặc lịch khi tác vụ cần' },
};

const rows = RELEASED_LESSONS.map(lesson => {
  const rich = getRichLessonContent(lesson.id);
  const text = `${lesson.title} ${lesson.objective}`.toLocaleLowerCase('vi');
  const family = lesson.unitId === 'boot' ? 'sound' : /viết|lập luận|trình bày|tóm tắt/.test(text) ? 'writing' : /đọc|suy luận|văn bản/.test(text) ? 'reading' : /ngữ pháp|bổ ngữ|cấu trúc|so sánh/.test(text) ? 'grammar' : 'dialogue';
  return {
    lessonId: lesson.id, title: lesson.title, chineseTitle: lesson.chineseTitle,
    objective: lesson.objective, unitId: lesson.unitId, skills: lesson.skills,
    proposalStatus: 'Đề xuất phân loại tự động — cần rà soát từng bài', humanReviewed: false,
    family, familyName: families[family].name, proposedPages: families[family].pages,
    visualBrief: `${lesson.title}: ${lesson.objective}. ${families[family].aid}. Không để ảnh lộ đáp án ở trang tự làm.`,
    assetStatus: 'Chưa sản xuất asset riêng',
    source: { prerequisiteIds: lesson.prerequisiteIds, wordIds: lesson.wordIds, characterIds: rich?.characters.map(c => c.id) ?? [], grammarIds: rich?.grammar.map(g => g.id) ?? [], taskIds: rich?.tasks.map(t => t.id) ?? [], dialogueTurns: rich?.dialogue.length ?? 0 },
    links: { dictionary: lesson.wordIds, review: 'Tạo lịch từ item đủ điều kiện và kết quả thật', mistakes: 'Ghi lỗi theo item/skill; về đúng trang sửa lỗi', voice: 'Chuyển cùng tình huống và từ đích nếu có', characters: rich?.characters.map(c => c.id) ?? [], reader: 'Chỉ gắn văn bản đã kiểm tra khớp chủ đề và độ khó', analytics: 'Gửi evidence có lesson/page/block/item/version và mức trợ giúp' },
  };
});
if (rows.length !== 217 || new Set(rows.map(r => r.lessonId)).size !== 217) throw new Error('Inventory mismatch');
for (const row of rows) for (const id of row.source.wordIds) if (!RELEASED_WORD_BY_ID.has(id)) throw new Error(`Missing vocabulary ${id}`);
writeFileSync(new URL('./lesson-inventory.json', import.meta.url), JSON.stringify({ status: 'IN-REVIEW', families, lessons: rows }, null, 2));
const esc = (v: string) => v.replaceAll('|', '/').replaceAll('\n', ' ');
writeFileSync(new URL('./lesson-inventory.md', import.meta.url), '# Đề xuất cho 217 bài — chưa phải nội dung đã biên soạn lại\n\nPhân nhóm sơ bộ theo mục tiêu nguồn; từng bài cần duyệt trước sản xuất ảnh và nội dung. Giữ nguyên ID và liên kết từ nguồn.\n\n| ID | Bài | Mục tiêu nguồn | Họ bố cục đề xuất | Số trang |\n|---|---|---|---|---|\n' + rows.map(r => `| ${r.lessonId} | ${esc(r.title)} | ${esc(r.objective)} | ${r.familyName} | ${r.proposedPages.length} |`).join('\n') + '\n');
console.log(JSON.stringify({ lessons: rows.length, rich: rows.filter(r => getRichLessonContent(r.lessonId)).length, proposedPages: rows.reduce((n,r) => n+r.proposedPages.length,0), families: Object.fromEntries(Object.keys(families).map(k => [k,rows.filter(r=>r.family===k).length])) }));
