/** Commercial access is independent of prerequisites, XP and learning evidence. */
export const PREMIUM_PLANS = [
  { id: "hsk4-month", label: "Premium HSK4 · 1 tháng", months: 1 },
  { id: "hsk4-year", label: "Premium HSK4 · 1 năm", months: 12 },
] as const;
export type PremiumPlanId = typeof PREMIUM_PLANS[number]["id"];
export const premiumPlan = (id: unknown) => PREMIUM_PLANS.find(plan => plan.id === id);
export function requiresPremium(level: unknown): boolean {
  return typeof level === "string" && /^hsk\s*4$/iu.test(level.trim());
}
export function addCalendarMonths(timestamp: number, months: number): number {
  const date = new Date(timestamp);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.getTime();
}
export type CommerceOrder = {
  id: string; userId: string; planId: PremiumPlanId; idempotencyKey: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  createdAt: number; paidAt: number | null; updatedAt: number;
  refundRequestedAt: number | null; refundReason: string | null;
  refundedBy: string | null;
  refundRejectedAt?: number | null; refundRejectedBy?: string | null; refundRejectionReason?: string | null;
  paymentMethod?: "hanzi" | "sandbox";
  hanziAmount?: number;
};
/** Replay only successful non-refunded purchases, in a stable order. */
export function premiumAccess(orders: readonly CommerceOrder[], now = Date.now()) {
  let expiresAt = 0;
  for (const order of [...orders].sort((a, b) => (a.paidAt ?? 0) - (b.paidAt ?? 0) || a.id.localeCompare(b.id))) {
    const plan = premiumPlan(order.planId);
    if (order.status !== "paid" || !plan || order.paidAt === null || order.paidAt > now) continue;
    expiresAt = addCalendarMonths(Math.max(expiresAt, order.paidAt), plan.months);
  }
  return { active: expiresAt > now, expiresAt: expiresAt || null };
}
export type CommerceSnapshot = {
  authenticated: boolean; sandbox: boolean; active: boolean; expiresAt: number | null;
  orders: CommerceOrder[]; serverNow: number;
  prices?: { planId: PremiumPlanId; amount: number }[];
  vndPrices?: { planId: PremiumPlanId; amount: number }[];
  freeHsk4LessonIds?: string[];
};
/** Use elapsed client time, not the client's wall-clock epoch, for an issued entitlement. */
export function remainingPremiumMs(snapshot: CommerceSnapshot, receivedAt: number, now = performance.now()) {
  if (!snapshot.active || snapshot.expiresAt === null) return 0;
  return Math.max(0, snapshot.expiresAt - snapshot.serverNow - Math.max(0, now - receivedAt));
}
export function effectiveCommerceSnapshot(snapshot: CommerceSnapshot, receivedAt: number, now = performance.now()): CommerceSnapshot {
  return snapshot.active && remainingPremiumMs(snapshot, receivedAt, now) === 0
    ? { ...snapshot, active: false }
    : snapshot;
}
export const ORDER_STATUS_LABELS: Record<CommerceOrder["status"], string> = {
  pending: "Chờ xác nhận", paid: "Đã kích hoạt", failed: "Không thành công",
  cancelled: "Đã hủy", refunded: "Đã hoàn giao dịch thử nghiệm",
};
