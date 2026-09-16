import type { ReaderChapter, ReaderComprehensionQuestion } from "./readerContentModel";
import { READER_AUTHORED_QUESTIONS, type ReaderQuestionSeed } from "./readerComprehensionSeeds";
import { readerArcBeat, READER_STORY_PROFILE_BY_ID } from "./readerStoryArcs";

// The expanded chapters are themselves authored from these story profiles and
// arc beats. Bind questions to that same source, never to unrelated word lists.
export const readerQuestionSeeds = (chapter: ReaderChapter): readonly ReaderQuestionSeed[] => {
  const authored = READER_AUTHORED_QUESTIONS[chapter.chapterId];
  if (authored) return authored;
  const story = READER_STORY_PROFILE_BY_ID[chapter.seriesId];
  if (!story) throw new Error(`Missing reading checks: ${chapter.chapterId}`);
  const { lead, setting, artifact, danger, truth } = story;
  const signal = readerArcBeat(chapter.chapterNumber).signal;
  const seeds: Record<number, readonly ReaderQuestionSeed[]> = {
    3: [
      [2, `Khi ${signal.vi} hiện trên ${artifact.vi}, ${lead.vi} làm gì trước?`, "Ghi lại hướng ánh sáng di chuyển", "Lập tức đi con đường dễ tìm nhất", "Xóa lời cảnh báo rồi bước tiếp"],
      [3, `Những dòng hồ sơ mất dần khi ${danger.vi} tiến gần cho thấy kẻ địch muốn lấy gì?`, "Bằng chứng về những lựa chọn con người từng làm", `Chỉ riêng ${artifact.vi}`, `Mọi đồ vật trong ${setting.vi}`],
    ],
    4: [
      [5, `Ở ${setting.vi}, ${signal.vi} tách đôi và chỉ tới những đâu?`, "Lối thoát và cánh cửa đen sau mối nguy", "Hai lối cùng dẫn về điểm xuất phát", "Chỗ người giữ cổng và nơi cất hồ sơ"],
      [6, `Vì sao hành động đặt ${artifact.vi} giữa hai đường là một lựa chọn khác?`, `${lead.vi} không chấp nhận chỉ một trong hai đáp án có sẵn`, `${lead.vi} đã quên cả hai con đường`, `${lead.vi} muốn bỏ lại mọi tên bị xóa`],
    ],
    5: [
      [2, `Bên cạnh ${signal.vi} trên ${artifact.vi} là lời cảnh báo nào?`, "Đừng tin con đường dễ tìm nhất", "Cứ theo đường rộng nhất mà đi", "Chỉ cần chạy nhanh, không cần ghi chép"],
      [6, `Sau khi ${lead.vi} từ chối chỉ chọn một đáp án, ánh sáng làm gì?`, "Vẽ ra đường thứ ba có những cái tên bị xóa", "Tắt hẳn và xóa hai đường cũ", "Chỉ lại đúng lối thoát ban đầu"],
    ],
    6: [
      [6, `${lead.vi} đặt ${artifact.vi} ở đâu khi đứng trước hai lối?`, "Giữa hai con đường", "Ngay ngoài lối thoát", "Sau cánh cửa đen đã mở"],
      [7, `Điều gì khiến ${signal.vi} hóa thành chìa khóa hoàn chỉnh?`, `${lead.vi} đọc lớn những cái tên bị xóa`, `${lead.vi} im lặng chờ nguy hiểm qua`, `${lead.vi} xóa các ô sáng trên cửa`],
    ],
    7: [
      [3, `Khi ${danger.vi} tiến gần, hồ sơ ở ${setting.vi} thay đổi ra sao?`, "Mỗi lần lại mất một dòng", "Mỗi lần lại có thêm một tên mới", "Không đổi vì đã được khóa kín"],
      [7, `${lead.vi} làm gì để những ô trên cửa đen sáng lên?`, "Đọc lớn những cái tên đã bị xóa", "Đọc riêng tên của bản thân", "Che lại mọi dòng tên bên đường"],
    ],
    8: [
      [4, `Sự thật nào ${lead.vi} nhớ lại khi đối diện ${signal.vi}?`, truth.vi, "Xóa mọi đau khổ sẽ giữ nguyên câu chuyện của mỗi người", "An toàn chỉ có được khi không ai còn quyền lựa chọn"],
      [4, "Vì sao xóa hết đau khổ không phải giải pháp giữ nguyên con người?", "Câu chuyện còn lại không còn thuộc về con người ban đầu", "Vì mọi đồ vật sẽ lập tức biến mất", "Vì cửa chỉ mở khi không còn ký ức"],
    ],
    9: [
      [5, `Một nửa ${signal.vi} chỉ về cánh cửa nào?`, `Cửa đen sau ${danger.vi}`, `Cửa nhà của ${lead.vi}`, `Cửa dẫn thẳng ra khỏi ${setting.vi}`],
      [7, `Khi ${lead.vi} đọc từng cái tên, phản ứng nào xuất hiện?`, "Mỗi tên làm một ô trên cửa đen sáng lên", "Mỗi tên làm cửa đen mất một ô", "Cửa mở ngay trước khi đọc tên đầu tiên"],
    ],
    10: [
      [8, `Sau khi mở cửa ở ${setting.vi}, ${lead.vi} thấy gì?`, "Một con đường mới dẫn xa hơn, chưa phải điểm cuối", "Điểm cuối không còn nơi nào để đi", "Căn phòng cũ không có lối ra"],
      [8, `${lead.vi} làm gì với ${signal.vi} trước khi đi tiếp?`, "Ghi vào hồ sơ rồi tiến lên trước tiếng chuông kế tiếp", "Xóa khỏi hồ sơ để quên chuyện đã xảy ra", `Đổi lấy ${artifact.vi} từ người giữ cổng`],
    ],
  };
  const questions = seeds[chapter.chapterNumber];
  if (!questions) throw new Error(`Missing reading checks: ${chapter.chapterId}`);
  return questions;
};

export const attachReaderComprehension = (chapter: ReaderChapter): ReaderChapter => {
  const comprehension: ReaderComprehensionQuestion[] = readerQuestionSeeds(chapter).map((seed, index) => {
    const [paragraphNumber, promptVi, answer, ...distractors] = seed;
    const paragraph = chapter.paragraphs[paragraphNumber - 1];
    if (!paragraph) throw new Error(`Missing question evidence: ${chapter.chapterId}/${paragraphNumber}`);
    const offset = [...chapter.chapterId].reduce((sum, character) => sum + character.charCodeAt(0), index) % 3;
    const base = [answer, ...distractors];
    const options = [...base.slice(offset), ...base.slice(0, offset)];
    return {
      questionId: `${chapter.chapterId}-reading-${index + 1}`,
      promptVi,
      options,
      answerIndex: options.indexOf(answer),
      explanationVi: `Đối chiếu đoạn ${paragraphNumber}: ${paragraph.vi}`,
    };
  });
  return { ...chapter, comprehension };
};
