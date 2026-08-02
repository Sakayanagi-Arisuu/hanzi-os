import {
  HSK3_LEVEL_CHECK_BANK_ID,
  HSK3_LEVEL_CHECK_DISCLOSURE,
  HSK3_LEVEL_CHECK_FORM_VERSION,
  HSK3_LEVEL_CHECK_ITEMS,
} from "../data/hsk3LevelCheck";
import { HSK3_LEVEL_CHECK_SESSION_STORAGE_KEY } from "../lib/storageKeys";
import { HskLevelCheckPage, type HskLevelCheckConfig } from "./HskLevelCheckPage";

const config = {
  level: 3,
  lessonCount: 55,
  duration: "25–30 phút",
  distribution: "12 nghe · 12 đọc · 15 từ · 15 ngữ pháp",
  bankId: HSK3_LEVEL_CHECK_BANK_ID,
  formVersion: HSK3_LEVEL_CHECK_FORM_VERSION,
  storageKey: HSK3_LEVEL_CHECK_SESSION_STORAGE_KEY,
  items: HSK3_LEVEL_CHECK_ITEMS,
  disclosure: HSK3_LEVEL_CHECK_DISCLOSURE,
  practiceDestinations: {
    listening: { lessonId: "hsk3-personal-life-narratives-identity-transactions", label: "Nghe và ghi ý đoạn HSK3" },
    reading: { lessonId: "hsk3-main-idea-detail-notes-lesson-01", label: "Đọc và tách ý chính–chi tiết" },
    vocabulary: { lessonId: "hsk3-personal-life-narratives-identity-transactions", label: "Củng cố từ vựng HSK3 trong đoạn" },
    grammar: { lessonId: "hsk3-reference-quantity-phrase-building-lesson-01", label: "Củng cố ngữ pháp tường thuật HSK3" },
  },
} satisfies HskLevelCheckConfig;

export function Hsk3LevelCheckPage() {
  return <HskLevelCheckPage config={config} />;
}
