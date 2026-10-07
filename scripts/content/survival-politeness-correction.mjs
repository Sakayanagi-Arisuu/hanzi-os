/** Exact editorial patch; old authored snapshots and pinned packages stay immutable. */
export const politenessModel = [
 'A：谢谢！\nB：不客气。\nB：对不起！\nA：没关系。\nA：明天见！\nB：明天见！',
 'A: Xièxie!\nB: Bú kèqi.\nB: Duìbuqǐ!\nA: Méi guānxi.\nA: Míngtiān jiàn!\nB: Míngtiān jiàn!',
 'A (được giữ cửa): Cảm ơn!\nB (giữ cửa): Không có gì.\nB (sau đó va nhẹ vào A): Xin lỗi!\nA: Không sao.\nA: Hẹn mai gặp!\nB: Hẹn mai gặp!',
];
export const politenessPrompt = 'Bạn là A; B giữ cửa giúp bạn. Viết hội thoại có nhãn A/B: A cảm ơn, B đáp lời cảm ơn. Sau đó B va nhẹ vào A và xin lỗi; A đáp lời xin lỗi. Cuối cùng hai người hẹn gặp ngày mai. Có thể dùng Pinyin nếu chưa nhập được Hán tự; ghi nhận việc dùng hỗ trợ.';
export function correctSurvivalPoliteness(source) {
 const content = structuredClone(source);
 if (content.targetLessonId !== 'survival-1') throw Error('Wrong lesson for politeness correction');
 const page = content.lessonPages.pages.find(p => p.id === 'survival-1:v2:transfer');
 const context = page?.blocks.find(b => b.id === 'survival-1:v2:block:transfer');
 const block = page?.blocks.find(b => b.id === 'survival-1:v2:block:produce');
 const guided = content.grammar[0].guidedPractice;
 const old = ['谢谢！没关系。明天见！', 'Xièxie! Méi guānxi. Míngtiān jiàn!', 'Cảm ơn! Không sao. Hẹn mai gặp!'];
 const fields = ['modelAnswerHanzi', 'modelAnswerPinyin', 'modelAnswerMeaningVi'];
 if (!context || block?.activity?.type !== 'rubric' || context.body !== guided.promptVi || content.checkpointVi !== guided.promptVi) throw Error('Unexpected transfer structure');
 for (const [i, field] of fields.entries()) {
  if (guided[field] !== old[i] || !block.activity.explanation.includes(old[i])) throw Error(`Model changed: ${field}`);
  guided[field] = politenessModel[i];
  block.activity.explanation = block.activity.explanation.replace(old[i], politenessModel[i]);
 }
 context.body = politenessPrompt;
 block.body = politenessPrompt;
 guided.promptVi = politenessPrompt;
 content.checkpointVi = politenessPrompt;
 return content;
}
