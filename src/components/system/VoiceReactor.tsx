import { AudioLines, RadioTower, X } from "lucide-react";
import { useAudioEngine, type VoicePlaybackPhase } from "../../audio/AudioEngineProvider";

type VoiceReactorProps = {
  sourceId?: string;
  phase?: VoicePlaybackPhase | "armed" | "listening" | "processing" | "result" | "denied" | "unavailable";
  label?: string;
  compact?: boolean;
  dismissible?: boolean;
};

const ACTIVE_PHASES = new Set(["preparing", "playing", "armed", "listening", "processing"]);

export function VoiceReactor({ sourceId, phase, label, compact = false, dismissible = false }: VoiceReactorProps) {
  const { playback, cancelSpeech } = useAudioEngine();
  const observedPhase = phase ?? (sourceId && playback.sourceId !== sourceId ? "idle" : playback.phase);
  const active = ACTIVE_PHASES.has(observedPhase);
  const description = label ?? (observedPhase === "listening"
    ? "Đang thu tín hiệu giọng nói"
    : observedPhase === "processing" ? "Đang phân tích tín hiệu"
      : observedPhase === "playing" || observedPhase === "preparing" ? "Hệ thống đang phát âm"
        : observedPhase === "result" ? "Đã giải mã tín hiệu"
          : observedPhase === "denied" ? "Kênh thu chưa được cấp quyền"
            : observedPhase === "unavailable" ? "Thiết bị không hỗ trợ kênh này"
              : "Kênh âm thanh sẵn sàng");

  return (
    <div className={`voice-reactor ${compact ? "compact" : ""}`} data-phase={observedPhase} data-active={active} role="status" aria-live="polite">
      <div className="voice-reactor-orb" aria-hidden="true">
        <i /><i /><i />
        {observedPhase === "listening" ? <RadioTower size={compact ? 14 : 18} /> : <AudioLines size={compact ? 14 : 18} />}
      </div>
      <div className="voice-reactor-copy">
        <small>VOICE REACTOR · {observedPhase.toUpperCase()}</small>
        <strong>{description}</strong>
        <span aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</span>
      </div>
      {dismissible && active && (
        <button type="button" onClick={cancelSpeech} data-system-silent="true" aria-label="Dừng phát âm"><X size={15} /></button>
      )}
    </div>
  );
}

export function SystemVoiceBeacon() {
  const { playback } = useAudioEngine();
  if (playback.phase === "idle") return null;
  return (
    <div className="system-voice-beacon">
      <VoiceReactor sourceId={playback.sourceId} dismissible />
    </div>
  );
}
