export const PAYMENT_PROVIDERS = {
  bank_transfer: "Chuyển khoản ngân hàng · đối soát thủ công",
  vnpay: "VNPay · chưa tích hợp",
  momo: "MoMo · chưa tích hợp",
} as const;
export type MerchantSettings = {
  businessName: string; supportEmail: string; website: string;
  refundPolicyUrl: string; provider: keyof typeof PAYMENT_PROVIDERS;
  bankName: string; bankAccount: string; bankHolder: string;
};
export function parseMerchantSettings(value: Record<string, unknown>): MerchantSettings {
  const text = (key: string, max: number) => {
    const v = value[key];
    if (typeof v !== "string" || v.trim().length > max) throw new Error("Thông tin cấu hình không hợp lệ.");
    return v.trim();
  };
  const settings = {
    businessName: text("businessName", 120), supportEmail: text("supportEmail", 160),
    website: text("website", 300), refundPolicyUrl: text("refundPolicyUrl", 300),
    provider: text("provider", 30) as MerchantSettings["provider"],
    bankName: text("bankName", 100), bankAccount: text("bankAccount", 40), bankHolder: text("bankHolder", 120),
  };
  if (!settings.businessName || !Object.hasOwn(PAYMENT_PROVIDERS, settings.provider)) throw new Error("Chọn tên đơn vị và phương thức thanh toán hợp lệ.");
  if (settings.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.supportEmail)) throw new Error("Email hỗ trợ chưa hợp lệ.");
  for (const field of [settings.website, settings.refundPolicyUrl]) {
    if (!field) continue;
    let url: URL;
    try { url = new URL(field); } catch { throw new Error("Địa chỉ website cần bắt đầu bằng https://."); }
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("Website và chính sách phải dùng HTTPS, không chứa thông tin đăng nhập.");
  }
  if (settings.bankAccount && !/^[0-9A-Za-z -]{3,40}$/.test(settings.bankAccount)) throw new Error("Số tài khoản ngân hàng chưa hợp lệ.");
  return settings;
}
/** Provider credentials and verified callback integration are intentionally not
 * activated by saving an admin form. Hosted manual transfer is separately gated. */
export function merchantReadiness(settings: MerchantSettings, live = false) {
  return [
    { label: "Tên đơn vị bán hàng", ready: Boolean(settings.businessName) },
    { label: "Email hỗ trợ", ready: Boolean(settings.supportEmail) },
    { label: "Website HTTPS", ready: Boolean(settings.website) },
    { label: "Chính sách hoàn tiền", ready: Boolean(settings.refundPolicyUrl) },
    { label: "Thông tin phương thức đã chọn", ready: settings.provider !== "bank_transfer" || Boolean(settings.bankName && settings.bankAccount && settings.bankHolder) },
    { label: "Luồng đối soát cho phương thức đã chọn", ready: settings.provider === "bank_transfer" },
    { label: "Hosting đã bật nhận đơn thanh toán", ready: live },
  ];
}
