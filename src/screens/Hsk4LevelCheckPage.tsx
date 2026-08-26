import {
  HSK4_LEVEL_CHECK_BANK_ID,
  HSK4_LEVEL_CHECK_DISCLOSURE,
  HSK4_LEVEL_CHECK_FORM_VERSION,
  HSK4_LEVEL_CHECK_ITEMS,
} from "../data/hsk4LevelCheck";
import { HSK4_LEVEL_CHECK_SESSION_STORAGE_KEY } from "../lib/storageKeys";
import {
  createPlacementGateConfig,
  HskLevelCheckPage,
  type HskLevelCheckConfig,
} from "./HskLevelCheckPage";

const config = {
  level: 4,
  lessonCount: 78,
  duration: "35–40 phút",
  distribution: "18 nghe · 18 đọc · 18 từ · 18 ngữ pháp",
  bankId: HSK4_LEVEL_CHECK_BANK_ID,
  formVersion: HSK4_LEVEL_CHECK_FORM_VERSION,
  storageKey: HSK4_LEVEL_CHECK_SESSION_STORAGE_KEY,
  items: HSK4_LEVEL_CHECK_ITEMS,
  disclosure: HSK4_LEVEL_CHECK_DISCLOSURE,
  practiceDestinations: {
    listening: { lessonId: "hsk4-personal-community-analysis-concept-actor-map", label: "Nghe văn bản dài và lập sơ đồ bằng chứng" },
    reading: { lessonId: "hsk4-long-input-structure-map-lesson-01", label: "Đọc nhiều đoạn và kiểm tra suy luận" },
    vocabulary: { lessonId: "hsk4-personal-community-analysis-concept-actor-map", label: "Củng cố từ vựng HSK4 trong ngữ liệu dài" },
    grammar: { lessonId: "hsk4-precision-reference-quantity-lesson-01", label: "Củng cố ngữ pháp tóm tắt và lập luận HSK4" },
  },
} satisfies HskLevelCheckConfig;

export function Hsk4LevelCheckPage({ placement = false }: { placement?: boolean }) {
  return <HskLevelCheckPage config={placement ? createPlacementGateConfig(config) : config} />;
}
