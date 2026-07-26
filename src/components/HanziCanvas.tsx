import HanziWriter, { type CharacterJson } from "hanzi-writer";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CircleCheck, PenTool, Play, RotateCcw } from "lucide-react";

type HanziCanvasProps = {
  character: string;
  onQuizComplete?: (result: {
    mistakes: number;
    durationMs: number;
    usedHint: boolean;
  }) => void;
};

const loadSelfHostedCharacter = async (character: string) => {
  const response = await fetch(`/hanzi-data/${encodeURIComponent(character)}.json`, {
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error(`Không có dữ liệu nét cho ${character}`);
  }
  return response.json() as Promise<CharacterJson>;
};

export function HanziCanvas({ character, onQuizComplete }: HanziCanvasProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [mode, setMode] = useState<"loading" | "observe" | "quiz" | "complete">("loading");
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const mistakesRef = useRef(0);
  const usedHintRef = useRef(false);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!targetRef.current) return;
    let active = true;
    targetRef.current.replaceChildren();
    setMode("loading");
    setLoadError(false);
    setMistakes(0);
    mistakesRef.current = 0;
    usedHintRef.current = false;
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
      charDataLoader: loadSelfHostedCharacter,
      onLoadCharDataSuccess: () => {
        if (active) setMode("observe");
      },
      onLoadCharDataError: () => {
        if (!active) return;
        setLoadError(true);
        setMode("observe");
      },
    });

    return () => {
      active = false;
      writerRef.current?.cancelQuiz();
      writerRef.current = null;
    };
  }, [character, loadAttempt]);

  const animate = () => {
    if (loadError || mode === "loading") return;
    setMode("observe");
    writerRef.current?.cancelQuiz();
    void writerRef.current?.animateCharacter();
  };

  const startQuiz = () => {
    if (loadError || mode === "loading") return;
    setMistakes(0);
    mistakesRef.current = 0;
    usedHintRef.current = false;
    startedAtRef.current = Date.now();
    setMode("quiz");
    void writerRef.current?.quiz({
      showHintAfterMisses: 2,
      highlightOnComplete: true,
      onMistake: (strokeData) => {
        mistakesRef.current += 1;
        if (strokeData.mistakesOnStroke >= 2) usedHintRef.current = true;
        setMistakes(mistakesRef.current);
      },
      onComplete: () => {
        setMode("complete");
        onQuizComplete?.({
          mistakes: mistakesRef.current,
          durationMs: Math.max(0, Date.now() - startedAtRef.current),
          usedHint: usedHintRef.current,
        });
      },
    });
  };

  return (
    <div className="hanzi-canvas-shell">
      <div className="hanzi-grid" ref={targetRef} aria-label={`Bảng luyện viết chữ ${character}`} />
      <div className="hanzi-canvas-status" aria-live="polite">
        {mode === "loading" && <span><Play size={15} /> Đang tải dữ liệu nét...</span>}
        {mode === "observe" && !loadError && <span><Play size={15} /> Chế độ quan sát</span>}
        {mode === "quiz" && <span><PenTool size={15} /> Đang chấm nét · {mistakes} lỗi</span>}
        {mode === "complete" && <span className="success"><CircleCheck size={15} /> Hoàn thành · {mistakes} lỗi</span>}
        {loadError && <span className="error"><AlertTriangle size={15} /> Không tải được dữ liệu nét chữ</span>}
      </div>
      <div className="hanzi-actions">
        {loadError ? (
          <button className="secondary-button" type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
            <RotateCcw size={17} /> Tải lại dữ liệu nét
          </button>
        ) : (
          <>
            <button className="secondary-button" disabled={mode === "loading"} type="button" onClick={animate}>
              <Play size={17} /> Xem thứ tự nét
            </button>
            <button className="primary-button" disabled={mode === "loading"} type="button" onClick={startQuiz}>
              <RotateCcw size={17} /> Luyện viết
            </button>
          </>
        )}
      </div>
    </div>
  );
}
