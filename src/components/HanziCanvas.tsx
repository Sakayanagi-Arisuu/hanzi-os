import HanziWriter from "hanzi-writer";
import { useEffect, useRef, useState } from "react";
import { CircleCheck, PenTool, Play, RotateCcw } from "lucide-react";

type HanziCanvasProps = {
  character: string;
};

export function HanziCanvas({ character }: HanziCanvasProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [mode, setMode] = useState<"observe" | "quiz" | "complete">("observe");
  const [mistakes, setMistakes] = useState(0);

  useEffect(() => {
    if (!targetRef.current) return;
    targetRef.current.replaceChildren();
    setMode("observe");
    setMistakes(0);
    writerRef.current = HanziWriter.create(targetRef.current, character, {
      width: 280,
      height: 280,
      padding: 22,
      strokeColor: "#dcebe7",
      radicalColor: "#f3c969",
      outlineColor: "#28443e",
      drawingColor: "#51f6c1",
      highlightColor: "#55d9ff",
      highlightCompleteColor: "#51f6c1",
      strokeAnimationSpeed: 1.1,
      delayBetweenStrokes: 160,
      showCharacter: true,
      showOutline: true,
    });

    return () => {
      writerRef.current?.cancelQuiz();
      writerRef.current = null;
    };
  }, [character]);

  const animate = () => {
    setMode("observe");
    writerRef.current?.cancelQuiz();
    void writerRef.current?.animateCharacter();
  };

  const startQuiz = () => {
    setMistakes(0);
    setMode("quiz");
    void writerRef.current?.quiz({
      showHintAfterMisses: 2,
      highlightOnComplete: true,
      onMistake: () => setMistakes((current) => current + 1),
      onComplete: () => setMode("complete"),
    });
  };

  return (
    <div className="hanzi-canvas-shell">
      <div className="hanzi-grid" ref={targetRef} aria-label={`Bảng luyện viết chữ ${character}`} />
      <div className="hanzi-canvas-status" aria-live="polite">
        {mode === "observe" && <span><Play size={15} /> Chế độ quan sát</span>}
        {mode === "quiz" && <span><PenTool size={15} /> Đang chấm nét · {mistakes} lỗi</span>}
        {mode === "complete" && <span className="success"><CircleCheck size={15} /> Hoàn thành · {mistakes} lỗi</span>}
      </div>
      <div className="hanzi-actions">
        <button className="secondary-button" type="button" onClick={animate}>
          <Play size={17} /> Xem thứ tự nét
        </button>
        <button className="primary-button" type="button" onClick={startQuiz}>
          <RotateCcw size={17} /> Luyện viết
        </button>
      </div>
    </div>
  );
}
