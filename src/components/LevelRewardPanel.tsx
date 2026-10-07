import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Coins, Gift, ShieldCheck, Sparkles } from "lucide-react";
import { useLearning } from "../store/LearningStore";
import { useInteractionXp } from "../store/InteractionXpStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import { interactionLevel, LEVEL_REWARD_COINS, LEVEL_XP, type LevelRewardSnapshot } from "../learning/levelRewards";
import { useCommerce } from "../commerce/CommerceProvider";
import "./LevelRewardPanel.css";

export function LevelRewardPanel() {
  const { sync } = useLearning();
  const xp = useInteractionXp();
  const { snapshot: commerce } = useCommerce();
  const monthlyPrice = commerce?.prices?.find(price => price.planId === "hsk4-month")?.amount;
  const normalized = useNormalizedLearningProjection();
  const owner = sync.session?.authenticated ? sync.session.accountKey : null;
  const scope = `${owner}:${normalized.resetEpoch}`;
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ scope: string; data?: LevelRewardSnapshot; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController();
    fetch("/api/wallet/level-rewards", { cache: "no-store", signal: controller.signal }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Chưa tải được phần thưởng.");
      if (!controller.signal.aborted) setResult({ scope, data: body });
    }).catch(error => { if (!controller.signal.aborted) setResult({ scope, error: error.message }); });
    return () => controller.abort();
  }, [owner, scope, normalized.projection?.cursor, xp.totalXp, revision]);
  const current = result?.scope === scope ? result : null;
  const data = current?.data;
  const level = data?.level ?? (!owner ? interactionLevel(xp.totalXp) : null);
  const progress = data?.progress ?? (!owner ? xp.totalXp % LEVEL_XP / LEVEL_XP * 100 : 0);
  const remaining = data?.xpToNext ?? (!owner ? LEVEL_XP - xp.totalXp % LEVEL_XP : null);
  const claim = async () => {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/wallet/level-rewards", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Chưa nhận được thưởng.");
      setResult({ scope, data: body });
      setMessage("Đã kiểm tra và cập nhật phần thưởng vào Ví Hanzi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa nhận được thưởng. Hãy thử lại."); }
    finally { setBusy(false); }
  };
  return <div className="level-reward-panel dashboard-slide-body">
    <article className="level-reward-hero dashboard-holo-card">
      <div className="level-reward-seal" aria-label={level === null ? "Đang xác minh cấp độ" : `Cấp ${level}`}><Sparkles size={24} /><small>CẤP ĐỘ</small><strong>{level ?? "—"}</strong></div>
      <div className="level-reward-copy">
        <span className="dashboard-card-kicker"><Gift size={16} /> PHẦN THƯỞNG THĂNG CẤP</span>
        <h3>Tu luyện tích xu</h3>
        <p>Mỗi {LEVEL_XP} XP tăng một cấp. Từ cấp 2, mỗi mốc nhận {LEVEL_REWARD_COINS} Hanzi xu để đổi Premium 1 tháng.</p>
        <div className="level-reward-progress" role="progressbar" aria-label="Tiến độ tới cấp tiếp theo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level === null ? undefined : progress}><i style={{ width: `${progress}%` }} /></div>
        <small>{remaining === null ? "Đang xác minh XP tài khoản…" : `Còn ${remaining} XP để lên cấp ${(level ?? 1) + 1}`}</small>
        {!owner ? <Link className="dashboard-window-cta" to="/signin">Đăng nhập để lưu xu <ArrowRight size={16} /></Link>
          : data?.pendingCount ? <button type="button" className="dashboard-window-cta" disabled={busy} onClick={() => void claim()}>{busy ? "Đang nhận…" : `Nhận ${Math.min(data.pendingCount, 50) * data.coinsPerLevel} Hanzi xu`} <Gift size={16} /></button>
          : <Link className="dashboard-window-cta" to="/path">Tiếp tục tu luyện <ArrowRight size={16} /></Link>}
        {current?.error && <p role="alert">{current.error} <button type="button" onClick={() => setRevision(value => value + 1)}>Thử lại</button></p>}
        {message && <p role="status">{message}</p>}
      </div>
    </article>
    <div className="level-reward-cards">
      <article className="dashboard-holo-card"><Coins size={20} /><small>VÍ HANZI</small><strong>{owner ? data ? `${data.balance.toLocaleString("vi-VN")} xu` : "—" : "Cần đăng nhập"}</strong><Link to="/profile/premium">Đổi Premium 1 tháng <ArrowRight size={15} /></Link></article>
      <article className="dashboard-holo-card"><Gift size={20} /><small>THƯỞNG CHỜ NHẬN</small><strong>{owner ? data ? `${data.pendingCoins.toLocaleString("vi-VN")} xu` : "—" : "—"}</strong><span>{data ? `${data.pendingCount} mốc cấp độ` : "Xác minh theo tài khoản"}</span></article>
      <article className="dashboard-holo-card"><ShieldCheck size={20} /><small>PREMIUM 1 THÁNG</small><strong>{monthlyPrice ? `${monthlyPrice.toLocaleString("vi-VN")} xu` : "Chưa có giá đổi"}</strong><span>{monthlyPrice && data ? data.balance >= monthlyPrice ? "Đã đủ xu để đổi gói tháng." : `Cần thêm ${(monthlyPrice - data.balance).toLocaleString("vi-VN")} xu.` : "Giá đổi theo cấu hình gói học."} Mỗi mốc cấp chỉ nhận thưởng một lần.</span></article>
    </div>
  </div>;
}
