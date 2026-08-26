import { BrainCircuit, Check, ChevronRight, RotateCcw, Swords, X } from "lucide-react";
import { useMemo, useState } from "react";

export type VocabularyChallengeWord = {
  id: string;
  simplified: string;
  traditional: string;
  pinyin: string;
  meaning: string;
  partOfSpeech: string;
};

export type VocabularyChallengeKind = "meaning" | "reverse" | "pinyin";

export type VocabularyChallengeQuestion = {
  kind: VocabularyChallengeKind;
  prompt: string;
  clue: string;
  answer: string;
  options: string[];
  word: VocabularyChallengeWord;
};

const hash = (value: string) => [...value].reduce(
  (total, character) => ((total * 31) + character.codePointAt(0)!) >>> 0,
  2166136261,
);

const labelFor = (
  word: VocabularyChallengeWord,
  kind: VocabularyChallengeKind,
  script: "simplified" | "traditional",
) => kind === "meaning"
  ? word.meaning
  : kind === "pinyin"
    ? word.pinyin
    : script === "traditional" ? word.traditional : word.simplified;

export const buildVocabularyChallengeQuestion = (
  words: readonly VocabularyChallengeWord[],
  round: number,
  script: "simplified" | "traditional",
): VocabularyChallengeQuestion | null => {
  if (words.length < 4) return null;
  const kinds: VocabularyChallengeKind[] = ["meaning", "reverse", "pinyin"];
  const kind = kinds[round % kinds.length]!;
  const word = words[(round * 37) % words.length]!;
  const answer = labelFor(word, kind, script);
  const decoys = words
    .filter((candidate) => candidate.id !== word.id)
    .map((candidate) => ({
      candidate,
      score:
        (candidate.partOfSpeech === word.partOfSpeech ? 0 : 10)
        + Math.abs([...candidate.simplified].length - [...word.simplified].length)
        + (hash(`${word.id}:${candidate.id}:${round}`) % 7),
    }))
    .sort((left, right) => left.score - right.score)
    .map(({ candidate }) => labelFor(candidate, kind, script))
    .filter((label, index, labels) => label !== answer && labels.indexOf(label) === index)
    .slice(0, 3);
  if (decoys.length < 3) return null;
  const correctPosition = hash(`${word.id}:${round}:${kind}`) % 4;
  const options = [...decoys];
  options.splice(correctPosition, 0, answer);
  const displayedWord = script === "traditional" ? word.traditional : word.simplified;
  return {
    kind,
    word,
    answer,
    options,
    prompt: kind === "meaning"
      ? displayedWord
      : kind === "reverse" ? word.meaning : displayedWord,
    clue: kind === "meaning"
      ? "Chọn lớp nghĩa khớp nhất"
      : kind === "reverse"
        ? "Chọn đúng từ Hán — các đáp án gây nhiễu gần nghĩa"
        : "Chọn Pinyin chính xác — coi chừng thanh điệu gần nhau",
  };
};

export function VocabularyCipherChallenge({
  words,
  script,
  onClose,
}: {
  words: readonly VocabularyChallengeWord[];
  script: "simplified" | "traditional";
  onClose: () => void;
}) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const question = useMemo(
    () => buildVocabularyChallengeQuestion(words, round, script),
    [round, script, words],
  );
  const finished = round >= 10;

  const restart = () => {
    setRound(0);
    setScore(0);
    setStreak(0);
    setSelected(null);
  };

  if (finished) return (
    <section className="vocabulary-cipher is-complete" aria-live="polite">
      <button className="vocabulary-cipher-close" type="button" onClick={onClose} aria-label="Đóng Mê Trận Từ Nghĩa"><X /></button>
      <div className="cipher-result-sigil"><BrainCircuit size={34} /><strong>{score}/10</strong></div>
      <span>MÊ TRẬN ĐÃ GIẢI</span>
      <h2>{score >= 8 ? "Bạn đã xuyên qua tầng nhiễu khó" : "Dấu vết sai đã được lộ diện"}</h2>
      <p>{score >= 8 ? "Thử một vòng mới để gặp bộ bẫy nghĩa và thanh điệu khác." : "Làm lại để phân biệt các từ gần nghĩa, chữ gần hình và Pinyin dễ nhầm."}</p>
      <button className="cipher-primary" type="button" onClick={restart}><RotateCcw size={18} /> Tái lập mê trận</button>
    </section>
  );

  if (!question) return (
    <section className="vocabulary-cipher"><p>Kho đang lọc chưa đủ bốn từ khác nhau để dựng thử thách.</p><button type="button" onClick={onClose}>Trở lại từ điển</button></section>
  );

  const answered = selected !== null;
  const correct = selected === question.answer;
  return (
    <section className="vocabulary-cipher" aria-labelledby="cipher-title">
      <button className="vocabulary-cipher-close" type="button" onClick={onClose} aria-label="Đóng Mê Trận Từ Nghĩa"><X /></button>
      <header>
        <span><Swords size={14} /> TÀNG TỰ KHỐ · MÊ TRẬN TỪ NGHĨA</span>
        <div><strong>{String(round + 1).padStart(2, "0")}/10</strong><small>Liên trảm {streak}</small></div>
      </header>
      <div className="cipher-progress" aria-hidden="true"><i style={{ width: `${(round + 1) * 10}%` }} /></div>
      <div className="cipher-prompt">
        <small>{question.clue}</small>
        <h2 id="cipher-title">{question.prompt}</h2>
        {question.kind !== "pinyin" && <span>{question.word.pinyin}</span>}
      </div>
      <div className="cipher-options" role="group" aria-label="Các đáp án">
        {question.options.map((option, index) => {
          const state = answered
            ? option === question.answer ? "is-correct" : option === selected ? "is-wrong" : ""
            : "";
          return <button key={option} className={state} type="button" disabled={answered} onClick={() => {
            setSelected(option);
            if (option === question.answer) {
              setScore((value) => value + 1);
              setStreak((value) => value + 1);
            } else setStreak(0);
          }}><b>{String.fromCharCode(65 + index)}</b><span>{option}</span>{answered && option === question.answer && <Check size={18} />}</button>;
        })}
      </div>
      <footer>
        <p aria-live="polite">{!answered ? "Đáp án sai sẽ lộ bẫy ngay; hãy chọn bằng trí nhớ trước khi tra cứu." : correct ? "Phá giải chính xác." : <>Đáp án đúng: <strong>{question.answer}</strong></>}</p>
        <button className="cipher-primary" type="button" disabled={!answered} onClick={() => { setRound((value) => value + 1); setSelected(null); }}>
          Ải tiếp theo <ChevronRight size={18} />
        </button>
      </footer>
    </section>
  );
}
