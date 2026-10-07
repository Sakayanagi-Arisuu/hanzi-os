import { JadeSeal } from "./JadeSeal";
import "./JourneyLoading.css";

export function JourneyLoading({ message, fullscreen = false }: { message: string; fullscreen?: boolean }) {
  return <div className={`journey-loading${fullscreen ? " journey-loading--fullscreen" : ""}`} role="status" aria-busy="true" aria-live="polite">
    <div className="journey-loading-content">
      <JadeSeal />
      <span className="journey-loading-brand">HANZI.OS</span>
      <h1>Hành trình đang mở</h1>
      <p>{message}</p>
      <span className="journey-loading-line" aria-hidden="true"><i /></span>
      <small>Ngôn ngữ mở lối · Tri thức dẫn đường</small>
    </div>
  </div>;
}
