/** Public readiness flags only. Client IDs may be public; no secrets are exposed. */
export type AuthCapabilities = {
  google: boolean; github: boolean; hanzi: boolean; facebook: boolean;
  emailOtp: boolean; passkey: boolean;
  hanziPasswordReset?: boolean;
  googleNative?: { enabled: boolean; serverClientId: string | null };
};
