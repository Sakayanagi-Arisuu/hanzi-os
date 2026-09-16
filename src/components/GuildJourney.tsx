import { BookOpenText, Eye, Grid2X2, PenLine, CircleHelp } from "lucide-react";

export const GUILD_STEPS = [
  { label: "Nhìn Xuyên", icon: Eye },
  { label: "Đoán Nét", icon: CircleHelp },
  { label: "Theo Mẫu", icon: Grid2X2 },
  { label: "Tự Viết", icon: PenLine },
  { label: "Văn Cảnh", icon: BookOpenText },
] as const;

export function GuildJourney({ step = 1 }: { step?: number }) {
  return <ol className="guild-journey" aria-label="Hành trình luyện chữ">
    {GUILD_STEPS.map(({ label, icon: Icon }, index) => <li key={label} data-current={step === index + 1} data-complete={step > index + 1} aria-current={step === index + 1 ? "step" : undefined}>
      <span className="guild-step-seal"><Icon size={27} /></span>
      <small>{index + 1}</small><strong>{label}</strong>
      <span>{step > index + 1 ? "Đã đi qua" : step === index + 1 ? "Bước hiện tại" : "Bước tiếp theo"}</span>
    </li>)}
  </ol>;
}
