import { readFileSync, writeFileSync } from 'node:fs';

// Read-only against content sources. Reports live outside user-owned reports/output.
const read = path => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));
const inventory = read('content/sources/hsk-syllabus-2026/inventory.json');
const categories = { grammarRows: 'grammar', tasks: 'tasks', topics: 'topics', recognitionCharacters: 'characters' };
const levels = [1, 2, 3, 4].map(level => {
  const artifact = read(`content/runtime/hsk${level}-level-rich-lessons.json`);
  const coverage = Object.fromEntries(Object.entries(categories).map(([sourceKey, lessonKey]) => {
    const targets = inventory[sourceKey].filter(item => item.level === level);
    const links = new Map();
    for (const lesson of artifact.lessons) for (const item of lesson[lessonKey]) {
      const lessons = links.get(item.id) ?? new Set();
      lessons.add(lesson.lessonId); links.set(item.id, lessons);
    }
    const rows = targets.map(item => ({ id: item.id, lessonIds: [...(links.get(item.id) ?? [])] }));
    return [sourceKey, { expected: targets.length, linked: rows.filter(row => row.lessonIds.length).length, missing: rows.filter(row => !row.lessonIds.length).map(row => row.id), rows }];
  }));
  return { level, lessons: artifact.lessons.length, humanReviewed: artifact.policy.humanReviewed, coverage };
});
const report = {
  sourceId: inventory.sourceId, sourcePublished: inventory.sourcePublished, sourceEffective: inventory.sourceEffective,
  sourcePdfSha256: inventory.sourcePdfSha256,
  interpretation: 'Only exact source-ID links in checked-in rich content. Not pedagogical coverage, mastery, native audio, assessment or published Studio revision coverage. Vocabulary and HSK0 require separate audits.',
  levels,
};
const directory = new URL('../../docs/thien-lo-redesign-review/', import.meta.url);
writeFileSync(new URL('coverage-audit.json', directory), JSON.stringify(report, null, 2) + '\n');
const names = { grammarRows: 'Ngữ pháp', tasks: 'Nhiệm vụ', topics: 'Chủ đề', recognitionCharacters: 'Chữ nhận dạng' };
const lines = levels.flatMap(level => Object.entries(level.coverage).map(([key, value]) => `| HSK${level.level} | ${names[key]} | ${value.linked}/${value.expected} | ${value.missing.join(', ') || 'Không thiếu ID'} |`));
writeFileSync(new URL('05-AUDIT-LIEN-KET-NGUON.md', directory), `# Audit liên kết nguồn cho đợt cải tiến\n\nNguồn ${inventory.sourceId}, công bố ${inventory.sourcePublished}, hiệu lực ${inventory.sourceEffective}. Chạy lại bằng \`node scripts/content/audit-thien-lo-redesign.mjs\`.\n\nĐối chiếu ID chính xác trong rich content đã lưu ở repo; không coi có ID là đã dạy đủ, có bài tập đủ sâu hoặc người học thành thạo. Chưa đối chiếu các revision Xưởng đã phát hành trong D1.\n\n| Cấp | Nhóm | ID có liên kết / nguồn | Thiếu liên kết |\n| --- | --- | --- | --- |\n${lines.join('\n')}\n\n## Quyết định cho biên soạn\n\n- Giữ các liên kết hiện có khi thay trang/ngữ liệu. Các ID và bài chứa chúng nằm trong coverage-audit.json.\n- Rà tiếp độ sâu từng điểm: giải thích, mẫu đúng cấp, luyện có hỗ trợ, tự làm, vận dụng khác ngữ cảnh và ôn trì hoãn. Một mẫu không chứng minh đã phủ mọi cách dùng của một grammar row.\n- Từ vựng và HSK0 cần audit riêng; số lesson không thay thế ma trận này. Chưa dùng kết quả hiện tại để tuyên bố phủ HSK0–4 hoặc quyết định số bài mới.\n- Cho phép thêm bài sau khi xác định thiếu độ rộng/độ sâu; không giới hạn 217 bài. Không khóa ngược bài đã mở và không thay tiến độ cũ.\n- Toàn bộ nội dung AI-assisted vẫn chưa được người biên tập review thật.\n`);
console.log(JSON.stringify(levels.map(({ level, lessons, coverage }) => ({ level, lessons, coverage: Object.fromEntries(Object.entries(coverage).map(([key,value])=>[key,`${value.linked}/${value.expected}`])) })), null, 2));
