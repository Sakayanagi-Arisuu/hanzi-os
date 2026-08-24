import {
  AlertCircle,
  Check,
  Eye,
  LoaderCircle,
  Play,
  SkipForward,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { getAdaptiveAssistance } from "../characters/characterForgeSession";
import {
  loadHanziStrokeData,
  type HanziStrokeData,
} from "../characters/hanziStrokeData";

export type TracePoint = { x: number; y: number };

export type StrokeTraceAnalysis = {
  passed: boolean;
  averageDistance: number;
  startDistance: number;
  endDistance: number;
  directionAligned: boolean;
  feedback: string;
};

export type StrokePracticeResult = {
  assistanceLevel: number;
  assistedStrokes: number;
  misses: number;
};

export type StrokeScaffoldVisibility = {
  grid: boolean;
  glyph: boolean;
  strokeShapes: boolean;
  strokeGuide: boolean;
};

export const getStrokeScaffoldVisibility = ({
  variant,
  assistance,
  memoryReferenceVisible,
  memoryStrokeHintVisible,
  playing,
  complete,
}: {
  variant: "guided" | "memory";
  assistance: number;
  memoryReferenceVisible: boolean;
  memoryStrokeHintVisible: boolean;
  playing: boolean;
  complete: boolean;
}): StrokeScaffoldVisibility => {
  if (variant === "memory") return {
    grid: false,
    glyph: memoryReferenceVisible,
    strokeShapes: false,
    strokeGuide: memoryStrokeHintVisible && !complete,
  };
  const referenceVisible = variant === "guided" || playing;
  return {
    grid: referenceVisible && assistance >= 1,
    glyph: referenceVisible && assistance >= 2,
    strokeShapes: referenceVisible,
    strokeGuide: referenceVisible && !complete && !playing && assistance >= 3,
  };
};

export const shouldAdvanceStrokeAttempt = ({
  variant,
  pointCount,
  passed,
}: {
  variant: "guided" | "memory";
  pointCount: number;
  passed: boolean;
}) => pointCount >= 4 && (variant === "guided" || passed);

const medianToScreen = (median: Array<[number, number]>): TracePoint[] =>
  median.map(([x, y]) => ({ x, y: 900 - y }));

const pointToSegmentDistance = (point: TracePoint, start: TracePoint, end: TracePoint) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = (dx * dx) + (dy * dy);
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const position = Math.max(0, Math.min(1, (((point.x - start.x) * dx) + ((point.y - start.y) * dy)) / lengthSquared));
  return Math.hypot(point.x - (start.x + (position * dx)), point.y - (start.y + (position * dy)));
};

export const analyzeTraceAgainstMedian = (
  trace: readonly TracePoint[],
  median: readonly TracePoint[],
): StrokeTraceAnalysis => {
  if (trace.length < 4 || median.length < 2) return {
    passed: false,
    averageDistance: Number.POSITIVE_INFINITY,
    startDistance: Number.POSITIVE_INFINITY,
    endDistance: Number.POSITIVE_INFINITY,
    directionAligned: false,
    feedback: "Nét còn quá ngắn. Hãy đi trọn từ điểm bắt đầu tới điểm kết thúc.",
  };
  const sampleStep = Math.max(1, Math.floor(trace.length / 28));
  const sample = trace.filter((_, index) => index % sampleStep === 0);
  const distances = sample.map((point) => Math.min(...median.slice(0, -1).map((start, index) =>
    pointToSegmentDistance(point, start, median[index + 1]!)
  )));
  const averageDistance = distances.reduce((sum, value) => sum + value, 0) / distances.length;
  const startDistance = Math.hypot(trace[0]!.x - median[0]!.x, trace[0]!.y - median[0]!.y);
  const endDistance = Math.hypot(trace.at(-1)!.x - median.at(-1)!.x, trace.at(-1)!.y - median.at(-1)!.y);
  const traceVector = {
    x: trace.at(-1)!.x - trace[0]!.x,
    y: trace.at(-1)!.y - trace[0]!.y,
  };
  const medianVector = {
    x: median.at(-1)!.x - median[0]!.x,
    y: median.at(-1)!.y - median[0]!.y,
  };
  const directionAligned = (traceVector.x * medianVector.x) + (traceVector.y * medianVector.y) > 0;
  // Bàn này luyện đúng thứ tự và hướng nét, không chấm chữ đẹp. Khoảng cách vị
  // trí vì vậy phải đủ rộng cho chuột, bút cảm ứng và bàn viết nhỏ trên mobile.
  const passed = averageDistance <= 170 && startDistance <= 235 && endDistance <= 300 && directionAligned;
  const feedback = passed
    ? startDistance > 150
      ? "Đúng hướng. Điểm bắt đầu hơi lệch nhưng vẫn đạt."
      : "Đúng nét."
    : !directionAligned
      ? "Bạn đang đi ngược hướng. Hãy bắt đầu từ đầu còn lại."
      : startDistance > 235
        ? "Điểm bắt đầu đang quá xa. Hãy bắt đầu gần chấm vàng."
        : averageDistance > 170
          ? "Thân nét đang lệch. Hãy bám gần đường gợi ý."
          : "Nét chưa tới điểm cuối. Kéo dài thêm rồi nhấc bút.";
  return { passed, averageDistance, startDistance, endDistance, directionAligned, feedback };
};

