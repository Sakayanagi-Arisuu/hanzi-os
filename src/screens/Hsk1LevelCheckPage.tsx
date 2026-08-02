import {
  HSK1_LEVEL_CHECK_BANK_ID,
  HSK1_LEVEL_CHECK_DISCLOSURE,
  HSK1_LEVEL_CHECK_FORM_VERSION,
  HSK1_LEVEL_CHECK_ITEMS,
} from "../data/hsk1LevelCheck";
import { HSK1_LEVEL_CHECK_SESSION_STORAGE_KEY } from "../lib/storageKeys";
import { HskLevelCheckPage, type HskLevelCheckConfig } from "./HskLevelCheckPage";

const config = {
  level: 1,
  lessonCount: 40,
  duration: "20–25 phút",
  distribution: "15 nghe · 15 đọc · 10 từ · 10 ngữ pháp",
  bankId: HSK1_LEVEL_CHECK_BANK_ID,
  formVersion: HSK1_LEVEL_CHECK_FORM_VERSION,
  storageKey: HSK1_LEVEL_CHECK_SESSION_STORAGE_KEY,
  items: HSK1_LEVEL_CHECK_ITEMS,
  disclosure: HSK1_LEVEL_CHECK_DISCLOSURE,
  practiceDestinations: {
    listening: { lessonId: "journey-1", label: "Nghe trong tình huống" },
    reading: { lessonId: "professional-1", label: "Đọc câu theo ngữ cảnh" },
    vocabulary: { lessonId: "survival-1", label: "Củng cố từ vựng nền" },
    grammar: { lessonId: "hsk1-time-place-events-01-numbers", label: "Củng cố mẫu câu HSK1" },
  },
} satisfies HskLevelCheckConfig;

export function Hsk1LevelCheckPage() {
  return <HskLevelCheckPage config={config} />;
}
