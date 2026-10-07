import { ArrowRight, ChevronDown, Crown, Sparkles } from "lucide-react";
import type { RefObject } from "react";
import { NavLink } from "react-router";
import { useCommerce } from "../commerce/CommerceProvider";
import "./NgocHeader.css";
import { AwakeningSeal } from "./system/AwakeningSeal";
import type { MotionQuality } from "../system/awakeningMotion";
import type { SystemMotionMode } from "../system/systemUiPreferences";

export function NgocHeader({ title, plainTitle, name, statusOpen, statusButtonRef, onSummon, resolvedMotion = "reduced", motionQuality = "light", hydrated = false }: {
  title: string;
  plainTitle: string;
  name: string;
  statusOpen: boolean;
  statusButtonRef: RefObject<HTMLButtonElement | null>;
  onSummon: () => void;
  resolvedMotion?: Exclude<SystemMotionMode, "auto">;
  motionQuality?: MotionQuality;
  hydrated?: boolean;
}) {
  const commerce = useCommerce();
  // Never infer membership from the profile, a cached name, or a failed request.
  const premiumActive = !commerce.loading && !commerce.error
    && commerce.snapshot?.authenticated === true && commerce.snapshot.active;
  const displayName = name.trim() || "Hành giả vô danh";
  const premiumLabel = premiumActive ? "Premium của tôi" : "Khám phá Premium";

  return <header className="command-bar ngoc-header" aria-label="Thanh hệ thống">
    <div className="ngoc-heading" title={`${title} · ${plainTitle}`}>
      <AwakeningSeal resolvedMotion={resolvedMotion} motionQuality={motionQuality} hydrated={hydrated} />
      <div><span className="ngoc-wordmark">HANZI.OS</span><strong>{title}</strong></div>
    </div>
    <div className="ngoc-header-rule" aria-hidden="true"><i /></div>
    <button ref={statusButtonRef} className="ngoc-summon" type="button" onClick={onSummon}
      data-system-silent="true" aria-haspopup="dialog" aria-expanded={statusOpen}
      aria-label="Triệu hồi Bảng Hệ Thống" title="Triệu hồi Bảng Hệ Thống · Alt + S">
      <Sparkles size={18} aria-hidden="true" /><span>Triệu hồi</span>
    </button>
    <NavLink className="ngoc-premium" to="/profile/premium" viewTransition
      aria-label={premiumLabel} title={premiumLabel} data-member={Boolean(premiumActive)}>
      <Crown size={25} strokeWidth={1.5} aria-hidden="true" />
      <span><small>{premiumActive ? "GÓI CỦA BẠN" : "KHÁM PHÁ"}</small><strong>Premium</strong></span>
      <ArrowRight size={17} aria-hidden="true" />
    </NavLink>
    <NavLink className="ngoc-profile" to="/profile" viewTransition aria-label={`Hồ sơ · ${displayName}`} title={displayName}>
      <span className="ngoc-avatar" aria-hidden="true">{Array.from(displayName)[0].toUpperCase()}</span>
      <strong>{displayName}</strong><ChevronDown size={14} aria-hidden="true" />
    </NavLink>
  </header>;
}
