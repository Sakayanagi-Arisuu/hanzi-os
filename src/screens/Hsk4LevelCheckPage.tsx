import { useEffect, useState } from "react";
import type { Hsk4LevelCheckItem } from "../data/hsk4LevelCheck";
import { HSK4_LEVEL_CHECK_SESSION_STORAGE_KEY } from "../lib/storageKeys";
import {
  createPlacementGateConfig,
  HskLevelCheckPage,
  type HskLevelCheckConfig,
} from "./HskLevelCheckPage";

type Hsk4Bank = {
  schemaVersion: 1;
  bankId: string;
  formVersion: string;
  disclosure: { listeningVi: string; resultVi: string };
  items: Hsk4LevelCheckItem[];
};

const config = (bank: Hsk4Bank): HskLevelCheckConfig => ({
  level: 4,
  lessonCount: 78,
  duration: "35–40 phút",
  distribution: "18 nghe · 18 đọc · 18 từ · 18 ngữ pháp",
  bankId: bank.bankId,
  formVersion: bank.formVersion,
  storageKey: HSK4_LEVEL_CHECK_SESSION_STORAGE_KEY,
  items: bank.items,
  disclosure: bank.disclosure,
  practiceDestinations: {
    listening: { lessonId: "hsk4-personal-community-analysis-concept-actor-map", label: "Nghe văn bản dài và lập sơ đồ bằng chứng" },
    reading: { lessonId: "hsk4-long-input-structure-map-lesson-01", label: "Đọc nhiều đoạn và kiểm tra suy luận" },
    vocabulary: { lessonId: "hsk4-personal-community-analysis-concept-actor-map", label: "Củng cố từ vựng HSK4 trong ngữ liệu dài" },
    grammar: { lessonId: "hsk4-precision-reference-quantity-lesson-01", label: "Củng cố ngữ pháp tóm tắt và lập luận HSK4" },
  },
});

export function Hsk4LevelCheckPage({ placement = false }: { placement?: boolean }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ bank: Hsk4Bank | null; error: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/content/premium-level-check", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Chưa tải được Khảo Nghiệm HSK4. Hãy thử lại.");
        const bank = await response.json() as Hsk4Bank;
        if (bank.schemaVersion !== 1 || !Array.isArray(bank.items) || bank.items.length !== 72) {
          throw new Error("Nội dung Khảo Nghiệm HSK4 không hợp lệ.");
        }
        if (!controller.signal.aborted) setResult({ bank, error: "" });
      }).catch(error => {
        if (!controller.signal.aborted) setResult({ bank: null, error: String(error.message ?? error) });
      });
    return () => controller.abort();
  }, [revision]);
  if (!result) return <section role="status"><h1>Đang tải Khảo Nghiệm HSK4</h1></section>;
  if (!result.bank) return <section role="alert"><h1>Chưa mở được Khảo Nghiệm HSK4</h1><p>{result.error}</p><button type="button" onClick={() => setRevision(value => value + 1)}>Thử lại</button></section>;
  const loadedConfig = config(result.bank);
  return <HskLevelCheckPage config={placement ? createPlacementGateConfig(loadedConfig) : loadedConfig} />;
}
