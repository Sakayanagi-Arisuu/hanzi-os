"use client";

import { Keyboard, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RELEASED_VOCABULARY } from "../data/curriculum";
import { stripPinyinMarks } from "../lib/pinyin";
import "./HanziPinyinInput.css";

export type HanziInputCandidate = {
  id: string;
  hanzi: string;
  pinyin: string;
};

export const normalizePinyinInput = (value: string) => stripPinyinMarks(
  value.replace(/u:/giu, "ü").replace(/v/giu, "ü").replace(/[0-5]/gu, ""),
);

const PINYIN_INDEX = RELEASED_VOCABULARY.map((word) => ({
  id: word.id,
  simplified: word.simplified,
  traditional: word.traditional,
  pinyin: word.pinyin,
  normalizedPinyin: normalizePinyinInput(word.pinyin),
}));

export const findHanziCandidates = (
  query: string,
  script: "simplified" | "traditional" = "simplified",
  limit = 18,
): HanziInputCandidate[] => {
  const normalized = normalizePinyinInput(query);
  if (!normalized) return [];
  const seen = new Set<string>();
  return PINYIN_INDEX
    .filter((item) => item.normalizedPinyin.startsWith(normalized))
    .sort((left, right) =>
      Number(right.normalizedPinyin === normalized)
        - Number(left.normalizedPinyin === normalized)
      || left.normalizedPinyin.length - right.normalizedPinyin.length
      || left.pinyin.localeCompare(right.pinyin, "zh-Hans")
    )
    .flatMap((item) => {
      const hanzi = script === "traditional" ? item.traditional : item.simplified;
      if (seen.has(hanzi)) return [];
      seen.add(hanzi);
      return [{ id: item.id, hanzi, pinyin: item.pinyin }];
    })
    .slice(0, Math.max(1, limit));
};

export function HanziPinyinInput({
  value,
  disabled,
  script,
  inputId,
  onChange,
  onSubmit,
  onAssistanceUsed,
}: {
  value: string;
  disabled: boolean;
  script: "simplified" | "traditional";
  inputId: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAssistanceUsed: () => void;
}) {
  const [imeOpen, setImeOpen] = useState(false);
  const [pinyin, setPinyin] = useState("");
  const mainInputRef = useRef<HTMLInputElement>(null);
  const pinyinInputRef = useRef<HTMLInputElement>(null);
  const candidates = useMemo(
    () => findHanziCandidates(pinyin, script),
    [pinyin, script],
  );

  useEffect(() => {
    if (disabled) setImeOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (imeOpen) pinyinInputRef.current?.focus();
  }, [imeOpen]);

  const closeIme = () => {
    setImeOpen(false);
    requestAnimationFrame(() => mainInputRef.current?.focus());
  };

  return (
    <div className="hanzi-input-shell">
      <input
        ref={mainInputRef}
        id={inputId}
        value={value}
        disabled={disabled}
        autoComplete="off"
        autoFocus
        inputMode="text"
        placeholder="Nhập hoặc chọn chữ Hán..."
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter"
            && !event.nativeEvent.isComposing
            && value.trim()
          ) onSubmit();
        }}
      />
      <button
        className="hanzi-ime-toggle"
        type="button"
        disabled={disabled}
        aria-expanded={imeOpen}
        aria-controls={`${inputId}-ime`}
        onClick={() => {
          if (imeOpen) {
            closeIme();
            return;
          }
          onAssistanceUsed();
          setImeOpen(true);
        }}
      >
        <Keyboard size={17} />
        {imeOpen ? "Đóng bàn phím pinyin" : "Không có bộ gõ Trung?"}
      </button>
      {imeOpen && !disabled && (
        <section className="hanzi-ime-panel" id={`${inputId}-ime`} aria-label="Bàn phím pinyin nội bộ">
          <header>
            <div>
              <strong>Bàn phím pinyin nội bộ</strong>
              <small>Gõ pinyin bạn nhớ rồi chọn chữ; nghĩa tiếng Việt không được hiển thị trong Thử Luyện.</small>
            </div>
            <button type="button" aria-label="Đóng bàn phím pinyin" onClick={closeIme}>
              <X size={17} />
            </button>
          </header>
          <label className="hanzi-ime-search">
            <Search size={16} />
            <span className="sr-only">Pinyin không dấu</span>
            <input
              ref={pinyinInputRef}
              value={pinyin}
              autoComplete="off"
              inputMode="text"
              placeholder="Ví dụ: ren, nihao, xuexi..."
              onChange={(event) => setPinyin(event.target.value)}
            />
          </label>
          {normalizePinyinInput(pinyin) ? (
            candidates.length > 0 ? (
              <div className="hanzi-ime-candidates" aria-label="Ứng viên Hán tự">
                {candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    aria-pressed={value === candidate.hanzi}
                    onClick={() => {
                      onChange(candidate.hanzi);
                      closeIme();
                    }}
                  >
                    <strong>{candidate.hanzi}</strong>
                    <span>{candidate.pinyin}</span>
                  </button>
                ))}
              </div>
            ) : <p className="hanzi-ime-empty">Không có mục từ khớp trong 2.016 từ đã phát hành.</p>
          ) : <p className="hanzi-ime-empty">Bạn vẫn phải tự nhớ pinyin. Mở trợ giúp này sẽ không được tính là lượt truy hồi không hỗ trợ.</p>}
        </section>
      )}
    </div>
  );
}
