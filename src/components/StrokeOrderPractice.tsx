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
  memoryReference: boolean;
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
    grid: true,
    memoryReference: memoryReferenceVisible,
    strokeShapes: false,
    strokeGuide: memoryStrokeHintVisible && !complete,
  };
  const referenceVisible = variant === "guided" || playing;
  return {
    grid: true,
    memoryReference: false,
    strokeShapes: referenceVisible,
    strokeGuide: referenceVisible && !complete && !playing && assistance >= 3,
  };
};

export const shouldOfferStrokeRescue = (variant: "guided" | "memory", missesOnStroke: number) =>
  variant === "guided" || missesOnStroke >= 2;

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
  const [currentStrokeMisses, setCurrentStrokeMisses] = useState(0);
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
    setCurrentStrokeMisses(0);
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
      setCurrentStrokeMisses(0);
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
      const nextMisses = currentStrokeMisses + 1;
      setCurrentStrokeMisses(nextMisses);
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
      setFeedback(`Sai nét ${strokeIndex + 1}: ${analysis.feedback}${variant === "memory"
        ? nextMisses >= 2
          ? " Thử lại theo nét mờ hoặc chọn “Đi nét này giúp tôi”."
          : " Hãy thử lại theo chấm vàng và nét mờ."
        : ""}`);
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
    setCurrentStrokeMisses(0);
    setMemoryStrokeHintVisible(false);
    setCompletedTraces((traces) => [...traces, medianToScreen(data.medians[strokeIndex]!) ]);
    if (!assistedTraceIndexes.includes(strokeIndex)) {
      setAssistedTraceIndexes((indexes) => [...indexes, strokeIndex]);
      setAssistedStrokes((value) => value + 1);
    }
    setAssistance((level) => getAdaptiveAssistance(level, "hint"));
    setFeedbackTone("neutral");
    setFeedback(next === data.strokes.length ? "Đã đi hết chữ với một nét được hỗ trợ." : "Nét khó đã được đối chiếu; tiếp tục nét kế tiếp.");
  };
  const toggleMemoryReference = useCallback(() => {
    if (memoryReferenceVisible) {
      setMemoryReferenceVisible(false);
      setFeedbackTone("neutral");
      setFeedback("Đã ẩn chữ mẫu. Tiếp tục viết từ trí nhớ.");
      return;
    }
    setMemoryReferenceVisible(true);
    setAssistance((level) => getAdaptiveAssistance(level, "hint"));
    if (!assistedTraceIndexes.includes(strokeIndex)) {
      setAssistedTraceIndexes((indexes) => [...indexes, strokeIndex]);
      setAssistedStrokes((value) => value + 1);
    }
    setFeedbackTone("neutral");
    setFeedback("Đã hiện chữ mẫu vừa khung. Lượt này được ghi là có trợ giúp.");
  }, [assistedTraceIndexes, memoryReferenceVisible, strokeIndex]);

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
        <div className="stroke-practice-heading">
          <span>{variant === "memory" ? "BÀN VIẾT TRÍ NHỚ" : "BÀN DẪN NÉT"}</span>
          <h2 id="stroke-practice-title">{variant === "memory" ? "Tự viết chữ" : "Viết theo mẫu"}</h2>
          <p className="stroke-brief">Đúng thứ tự và hướng nét là đạt — không chấm chữ đẹp.</p>
        </div>
        <strong aria-label={complete ? "Đã hoàn tất chữ" : `Đang viết nét ${strokeIndex + 1} trên ${data.strokes.length}`}>
          {complete ? <><Check /> Hoàn tất</> : <><span>Nét</span> {strokeIndex + 1}/{data.strokes.length}</>}
        </strong>
      </header>

      <div className="stroke-workspace">
        <div className="stroke-board-area">
          <div className="stroke-board-shell" data-tone={feedbackTone}>
            <svg
              ref={svgRef}
              className="stroke-board"
              viewBox="0 0 1024 900"
              role="img"
              aria-label={`Bàn luyện thứ tự ${data.strokes.length} nét của chữ ${hanzi}. Có thể dùng lựa chọn viết trên giấy ở thanh dưới.`}
              onPointerDown={begin}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={() => setDrawing(false)}
            >
              {scaffold.grid && <g className="stroke-grid" aria-hidden="true">
                <rect x="2" y="2" width="1020" height="896" rx="34" />
                <path d="M512 0V900M0 450H1024" />
                <path className="is-diagonal" d="M0 0L1024 900M1024 0L0 900" />
              </g>}
              {scaffold.memoryReference && <g className="stroke-memory-reference" transform="translate(0 900) scale(1 -1)" aria-hidden="true">
                {data.strokes.map((stroke, index) => <path key={`${hanzi}-memory-${index}`} d={stroke} />)}
              </g>}
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
              {trace.length > 1 && <polyline className={`stroke-user-trace is-${feedbackTone}`} points={trace.map((point) => `${point.x},${point.y}`).join(" ")} />}
            </svg>
          </div>
        </div>

        <aside className="stroke-coach" aria-label="Phản hồi và trợ giúp luyện nét">
          <div className="stroke-coach-label"><span aria-hidden="true" />{complete ? "Đã hoàn thành chữ" : `Đang luyện nét ${strokeIndex + 1}`}</div>
          <p className="stroke-feedback" data-tone={feedbackTone} role={feedbackTone === "error" ? "alert" : "status"} aria-live={feedbackTone === "error" ? "assertive" : "polite"}>
            {feedbackTone === "error" ? <AlertCircle aria-hidden="true" /> : feedbackTone === "success" ? <Check aria-hidden="true" /> : null}
            <span>{feedback}</span>
          </p>
          {!complete && <div className="stroke-actions" aria-label="Trợ giúp luyện nét">
            {variant === "memory" && <button type="button" aria-pressed={memoryReferenceVisible} onClick={toggleMemoryReference}><Eye /> {memoryReferenceVisible ? "Ẩn chữ mẫu" : "Hiện chữ mẫu"}</button>}
            {variant === "guided" && <button type="button" onClick={playOrder} disabled={playing}><Play /> {playing ? "Đang phát…" : "Xem thứ tự"}</button>}
            {shouldOfferStrokeRescue(variant, currentStrokeMisses) && <button className="stroke-rescue" type="button" onClick={skipStroke}><SkipForward /> Đi nét này giúp tôi</button>}
          </div>}
        </aside>
      </div>
    </section>
  );
}
