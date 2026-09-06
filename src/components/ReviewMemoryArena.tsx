import { useEffect, type RefObject } from "react";
import { useAudioEngine } from "../audio/AudioEngineProvider";

type ReviewMemoryArenaProps = {
  audioSourceId: string;
  character: string;
  example: string;
  exampleMeaning: string;
  examplePinyin: string;
  meaning: string;
  hintUsed: boolean;
  onUseHint: () => void;
  partOfSpeech: string;
  pinyin: string;
  revealed: boolean;
  tags: readonly string[];
  titleId: string;
  titleRef?: RefObject<HTMLHeadingElement | null>;
};

export function ReviewMemoryArena({
  audioSourceId,
  character,
  example,
  exampleMeaning,
  examplePinyin,
  meaning,
  hintUsed,
  onUseHint,
  partOfSpeech,
  pinyin,
  revealed,
  tags,
  titleId,
  titleRef,
}: ReviewMemoryArenaProps) {
  const stageNumber = revealed ? "03" : "02";
  const stageName = revealed ? "ĐỐI CHIẾU" : "TRUY HỒI";
  const {
    playback,
    prepareMandarinSpeech,
    speakMandarin,
  } = useAudioEngine();
  const audioPhase = playback.sourceId === audioSourceId ? playback.phase : "idle";
  const audioActive = audioPhase === "preparing" || audioPhase === "playing";
  const audioLabel = audioPhase === "preparing"
    ? "Đang mở kênh giọng"
    : audioPhase === "playing"
      ? "Đang phát âm"
      : audioPhase === "ended"
        ? "Đã phát âm"
        : audioPhase === "error"
          ? "Không thể phát · thử lại"
          : "Nghe phát âm";

  useEffect(() => {
    prepareMandarinSpeech();
  }, [prepareMandarinSpeech]);

  const playAudio = () => {
    prepareMandarinSpeech();
    speakMandarin(character, 0.82, audioSourceId);
  };

  return (
    <section
      className={`memory-card memory-arena ${revealed ? "revealed" : ""}`}
      data-audio-active={audioActive}
      data-audio-phase={audioPhase}
      aria-labelledby={titleId}
    >
      <div className="memory-grid" aria-hidden="true" />
      <div className="memory-rift" aria-hidden="true"><i /><i /><i /><i /></div>

      <header className="memory-card-head">
        <span className="memory-contract">
          <i className="memory-symbol" aria-hidden="true">◎</i>
          <span><b>MEM-{stageNumber} · {stageName}</b>{partOfSpeech} · từ vựng trong lộ trình</span>
        </span>
        {revealed && <div className="memory-audio-channel">
          <span role="status" aria-live="polite">
            <i className="memory-symbol" aria-hidden="true">≋</i> {audioLabel}
          </span>
          <button
            className="memory-audio-button"
            type="button"
            onClick={playAudio}
            onFocus={prepareMandarinSpeech}
            onPointerEnter={prepareMandarinSpeech}
            aria-busy={audioActive}
            aria-label={`Nghe phát âm ${character}`}
            data-system-silent="true"
          >
            <span className="memory-symbol" aria-hidden="true">声</span>
            <i aria-hidden="true" />
          </button>
        </div>}
      </header>

      <div className="memory-front">
        <div className="memory-glyph-orbit" aria-hidden="true">
          <i /><i /><b>MEM</b><span>{stageNumber}</span>
        </div>
        <div className="memory-glyph-core">
          <span aria-hidden="true">核心 · RECALL</span>
          <h2
            className="memory-character"
            id={titleId}
            ref={titleRef}
            tabIndex={-1}
          >
            {character}
          </h2>
        </div>
        <p className={revealed ? "decoded" : ""}>
          <span className="memory-symbol" aria-hidden="true">◇</span>
          {revealed ? pinyin : "Bạn còn nhớ từ này không?"}
        </p>
        {!revealed && (
          <button
            className="memory-hint-button"
            type="button"
            onClick={onUseHint}
            disabled={hintUsed}
            aria-pressed={hintUsed}
          >
            <span className="memory-symbol" aria-hidden="true">⌄</span>
            {hintUsed
              ? `Gợi ý: âm đầu “${pinyin.trim().slice(0, 1)}” · ${partOfSpeech}`
              : "Gợi ý"}
          </button>
        )}
      </div>

      {revealed && (
        <div className="memory-back">
          <div className="memory-decoded-meaning">
            <small><span className="memory-symbol" aria-hidden="true">✦</span> Mảnh nghĩa đã giải mã</small>
            <strong>{meaning}</strong>
          </div>
          <div className="memory-example-panel">
            <small>Ngữ cảnh tác chiến</small>
            <strong>{example}</strong>
            <span>{examplePinyin}</span>
            <p>{exampleMeaning}</p>
          </div>
          <div className="memory-tags" aria-label="Nhãn từ vựng">
            {tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>
      )}
    </section>
  );
}