export const traceMatchesMedian = (
  trace: readonly TracePoint[],
  median: readonly TracePoint[],
) => analyzeTraceAgainstMedian(trace, median).passed;

export function StrokeOrderPractice({
  hanzi,
  variant = "guided",
  initialAssistance,
  onAssistanceChange,
  onComplete,
}: {
  hanzi: string;
  variant?: "guided" | "memory";
  initialAssistance?: number;
  onAssistanceChange?: (level: number) => void;
  onComplete?: (result: StrokePracticeResult) => void;
}) {
  const startingAssistance = variant === "memory" ? 0 : initialAssistance ?? 3;
  const [data, setData] = useState<HanziStrokeData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [trace, setTrace] = useState<TracePoint[]>([]);
  const [completedTraces, setCompletedTraces] = useState<TracePoint[][]>([]);
  const [assistedTraceIndexes, setAssistedTraceIndexes] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [assistedStrokes, setAssistedStrokes] = useState(0);
  const [assistance, setAssistance] = useState(startingAssistance);
  const [feedback, setFeedback] = useState(variant === "memory"
    ? "Viết từng nét đúng thứ tự. Không cần viết đẹp."
    : "Viết từng nét theo mẫu. Không cần viết đẹp.");
  const [feedbackTone, setFeedbackTone] = useState<"neutral" | "error" | "success">("neutral");
  const [demoStep, setDemoStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [memoryReferenceVisible, setMemoryReferenceVisible] = useState(false);
  const [memoryStrokeHintVisible, setMemoryStrokeHintVisible] = useState(false);
  const [totalMisses, setTotalMisses] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const completionSent = useRef(false);

  useEffect(() => {
    let active = true;
    setData(null);
    setLoadError("");
    setStrokeIndex(0);
    setTrace([]);
    setCompletedTraces([]);
    setAssistedTraceIndexes([]);
    setDrawing(false);
    setAssistedStrokes(0);
    setAssistance(startingAssistance);
    setFeedback(variant === "memory"
      ? "Viết từng nét đúng thứ tự. Không cần viết đẹp."
      : "Viết từng nét theo mẫu. Không cần viết đẹp.");
    setFeedbackTone("neutral");
    setDemoStep(-1);
    setPlaying(false);
    setMemoryReferenceVisible(false);
    setMemoryStrokeHintVisible(false);
    setTotalMisses(0);
    completionSent.current = false;
    loadHanziStrokeData(hanzi)
      .then((value) => { if (active) setData(value); })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Không thể tải dữ liệu nét."); });
    return () => { active = false; };
  }, [hanzi, retryToken, startingAssistance, variant]);

  useEffect(() => {
    onAssistanceChange?.(assistance);
  }, [assistance, onAssistanceChange]);

  useEffect(() => {
    if (!playing || !data) return;
    if (demoStep >= data.strokes.length - 1) {
      setPlaying(false);
      return;
    }
    const timeout = window.setTimeout(() => setDemoStep((value) => value + 1), 360);
    return () => window.clearTimeout(timeout);
  }, [data, demoStep, playing]);

  const complete = Boolean(data && strokeIndex >= data.strokes.length);
  useEffect(() => {
    if (!complete || completionSent.current) return;
    completionSent.current = true;
    onComplete?.({ assistanceLevel: assistance, assistedStrokes, misses: totalMisses });
  }, [assistance, assistedStrokes, complete, onComplete, totalMisses]);

  const currentMedian = useMemo(() => data && !complete
    ? medianToScreen(data.medians[strokeIndex]!)
    : [], [complete, data, strokeIndex]);
  const scaffold = getStrokeScaffoldVisibility({
    variant,
    assistance,
    memoryReferenceVisible,
    memoryStrokeHintVisible,
    playing,
    complete,
  });

  const eventPoint = (event: ReactPointerEvent<SVGSVGElement>): TracePoint => {
    const bounds = svgRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 1024,
      y: ((event.clientY - bounds.top) / bounds.height) * 900,
    };
  };

  const begin = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!data || complete || playing) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setTrace([eventPoint(event)]);
    setDrawing(true);
    setFeedbackTone("neutral");
  };
  const move = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drawing) return;
    setTrace((points) => [...points, eventPoint(event)]);
  };
  const end = () => {
    if (!drawing || !data || complete) return;
    setDrawing(false);
    const analysis = analyzeTraceAgainstMedian(trace, currentMedian);
    const shouldAdvance = shouldAdvanceStrokeAttempt({
      variant,
      pointCount: trace.length,
      passed: analysis.passed,
    });
    if (shouldAdvance) {
      const next = strokeIndex + 1;
      setCompletedTraces((traces) => [...traces, [...trace]]);
      setStrokeIndex(next);
      setTrace([]);
      setMemoryStrokeHintVisible(false);
      if (analysis.passed) {
        setAssistance((level) => getAdaptiveAssistance(level, "success"));
      } else {
        setTotalMisses((value) => value + 1);
        setAssistance((level) => getAdaptiveAssistance(level, "miss"));
      }
      setFeedbackTone(analysis.passed ? "success" : "error");
      setFeedback(next === data.strokes.length
        ? variant === "guided" ? "Đã viết đủ các nét. Tiếp theo, bạn sẽ tự viết lại từ trí nhớ." : "Đã viết đủ các nét. Bạn có thể tiếp tục."
        : analysis.passed ? `${analysis.feedback} Tiếp tục nét ${next + 1}.` : `Nét chưa đúng nhưng đã được ghi lại. Tiếp tục nét ${next + 1}.`);
    } else {
      setTotalMisses((value) => value + 1);
      setAssistance((level) => getAdaptiveAssistance(level, "miss"));
      setFeedbackTone("error");
      if (variant === "memory") {
        setMemoryStrokeHintVisible(true);
        if (!assistedTraceIndexes.includes(strokeIndex)) {
          setAssistedTraceIndexes((indexes) => [...indexes, strokeIndex]);
          setAssistedStrokes((value) => value + 1);
        }
      }
      setFeedback(`Chưa đúng. ${analysis.feedback}${variant === "memory" ? " Hãy thử lại theo chấm vàng và nét mờ." : ""}`);
    }
  };

  const playOrder = () => {
    setDemoStep(-1);
    setPlaying(true);
    setTrace([]);
    setAssistance((level) => getAdaptiveAssistance(level, "hint"));
    setFeedbackTone("neutral");
    setFeedback("Đang phát lại thứ tự nét; lượt này được ghi là có trợ giúp.");
  };
  const skipStroke = () => {
    if (!data || complete) return;
    const next = strokeIndex + 1;
    setStrokeIndex(next);
    setTrace([]);
    setCompletedTraces((traces) => [...traces, medianToScreen(data.medians[strokeIndex]!) ]);
    setAssistedTraceIndexes((indexes) => [...indexes, strokeIndex]);
    setAssistedStrokes((value) => value + 1);
    setAssistance((level) => getAdaptiveAssistance(level, "hint"));
    setFeedbackTone("neutral");
    setFeedback(next === data.strokes.length ? "Đã đi hết chữ với một nét được hỗ trợ." : "Nét khó đã được đối chiếu; tiếp tục nét kế tiếp.");
  };
  const toggleMemoryGlyph = useCallback(() => {
    if (memoryReferenceVisible) {
      setMemoryReferenceVisible(false);
      setFeedbackTone("neutral");
      setFeedback("Chữ mờ đã ẩn. Tiếp tục viết từ trí nhớ.");
      return;
    }
    setMemoryReferenceVisible(true);
    setAssistance((level) => getAdaptiveAssistance(level, "hint"));
    setAssistedStrokes((value) => value + 1);
    setFeedbackTone("neutral");
    setFeedback("Đã hiện chữ mờ để gợi hình. Không hiển thị đường hay thứ tự nét.");
  }, [memoryReferenceVisible]);

  const toggleCurrentStrokeHint = useCallback(() => {
    const nextVisible = !memoryStrokeHintVisible;
    setMemoryStrokeHintVisible(nextVisible);
    setFeedbackTone("neutral");
    if (!nextVisible) {
      setFeedback("Đã ẩn gợi ý nét. Tiếp tục viết từ trí nhớ.");
      return;
    }
    if (!assistedTraceIndexes.includes(strokeIndex)) {
      setAssistedTraceIndexes((indexes) => [...indexes, strokeIndex]);
      setAssistedStrokes((value) => value + 1);
      setAssistance((level) => getAdaptiveAssistance(level, "hint"));
    }
    setFeedback("Chấm vàng là điểm bắt đầu. Hãy viết theo nét mờ.");
  }, [assistedTraceIndexes, memoryStrokeHintVisible, strokeIndex]);

  if (loadError) return (
    <div className="stroke-practice-state is-error" role="status">
      <Eye />
      <strong>Chưa dựng được bàn nét</strong>
      <p>{loadError}</p>
      <button type="button" onClick={() => setRetryToken((value) => value + 1)}>Thử tải lại</button>
    </div>
  );
  if (!data) return <div className="stroke-practice-state" role="status"><LoaderCircle className="is-spinning" /><strong>Đang dựng hình học nét cho {hanzi}</strong></div>;

  return (
    <section className="stroke-practice" data-assistance={assistance} data-variant={variant} aria-labelledby="stroke-practice-title">
      <header>
        <div>
          <span>{variant === "memory" ? "TÁI TẠO" : "RÈN NÉT"}</span>
          <h2 id="stroke-practice-title">{variant === "memory" ? "Tự viết từ trí nhớ" : "Đi một lượt theo mẫu"}</h2>
          <p className="stroke-brief">Viết từng nét đúng thứ tự. Không cần viết đẹp.</p>
        </div>
        <strong>{complete ? <><Check /> Hoàn tất</> : `Nét ${strokeIndex + 1}/${data.strokes.length}`}</strong>
      </header>

      <div className="stroke-board-shell">
        <svg
          ref={svgRef}
          className="stroke-board"
          viewBox="0 0 1024 900"
          role="img"
          aria-label={`Bàn luyện thứ tự ${data.strokes.length} nét của chữ ${hanzi}. Có thể dùng lựa chọn viết trên giấy ở cuối màn hình.`}
          onPointerDown={begin}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={() => setDrawing(false)}
        >
          {scaffold.grid && <path className="stroke-grid" d="M512 0V900M0 450H1024M0 0L1024 900M1024 0L0 900" />}
          {scaffold.strokeShapes && <g transform="translate(0 900) scale(1 -1)">
            {data.strokes.map((stroke, index) => (
              <path
                key={`${hanzi}-stroke-${index}`}
                d={stroke}
                className={index < strokeIndex || index <= demoStep ? "stroke-shape is-done" : index === strokeIndex ? "stroke-shape is-current" : "stroke-shape"}
              />
            ))}
          </g>}
          {!complete && !playing && currentMedian.length > 0 && <>
            {scaffold.strokeGuide && <polyline className="stroke-guide" points={currentMedian.map((point) => `${point.x},${point.y}`).join(" ")} />}
            {scaffold.strokeGuide && <circle className="stroke-start" cx={currentMedian[0]!.x} cy={currentMedian[0]!.y} r="18" />}
          </>}
          {complete && data.medians.map((median, index) => (
            <polyline key={`standard-${index}`} className="stroke-comparison-standard" points={medianToScreen(median).map((point) => `${point.x},${point.y}`).join(" ")} />
          ))}
          {(complete || variant === "memory") && completedTraces.map((completedTrace, index) => (
            <polyline key={`attempt-${index}`} className={assistedTraceIndexes.includes(index) ? "stroke-comparison-assisted" : "stroke-comparison-attempt"} points={completedTrace.map((point) => `${point.x},${point.y}`).join(" ")} />
          ))}
          {trace.length > 1 && <polyline className="stroke-user-trace" points={trace.map((point) => `${point.x},${point.y}`).join(" ")} />}
        </svg>
        {scaffold.glyph && <span className="stroke-board-glyph" aria-hidden="true">{hanzi}</span>}
      </div>

      <div className="stroke-practice-copy">
        <p className="stroke-feedback" data-tone={feedbackTone} role={feedbackTone === "error" ? "alert" : "status"} aria-live={feedbackTone === "error" ? "assertive" : "polite"}>
          {feedbackTone === "error" ? <AlertCircle aria-hidden="true" /> : feedbackTone === "success" ? <Check aria-hidden="true" /> : null}
          <span>{feedback}</span>
        </p>
        {!complete && <div className="stroke-actions" aria-label="Trợ giúp luyện nét">
          {variant === "memory" && <button type="button" aria-pressed={memoryReferenceVisible} onClick={toggleMemoryGlyph}><Eye /> {memoryReferenceVisible ? "Ẩn chữ mờ" : "Hiện chữ mờ"}</button>}
          {variant === "memory" && memoryStrokeHintVisible && <button type="button" aria-pressed={memoryStrokeHintVisible} onClick={toggleCurrentStrokeHint}><Eye /> Ẩn gợi ý nét</button>}
          {variant === "guided" && <button type="button" onClick={playOrder} disabled={playing}><Play /> {playing ? "Đang phát…" : "Xem thứ tự nét"}</button>}
          {variant === "guided" && <button type="button" onClick={skipStroke}><SkipForward /> Đi nét này giúp tôi</button>}
        </div>}
      </div>
    </section>
  );
}
