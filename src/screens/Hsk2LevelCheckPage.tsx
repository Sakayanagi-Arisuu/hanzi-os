import {
  HSK2_LEVEL_CHECK_BANK_ID,
  HSK2_LEVEL_CHECK_DISCLOSURE,
  HSK2_LEVEL_CHECK_FORM_VERSION,
  HSK2_LEVEL_CHECK_ITEMS,
} from "../data/hsk2LevelCheck";
import { HSK2_LEVEL_CHECK_SESSION_STORAGE_KEY } from "../lib/storageKeys";
import { HskLevelCheckPage, type HskLevelCheckConfig } from "./HskLevelCheckPage";

const config = {
  level: 2,
  lessonCount: 40,
  duration: "25–30 phút",
  distribution: "15 nghe · 15 đọc · 15 từ · 15 ngữ pháp",
  bankId: HSK2_LEVEL_CHECK_BANK_ID,
  formVersion: HSK2_LEVEL_CHECK_FORM_VERSION,
  storageKey: HSK2_LEVEL_CHECK_SESSION_STORAGE_KEY,
  items: HSK2_LEVEL_CHECK_ITEMS,
  disclosure: HSK2_LEVEL_CHECK_DISCLOSURE,
  practiceDestinations: {
    listening: { lessonId: "hsk2-person-events-environment-lesson-01", label: "Nghe hội thoại sáu lượt" },
    reading: { lessonId: "hsk2-guided-message-lesson-01", label: "Đọc và dựng văn bản ngắn" },
    vocabulary: { lessonId: "hsk2-person-events-environment-lesson-01", label: "Củng cố từ vựng HSK2" },
    grammar: { lessonId: "hsk2-reference-description-comparison-lesson-01", label: "Củng cố chuỗi câu HSK2" },
  },
} satisfies HskLevelCheckConfig;

export function Hsk2LevelCheckPage() {
  return <HskLevelCheckPage config={config} />;
}
