import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, ChevronRight, Pause, Play } from "lucide-react";
import { Link } from "react-router";

export type PathJourneyStage = { id: string; completed: number; total: number };

const PATH_SEAL_FILES: Record<string, string> = {
  hsk0: "jade-dragon-seal-v1.webp",
  hsk1: "jade-crane-seal-v1.webp",
  hsk2: "jade-tiger-seal-v1.webp",
  hsk3: "jade-phoenix-seal-v1.webp",
  hsk4: "jade-qilin-seal-v1.webp",
};

export function PathJadeSeal({ level, small = false }: { level: string; small?: boolean }) {
  return <span className={`path-jade-seal${small ? " is-small" : ""}`} aria-hidden="true">
    <img src={`/art/thien-lo/${PATH_SEAL_FILES[level] ?? PATH_SEAL_FILES.hsk0}`} width="1280" height="1280" alt="" />
    <span>{level.toUpperCase()}</span>
  </span>;
}

export function PathJourneyBanner({ stages, currentLevel, currentLesson, completed, total }: {
  stages: PathJourneyStage[];
  currentLevel: string;
  currentLesson: { id: string; title: string } | null;
  completed: number;
  total: number;
}) {
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const banner = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (banner.current) observer.observe(banner.current);
    return () => observer.disconnect();
  }, []);
  const currentIndex = Math.max(0, stages.findIndex(stage => stage.id === currentLevel));
  const activeStage = stages[currentIndex];
  return <header ref={banner} className="path-journey-banner" aria-labelledby="path-route-title"
    data-motion={paused || !visible ? "paused" : "running"}>
    <div className="path-journey-scene" aria-hidden="true">
      <img src="/art/thien-lo/celestial-scroll-v2.webp" width="2171" height="724" alt="" />
      <i className="path-journey-mist" /><i className="path-journey-light" />
    </div>
    <div className="path-journey-heading">
      <span className="path-journey-eyebrow">LỘ TRÌNH TU LUYỆN · HSK0—HSK4</span>
      <h1 id="path-route-title">Thiên Lộ</h1>
      <p>Từng bước khai mở, từng chặng vươn xa.</p>
    </div>
    <div className="path-journey-overview" aria-live="polite">
      <div><span>BÀI ĐÃ THÔNG QUA</span><strong>{completed}<small> / {total}</small></strong></div>
      <p>{activeStage?.id.toUpperCase()} <span>· {activeStage?.completed ?? 0}/{activeStage?.total ?? 0} bài trong chặng</span></p>
    </div>
    <nav className="path-journey-map" aria-label="Năm chặng của Thiên Lộ">
      <ol>
        {stages.map((stage, index) => {
          const cleared = stage.total > 0 && stage.completed === stage.total;
          const current = stage.id === currentLevel && !cleared;
          return <li key={stage.id} data-state={cleared ? "cleared" : current ? "current" : "upcoming"}
            style={{ "--stage-progress": `${stage.total ? stage.completed / stage.total * 100 : 0}%`, "--stage-delay": `${index * 100}ms` } as CSSProperties}>
            <a href={`#path-stage-${stage.id}`} aria-current={current ? "step" : undefined}
              aria-label={`${stage.id.toUpperCase()} · ${stage.completed}/${stage.total} bài${cleared ? " · Đã thông qua" : current ? " · Đang học" : " · Xem chặng"}`}>
              <span className="path-journey-node"><PathJadeSeal level={stage.id} small />{cleared && <Check className="path-journey-check" size={16} />}</span>
              <strong>{cleared ? "Đã thông qua" : current ? "Đang tu luyện" : "Chặng kế tiếp"}</strong>
              <small>{stage.completed}/{stage.total} bài</small>
            </a>
          </li>;
        })}
      </ol>
    </nav>
    <div className="path-journey-current">
      <div><span>{currentLesson ? `${currentLevel.toUpperCase()} · BÀI ĐANG HỌC` : "HÀNH TRÌNH ĐÃ HOÀN TẤT"}</span>
        <h2>{currentLesson?.title ?? "Bạn đã đi qua toàn bộ Thiên Lộ"}</h2></div>
      {currentLesson && <Link className="path-journey-continue" to={`/lesson/${currentLesson.id}`}>Học tiếp <ChevronRight size={18} /></Link>}
    </div>
    <button className="path-journey-motion" type="button" onClick={() => setPaused(value => !value)}
      aria-pressed={paused} aria-label={paused ? "Bật chuyển động Thiên Lộ" : "Tạm dừng chuyển động Thiên Lộ"}>
      {paused ? <Play size={15} /> : <Pause size={15} />}<span>{paused ? "Bật chuyển động" : "Dừng chuyển động"}</span>
    </button>
  </header>;
}
