import { Check, Swords, X } from "lucide-react";
import { useMemo, useState } from "react";
import { getConfusableHanzis } from "../characters/characterForgeSession";

export type CharacterChallengeEntry = {
  id: string;
  hanzi: string;
  displayHanzi: string;
  contextWord: string;
  contextPinyin: string;
  contextMeaningVi: string;
};

export function CharacterContextChallenge({
  entry,
  entries,
  onResolved,
}: {
  entry: CharacterChallengeEntry;
  entries: readonly CharacterChallengeEntry[];
  onResolved?: (correct: boolean) => void;
}) {
  const [answer, setAnswer] = useState<string | null>(null);
  const options = useMemo(() => {
    const verifiedConfusables = getConfusableHanzis(entry.hanzi)
      .map((hanzi) => entries.find((candidate) => candidate.hanzi === hanzi)?.displayHanzi)
      .filter((hanzi): hanzi is string => Boolean(hanzi));
    const fallback = entries
      .filter((candidate) => candidate.id !== entry.id && candidate.displayHanzi !== entry.displayHanzi)
      .sort((left, right) =>
        Math.abs([...left.contextWord].length - [...entry.contextWord].length)
        - Math.abs([...right.contextWord].length - [...entry.contextWord].length)
        || left.id.localeCompare(right.id)
      )
      .map((candidate) => candidate.displayHanzi);
    const decoys = [...new Set([...verifiedConfusables, ...fallback])].slice(0, 3);
    const result = [...decoys];
    result.splice([...entry.id].reduce((sum, character) => sum + character.codePointAt(0)!, 0) % 4, 0, entry.displayHanzi);
    return result.slice(0, 4);
  }, [entries, entry]);
  const blanked = entry.contextWord.replace(entry.displayHanzi, "□");
  const correct = answer === entry.displayHanzi;
  const choose = (option: string) => {
    if (answer !== null) return;
    setAnswer(option);
    onResolved?.(option === entry.displayHanzi);
  };

  return (
    <section className={`character-duel${answer !== null ? " is-resolved" : ""}`} aria-labelledby="character-duel-title">
      <div className="duel-sigil" aria-hidden="true"><Swords /><i /><i /></div>
      <header>
        <span><Swords size={15} /> KÍCH HOẠT · ĐẤU ẢNH TỰ</span>
        <strong>{getConfusableHanzis(entry.hanzi).length ? "CẶP DỄ NHẦM ĐÃ KIỂM CHỨNG" : "NGỮ CẢNH TỪ BÀI HỌC"}</strong>
      </header>
      <div className="character-duel-prompt">
        <small>Chọn đúng hình thể để khôi phục từ</small>
        <h2 id="character-duel-title">{blanked}</h2>
        <p>{entry.contextPinyin}</p>
        <strong>{entry.contextMeaningVi}</strong>
      </div>
      <div className="character-duel-options" role="group" aria-label="Các Hán tự lựa chọn">
        {options.map((option, index) => (
          <button
            key={option}
            type="button"
            disabled={answer !== null}
            className={answer !== null ? option === entry.displayHanzi ? "is-correct" : option === answer ? "is-wrong" : "" : ""}
            onClick={() => choose(option)}
            aria-label={`Lựa chọn ${index + 1}: ${option}`}
          >
            <kbd>{index + 1}</kbd>
            <span>{option}</span>
            {answer !== null && option === entry.displayHanzi && <Check />}
            {answer === option && !correct && <X />}
          </button>
        ))}
      </div>
      <p className="character-duel-feedback" aria-live="polite">
        {answer === null
          ? "Có thể bấm hoặc dùng Tab rồi Enter; không cần kéo thả."
          : correct
            ? <>Hình thể đã khớp: <strong>{entry.contextWord}</strong>.</>
            : <>Đối chiếu lại: chữ đúng là <strong>{entry.displayHanzi}</strong> trong {entry.contextWord}.</>}
      </p>
    </section>
  );
}
